// src/utils/audioGraphEligibility.ts
// 判断一个音频地址能不能安全接进 Web Audio 图（均衡器 / 淡入淡出 / 频谱分析）。

/**
 * 为什么需要这个判断：
 *
 * `<audio>` 一旦被 `createMediaElementSource` 接进 AudioContext，它就**必须**是 CORS 干净的
 * ——跨源且没有 `Access-Control-Allow-Origin` 的元素会把**静音**送进音频图，而不是原声。
 * 反过来说，这种地址连 `crossOrigin="anonymous"` 都不能带：带了浏览器会直接按 CORS 失败
 * 拒绝加载（`net::ERR_FAILED`），结果是连放都放不出来。
 *
 * 各家音乐 CDN 大多不发 ACAO（`ga-sycdn.kuwo.cn` 就是一个），所以网页版只有两种处理：
 *   · 同源 / blob / data：接进音频图，特效齐全；
 *   · 其余跨源地址：**不接**，让元素原生直出 —— 能听，但没有均衡器、淡入淡出，频谱读到空值。
 *
 * 桌面端不受这个限制：主进程 `mediaCors.cjs` 会给 CDN 的响应补上 CORS 头。
 */

/** 这些协议的地址不会跨源，读音频数据也不会污染画布 / 音频图。 */
const LOCAL_SCHEMES = ['blob:', 'data:', 'file:'];

const isLocalScheme = (src: string): boolean => LOCAL_SCHEMES.some((scheme) => src.startsWith(scheme));

/**
 * 这个地址与页面同源吗（本地协议一律算同源）。
 *
 * `origin` 传 `window.location.origin`；取不到时调用方传空串，此时一律按跨源处理 ——
 * 宁可降级成原生播放，也不要把一个可能污染的地址接进音频图。
 */
export const isSameOriginAudioSource = (src: string, origin: string): boolean => {
    const value = (src ?? '').trim();
    if (!value) return false;
    if (isLocalScheme(value)) return true;
    if (!origin) return false;
    try {
        return new URL(value, origin).origin === origin;
    } catch {
        return false;
    }
};

/** 这个地址能不能接进音频图。不能接的时候，调用方要让元素原生播放。 */
export const canRouteAudioThroughGraph = (src: string, origin: string): boolean => (
    isSameOriginAudioSource(src, origin)
);

/**
 * 这个地址该不该带 `crossOrigin="anonymous"`。
 *
 * 只有要接进音频图的那些地址才带：跨源地址带了它就会被 CORS 拒绝加载。
 */
export const audioCrossOrigin = (src: string, origin: string): 'anonymous' | undefined => (
    canRouteAudioThroughGraph(src, origin) ? 'anonymous' : undefined
);
