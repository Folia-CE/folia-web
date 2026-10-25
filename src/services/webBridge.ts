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

/** 这个网页是不是被 `server/static-server.mjs` 发出来的。 */
let bridgeAvailable: boolean | null = null;

/**
 * 探测结果的同步镜像。
 *
 * provider 的 `getAvailability` 是同步的、渲染期就会被读到，不能在里面 await。
 * 所以探测在模块加载时先发起一次，结果写回这里；在那之前按 `false` 算 —— 与
 * 「静态托管在别处」的旧行为一致，不会把没配后端的页面误判成可用。
 */
let bridgeAvailableSync = false;

const probeBridge = async (): Promise<boolean> => {
    if (typeof fetch !== 'function') return false;
    try {
        const response = await fetch(BRIDGE_ROUTE, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });
        return response.ok;
    } catch {
        return false;
    }
};

if (typeof window !== 'undefined') {
    // 不 await：失败也只是保持 false。真正的请求路径会再 await 一次 `isWebBridgeAvailable`，
    // 所以这里只是让「界面上的可用性」尽早拿到答案。
    void probeBridge().then((ready) => {
        if (bridgeAvailable === null) bridgeAvailable = ready;
        bridgeAvailableSync = ready;
    });
}

/**
 * 探测桥在不在。
 *
 * 静态托管在别处（例如纯 CDN、没有那个 Node 服务）时这里会失败，调用方据此退回
 * 「需要自己配 API 地址」的老路，而不是让每一次请求都卡到超时。
 */
export const isWebBridgeAvailable = async (): Promise<boolean> => {
    if (bridgeAvailable !== null) return bridgeAvailable;
    bridgeAvailable = await probeBridge();
    bridgeAvailableSync = bridgeAvailable;
    return bridgeAvailable;
};

/**
 * 同步版的探测结果：只给渲染期就要答案的地方（provider 的 `getAvailability`）。
 *
 * 模块加载时那次探测还没回来的时候是 `false`，界面第一条快照因此可能短暂地显示
 * 「未配置」；探测回来之后 store 的常规刷新就会翻过来。
 */
export const isWebBridgeAvailableSync = (): boolean => bridgeAvailableSync;

type BridgePayload = {
    provider: 'netease' | 'qq' | 'kugou' | 'bodian' | 'qq_raw';
    operation: string;
    method?: string;
    path?: string;
    query?: Record<string, string | number | boolean | undefined>;
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
};

/**
 * 发一次桥请求。
 *
 * 答复就是接口代码自己的返回值（上游 JSON），错误以 `__foliaBridgeError` 的形式回来 ——
 * 和 Android 桥、桌面桥的形状一致，好让上层的 transport 只有一套分支。
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
