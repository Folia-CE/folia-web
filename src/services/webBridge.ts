// src/services/webBridge.ts
//
// 纯静态网页版的「本地登录」客户端。
//
// 背景：网易云 / QQ 音乐 / 酷狗的接口都不发 `Access-Control-Allow-Origin`，浏览器里
// 直接 fetch 一定被 CORS 拦掉。桌面版靠主进程内的本地服务解决，Android 版靠原生 OkHttp
// 解决 —— 网页版两条路都没有。
//
// 这里的做法：接口代码（`src/webBridge/api/*.js`）本来就随前端打包，直接在浏览器里跑；
// 它需要的「发请求 / 收 Cookie / 读 Set-Cookie」交给**同源的轻量服务端**（`server/static-server.mjs`）
// 转发。页面与那个服务同一个 origin，于是这些请求根本不触发 CORS。
//
// 这样一来：登录与取数据都在你自己的机器上完成，不经过任何第三方中转，也不需要自建
// 一套音乐后端。
//
// 与桌面/Android 的差别只在传输层 —— 请求的路径与答复的形状和 `electron/` 那套完全一致。

const BRIDGE_ROUTE = '/api/__folia_bridge';

/**
 * 篡改猴中继（public/folia-bridge-relay.user.js）的通道。
 *
 * 服务器桥要走部署方自己的 Node 进程；中继不一样：用户装了脚本之后，请求从**用户自己的
 * 浏览器**经 GM_xmlhttpRequest 直连上游 —— 跨域与带 Cookie 都不受同源策略限制（这正是
 * 普通网页做不到、而脚本做得到的），更快，服务器零负担。
 *
 * 协议见脚本头注释：页面 postMessage 发 `{ type, id, payload }`，脚本回
 * `{ type: '__folia_bridge_relay_result', id, answer }`；脚本就绪时先广播一条
 * `__folia_bridge_relay_ready`。页面还主动 ping 一次，处理「脚本比页面晚装好」的情况。
 */
const RELAY_PAGE_ORIGIN = 'https://folia.tangbot.xyz';
const RELAY_MESSAGE_TYPE = '__folia_bridge_relay';
const RELAY_RESULT_TYPE = '__folia_bridge_relay_result';
const RELAY_READY_TYPE = '__folia_bridge_relay_ready';
/** 页面构建时注入的桥代码目标版本（内容哈希）。握手里带给脚本，脚本据此重拉 bundle。 */
const RELAY_TIMEOUT_MS = 5000;
/** 脚本首次装载桥代码 bundle（约 600KB 拉取 + eval）可能要好几秒：握手等这么久。 */
const RELAY_BOOT_TIMEOUT_MS = 15000;

/**
 * 这个网页是不是被 `server/static-server.mjs` 发出来的。
 */
let bridgeAvailable: boolean | null = null;

/**
 * 桌面版里没有这个桥，也不该有。
 *
 * 桌面版的请求走主进程内的本地服务（`window.electron.getNeteasePort` 那一套），
 * 或者走用户配的 `VITE_*_API_BASE`。没有这道判断的话，桌面版里只要有东西让探测
 * 成功（打包时挂过去的静态服务、甚至一条被 mock 掉的 fetch），桥就会把桌面那条
 * 更合适的路顶掉 —— 那是不该发生的事。
 */
const isDesktopShell = (): boolean => (
    typeof window !== 'undefined' && Boolean((window as any).electron)
);

// 中继与下面的 isRelayUsable / startRelayListener 用到 isDesktopShell，它必须先声明
// —— TypeScript 的 const 提升不到声明前，监听器在模块加载时挂上时会碰到它。

/**
 * 探测结果的同步镜像。
 *
 * provider 的 `getAvailability` 是同步的、渲染期就会被读到，不能在里面 await。
 * 所以探测在模块加载时先发起一次，结果写回这里；在那之前按 `false` 算 —— 与
 * 「静态托管在别处」的旧行为一致，不会把没配后端的页面误判成可用。
 */
let bridgeAvailableSync = false;

const probeBridge = async (): Promise<boolean> => {
    // 桌面版一律不走这个桥（见 isDesktopShell）。
    if (isDesktopShell()) return false;
    // 已经配了后端地址就不探：那种部署本来就有自己的一套接口，桥只是没人用的备胎，
    // 探它等于白白多发一条请求（在装了后端、又不想走桥的部署上尤其没有意义）。
    if (hasAnyConfiguredApiBase()) return false;
    if (typeof fetch !== 'function') return false;
    try {
        const response = await fetch(BRIDGE_ROUTE, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });
        // 一个答复都没有（或者不是 Response）：没有桥。
        return Boolean(response?.ok);
    } catch {
        return false;
    }
};

