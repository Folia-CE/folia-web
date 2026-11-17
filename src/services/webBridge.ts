// src/services/webBridge.ts
//
// 纯静态网页版的「本地登录」客户端。
//
// 背景：网易云 / QQ 音乐 / 酷狗的接口都不发 `Access-Control-Allow-Origin`，浏览器里
// 直接 fetch 一定被 CORS 拦掉。桌面版靠主进程内的本地服务解决，Android 版靠原生 OkHttp
// 解决 —— 网页版两条路都没有。
//
// 这里的做法：接口代码（`src/webBridge/api/*.js`）本来就随前端打包，直接在浏览器里跑；
// 它需要的「发请求 / 收 Cookie / 读 Set-Cookie」交给**轻量桥服务**（`server/static-server.mjs`）
// 转发。桥与页面同源部署时请求不触发 CORS；分离部署（GitHub Pages + 自托管桥）时页面跨域
// 发请求，桥开 CORS（见 BRIDGE_API_BASE）。
//
// 这样一来：登录与取数据都在桥服务所在的机器上完成，不经过任何第三方中转，也不需要自建
// 一套音乐后端。
//
// 与桌面/Android 的差别只在传输层 —— 请求的路径与答复的形状和 `electron/` 那套完全一致。

/**
 * 桥服务的地址：同源部署（页面与桥服务同一台机器）就是默认的相对路径；
 * 静态站与桥分离的部署（GitHub Pages + 自托管桥）在构建期注入
 * `VITE_BRIDGE_API_BASE`（如 `https://bridge.folia-ce.cn`），页面跨域发请求，
 * 桥那边要开对应的 CORS（含 credentials）。
 */
const BRIDGE_API_BASE = (typeof import.meta !== 'undefined'
    ? (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_BRIDGE_API_BASE
    : '') || '';
const BRIDGE_ROUTE = `${BRIDGE_API_BASE}/api/__folia_bridge`;

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
    typeof window !== 'undefined' && Boolean(window.electron)
);

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
        // fetch 正常返回就是 Response：非 2xx 会在 ok 上体现；网络异常走下面的 catch。
        return response.ok;
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

/**
 * 桥答复的失败面：正常答复就是上游 JSON（形状各家不同），失败时是这几个固定字段。
 * transport 拿到 unknown 后先用它收窄，再继续读业务字段 —— 避免为省事写 `any`。
 */
export type BridgeFailure = {
    __foliaBridgeError?: 'AUTH_REQUIRED' | 'UNSUPPORTED' | 'NETWORK' | (string & {});
    message?: string;
};

/** 从一次桥答复里取出会话（没有就返回空串）。凭据的值不进日志。 */
export const readBridgeSession = (answer: unknown): string => {
    const session = (answer as { __foliaBridgeSession?: BridgeSessionPayload } | null | undefined)?.__foliaBridgeSession;
    return typeof session?.cookies === 'string' ? session.cookies.trim() : '';
};

/**
 * 发一次桥请求（服务器桥：`/api/__folia_bridge`，同源 Node 服务）。
 *
 * 答复就是接口代码自己的返回值（上游 JSON），错误以 `__foliaBridgeError` 的形式回来 ——
 * 和 Android 桥、桌面桥的形状一致，好让上层的 transport 只有一套分支。
 *
 * 会话（cookie）跟着请求走：调用方把页面存着的那份放进 `sessionCookies`，答复里交回来的那份
 * 在 `__foliaBridgeSession`（用 `readBridgeSession` 取）。这里不碰 localStorage ——
 * 每个平台的会话存哪个键、什么时候覆盖，是那家自己的规则。
 */
export const requestWebBridge = async <T = unknown>(payload: BridgePayload): Promise<T> => {
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
