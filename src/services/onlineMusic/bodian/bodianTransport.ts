import { OnlineProviderError } from '../../../types/onlineMusic';
import type { BodianOperation, BodianParams, BodianResult } from 'bodian-music-api';
import { isWebBridgeAvailable, isWebBridgeAvailableSync, requestWebBridge } from '../../webBridge';

// src/services/onlineMusic/bodian/bodianTransport.ts

export type { BodianOperation, BodianParams } from 'bodian-music-api';
export type BodianBridgeResult = BodianResult;

// What a request fails with where neither bridge is there (a plain static page), and where the bridge
// that carries it failed (the main process threw, or the page's own server did not answer).
// bodianFailure.ts tells both apart by them.
export const BODIAN_NEEDS_DESKTOP = 'Bodian requires the desktop app';
export const BODIAN_BRIDGE_FAILED = 'Bodian desktop request failed';

/**
 * 这台机器能不能请求波点。
 *
 * 桌面版问主进程那座 IPC 桥；网页版问 `server/static-server.mjs` 发出来的那座同源桥
 * （`src/webBridge.ts`，它把 `src/webBridge/api/bodian.js` 直接跑在服务端）。两边的可用性
 * 判断都是同步的：网页版的探测还没回来时照旧答「用不了」，探测回来之后的常规刷新会翻过来 ——
 * 与别的走同一座桥的平台同一个时机。
 */
export const getBodianTransportAvailability = () => (
    typeof window !== 'undefined' && typeof window.electron?.bodianRequest === 'function'
        ? { configured: true } as const
        : isWebBridgeAvailableSync()
            ? { configured: true } as const
            : { configured: false, reason: 'runtime-unavailable' } as const
);

// 桌面版走 IPC，网页版走同源桥。两条路的答复都是 `{ ok: true, data }` / `{ ok: false, error }`
// （bodian-music-api@0.1.2 的契约，`src/webBridge/api/bodian.js` 逐字照它回），所以下面只有一层分支。
export async function requestBodian<T = unknown>(operation: BodianOperation, params: BodianParams = {}): Promise<T> {
    // Omni consumers request 150/1000-row batches; Bodian serves at most 100 and returns its own cursor.
    const boundedParams = Number.isSafeInteger(params.limit) && Number(params.limit) > 100
        ? { ...params, limit: 100 } : params;
    const desktopRequest = typeof window !== 'undefined' ? window.electron?.bodianRequest : undefined;
    let result: BodianBridgeResult;
    if (typeof desktopRequest === 'function') {
        try { result = await desktopRequest(operation, boundedParams); }
        catch (error) { throw new OnlineProviderError('network', BODIAN_BRIDGE_FAILED, 'bodian', error); }
    } else if (await isWebBridgeAvailable()) {
        // 「本地登录」：网页版跑在 `server/static-server.mjs` 发出来的同源站点上时，波点的请求交给
        // 那个服务端内置的接口代码（`src/webBridge/api/bodian.js`），不需要自建后端，也不会有 CORS
        // 问题。静态托管在别处（没有那个服务）时探测失败，落到下面「这个环境用不了」。
        try {
            result = await requestWebBridge<BodianBridgeResult>({
                provider: 'bodian',
                operation,
                params: boundedParams,
            });
        } catch (error) {
            if (error instanceof OnlineProviderError) throw error;
            throw new OnlineProviderError('network', BODIAN_BRIDGE_FAILED, 'bodian', error);
        }
    } else {
        throw new OnlineProviderError('unavailable', BODIAN_NEEDS_DESKTOP, 'bodian');
    }
    // The package's code and sentence go on as they are: bodianFailure.ts says what they mean.
    if (!result.ok) throw new OnlineProviderError(result.error.code, result.error.message, 'bodian');
    return result.data as T;
}