/**
 * 这个部署有没有自己配好后端地址（`VITE_*_API_BASE`）。
 *
 * 配了就不该走本地登录那条路 —— 用户明确指定了后端，桥只是没后端时的替代品。
 * 这里只读环境变量，不发请求；两个来源都看（构建期是 `import.meta.env`，
 * 测试与 Node 里是 `process.env`），与各家 transport 读地址的方式保持一致。
 */
const hasAnyConfiguredApiBase = (): boolean => {
    const viteEnv = typeof import.meta !== 'undefined'
        ? (import.meta as { env?: Record<string, string | undefined> }).env
        : undefined;
    const nodeEnv = typeof process !== 'undefined'
        ? (process as { env?: Record<string, string | undefined> }).env
        : undefined;
    const read = (name: string): boolean => Boolean(viteEnv?.[name] || nodeEnv?.[name]);
    return read('VITE_NETEASE_API_BASE') || read('VITE_QQ_API_BASE') || read('VITE_KUGOU_API_BASE');
};

/**
 * 探测只发生一次，而且要等到真的有人问才发起。
 *
 * 早先这里是模块加载时就发一次 —— 那样每个 import 到这个模块的页面/测试都会多一条
 * 网络请求，而其中绝大多数根本不碰在线音乐。现在改成「第一次用的时候探」：
 * `isWebBridgeAvailable()` 会 await 它，`isWebBridgeAvailableSync()` 在探测回来之前
 * 照旧答 `false`（与「静态托管在别处」的旧行为一致）。
 */
let probePromise: Promise<boolean> | null = null;

const ensureProbe = (): Promise<boolean> => {
    if (!probePromise) {
        probePromise = probeBridge().then((ready) => {
            if (bridgeAvailable === null) bridgeAvailable = ready;
            bridgeAvailableSync = ready;
            return ready;
        });
    }
    return probePromise;
};

/**
 * 探测桥在不在。
 *
 * 静态托管在别处（例如纯 CDN、没有那个 Node 服务）时这里会失败，调用方据此退回
 * 「需要自己配 API 地址」的老路，而不是让每一次请求都卡到超时。
 */
export const isWebBridgeAvailable = async (): Promise<boolean> => {
    if (isDesktopShell()) return false;
    if (bridgeAvailable !== null) return bridgeAvailable;
    return await ensureProbe();
};

/**
 * 同步版的探测结果：只给渲染期就要答案的地方（provider 的 `getAvailability`）。
 *
 * 模块加载时那次探测还没回来的时候是 `false`，界面第一条快照因此可能短暂地显示
 * 「未配置」；探测回来之后 store 的常规刷新就会翻过来。
 */
export const isWebBridgeAvailableSync = (): boolean => {
    if (isDesktopShell()) return false;
    return bridgeAvailableSync;
};

type BridgePayload = {
    provider: 'netease' | 'qq' | 'kugou' | 'bodian' | 'qq_raw';
    operation: string;
    method?: string;
    path?: string;
    query?: Record<string, string | number | boolean | undefined>;
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
    /**
     * 这次请求要用的会话（Cookie 头字符串）。
     *
     * 桥那边的会话只活在它自己的进程内存里（`server/static-server.mjs` 的 cookie 罐与
     * `chrome.storage.local` 垫片），进程一重启就没了。会话的正本因此放在页面里：谁要桥
     * 认得自己是登录的，就在每次请求上带一份（各家 transport 里读 localStorage 的那几行）。
     * 桥只把这一份用在这一条请求上，不跨请求保留；答复里交回来的那份在 `__foliaBridgeSession`。
     */
    sessionCookies?: string;
};

/** 答复里会话的字段，与 `src/webBridge/api/folia.js` 的 `__foliaBridgeSession` 一致。 */
export type BridgeSessionPayload = { provider?: string; cookies?: string };

/* ------------------------------------------------------------------ */
/* 中继通道（篡改猴脚本）                                              */
/* ------------------------------------------------------------------ */

/** 中继握手成功与否。监听模块加载就开始，探测桥用的「第一次用才发」省不得：装没装脚本不碰网络。 */
let relayReady = false;
/** 中继握手**曾经**成功过：装了脚本的页面，服务器桥路径就永久关闭（见 requestWebBridge）。 */
let relayEverReady = false;
/** 握手时脚本报来的桥代码版本（诊断用）。 */
let bridgeVersionSeen = '';
let relayListenerStarted = false;
let relayReadyWaiters: Array<() => void> = [];

/** 等待中的中继请求：id → 到点回落服务器桥的定时器与 resolve。 */
const relayPending = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (value: unknown) => void }>();

const isPageOrigin = (): boolean => (
    typeof window !== 'undefined' && window.location
        ? window.location.origin === RELAY_PAGE_ORIGIN
        : false
);

/** 中继只在这一个部署上工作（脚本 @match 与这里保持同一域名）。 */
const isRelayUsable = (): boolean => (
    !isDesktopShell() && typeof window !== 'undefined' && typeof window.postMessage === 'function' && isPageOrigin()
);

/** 等到握手成功（已在等的人被一起放行），最多 `timeoutMs`。 */
const waitForRelayReady = (timeoutMs: number): Promise<boolean> => {
    if (relayReady) return Promise.resolve(true);
    if (!isRelayUsable()) return Promise.resolve(false);
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            relayReadyWaiters = relayReadyWaiters.filter((waiter) => waiter !== onReady);
            resolve(false);
        }, timeoutMs);
        const onReady = () => {
            clearTimeout(timer);
            resolve(true);
        };
        relayReadyWaiters.push(onReady);
        // 主动 ping：脚本可能晚于页面加载（@run-at document-start 一般早，但不赌这个）。
        // ping 里带上页面的目标版本：脚本版本落后来就重拉 bundle 再应答。
        try {
            window.postMessage({ type: '__folia_bridge_relay_ping', version: (typeof __BRIDGE_VM_VERSION__ === 'string' ? __BRIDGE_VM_VERSION__ : '') }, RELAY_PAGE_ORIGIN);
        } catch (_) {
            clearTimeout(timer);
            relayReadyWaiters = relayReadyWaiters.filter((waiter) => waiter !== onReady);
            resolve(false);
        }
    });
};

const startRelayListener = (): void => {
    if (relayListenerStarted || typeof window === 'undefined') return;
    relayListenerStarted = true;
    window.addEventListener('message', (event: MessageEvent) => {
        if (event.origin !== RELAY_PAGE_ORIGIN) return;
        const data = event.data as { type?: string; id?: string; answer?: unknown; ok?: boolean; data?: unknown } | null;
        if (!data) return;
        if (data.type === RELAY_READY_TYPE || data.type === '__folia_bridge_relay_pong') {
            relayReady = true;
            relayEverReady = true;
            const version = (data as { version?: unknown }).version;
            if (typeof version === 'string' && version) bridgeVersionSeen = version;
            const waiters = relayReadyWaiters;
            relayReadyWaiters = [];
            waiters.forEach((waiter) => waiter());
            return;
        }
        if (data.type !== RELAY_RESULT_TYPE || typeof data.id !== 'string') return;
        const pending = relayPending.get(data.id);
        if (!pending) return;
        relayPending.delete(data.id);
        clearTimeout(pending.timer);
        // v2 协议：{ ok, data?, error? }（脚本 v2，对齐 sonnet 的 foliaExtensionBridge）。
        // ok=false 的桥内部失败回落服务器桥重发；ok=true 的 data 才是接口答复。
        if (data.ok === false) {
            pending.resolve(undefined);
            return;
        }
        pending.resolve(data.data);
    });
};

// 监听器在模块加载时挂上：早一步听到 ready，晚一步 ping 也还来得及。
// 挂载须防错：测试与某些内嵌环境给的是不完整的 window 桩（没有 addEventListener），
// 挂不上就不挂——那条环境本来就进不了中继通道，后续 isRelayReady 的探测都会自然失败。
try {
    startRelayListener();
} catch (_) {}

let relayRequestSeq = 0;

/**
 * 一次中继请求。握手（含 5 秒等待）不成功、或 5 秒没等到答复，都答 `undefined`，
 * 由 `requestWebBridge` 回落到服务器桥 —— 不抛错，调用方不该察觉这条通道的存在。
 */
const requestViaRelay = async (payload: BridgePayload): Promise<unknown> => {
    if (!isRelayUsable()) return undefined;
    // 首次握手给脚本足够时间拉 bundle（600KB + eval 可能要几秒）；之后 relayReady 已是
    // true，这里立即通过，等待的是单条请求的答复（RELAY_TIMEOUT_MS）。
    const ready = await waitForRelayReady(RELAY_BOOT_TIMEOUT_MS);
    if (!ready) return undefined;
    const id = `relay-${Date.now()}-${relayRequestSeq += 1}`;
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            relayPending.delete(id);
            resolve(undefined);
        }, RELAY_TIMEOUT_MS);
        relayPending.set(id, { timer, resolve });
        try {
            window.postMessage({ type: RELAY_MESSAGE_TYPE, id, payload }, RELAY_PAGE_ORIGIN);
        } catch (_) {
            relayPending.delete(id);
            clearTimeout(timer);
            resolve(undefined);
        }
    });
};

/** 从一次桥答复里取出会话（没有就返回空串）。凭据的值不进日志。 */
export const readBridgeSession = (answer: unknown): string => {
    const session = (answer as { __foliaBridgeSession?: BridgeSessionPayload } | null | undefined)?.__foliaBridgeSession;
    return typeof session?.cookies === 'string' ? session.cookies.trim() : '';
};

/**
 * 发一次桥请求。
 *
 * 通道优先级：篡改猴中继（用户自己装的脚本，浏览器直连上游）→ 服务器桥
 * （`/api/__folia_bridge`，同源 Node 服务）。中继没握手成功、或请求失败/超时，
 * 都自动回落服务器桥，调用方不抛错 —— 桌面桥不在这里：它由各 transport 在进
 * 这个函数之前就用自己的接口走掉了，与原有逻辑一致。
 *
 * 答复就是接口代码自己的返回值（上游 JSON），错误以 `__foliaBridgeError` 的形式回来 ——
 * 和 Android 桥、桌面桥的形状一致，好让上层的 transport 只有一套分支。
 *
 * 会话（cookie）跟着请求走：调用方把页面存着的那份放进 `sessionCookies`，答复里交回来的那份
 * 在 `__foliaBridgeSession`（用 `readBridgeSession` 取）。两条通道的答复形状一致 —— 中继只是
 * 转发，桥答什么它转什么 —— 所以这里的会话回写对两条通道是同一套。这里不碰 localStorage ——
 * 每个平台的会话存哪个键、什么时候覆盖，是那家自己的规则。
 */
export const requestWebBridge = async <T = unknown>(payload: BridgePayload): Promise<T> => {
    const relayAnswer = await requestViaRelay(payload);
    // 中继答了「协议级失败」（不认识这个 provider、网络不通）就不把坏答案交给上层：
    // 见下方回落分支。真正的上游业务错误（码、消息）原样上交 —— 上层 transport 只看一套分支。
    const relayProtocolError = relayAnswer !== null
        && typeof relayAnswer === 'object'
        && '__foliaBridgeError' in (relayAnswer as Record<string, unknown>);
    if (relayAnswer !== undefined && !relayProtocolError) return relayAnswer as T;

    // 装了脚本（中继握手成功过）就**绝不下到服务器桥**：用户装脚本就是为了让请求全部
    // 从自己浏览器直连上游 —— 中继失败时替他偷偷发给服务器，等于背着他把请求（带着
    // 他的会话 Cookie）发到了部署方的机器上，而且是「明明装了脚本还有服务器请求」的
    // 直接来源。失败就让这一次请求失败，界面上能看到，下次重试还在中继上。
    if (relayEverReady) {
        throw new Error(`Folia relay unavailable (bridge code ${bridgeVersionSeen || 'unknown'})`);
    }

    const response = await fetch(BRIDGE_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        // 同源，但仍然带上凭据：桥把上游的 cookie 改写落到了本服务自己的域上，
        // 下一次请求需要浏览器把它们带回来，登录态才能延续。
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Folia bridge failed (${response.status})${text ? `: ${text.slice(0, 200)}` : ''}`);
    }

    return await response.json() as T;
};

/** 一次登录用完就丢的会话标记，用来在诊断里区分「走的本地登录」还是「走的后端」。 */
export const WEB_BRIDGE_LABEL = '本机（CORS 服务，无自建后端）';

/** 测试与诊断用：中继握手现在成功了吗。 */
export const isRelayReady = (): boolean => relayReady;

/**
 * 主动问一次脚本在不：发 ping，等 pong/ready 到来（或超时）。
 *
 * 页面启动早于脚本应答时会错过 ready 消息（脚本 @run-at document-start，但注入的
 * 时机仍可能晚于页面首个模块加载完），而同步的 `isRelayReady` 只读标志，永远 false。
 * 安装引导这类「判定装没装」的场景必须主动 ping 一次再下结论。
 */
export const probeRelayReady = (timeoutMs = 1500): Promise<boolean> => waitForRelayReady(timeoutMs);
