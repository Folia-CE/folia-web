import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestBodian } from '@/services/onlineMusic/bodian/bodianTransport';
import { describeBodianFailure } from '@/services/onlineMusic/bodian/bodianFailure';
import { OnlineProviderError } from '@/types/onlineMusic';

// test/unit/onlineMusic/bodianTransport.test.ts

afterEach(() => vi.unstubAllGlobals());

// 取出 requestBodian 的拒绝值；意外 resolve 时让用例失败。
const rejectionOf = (promise: Promise<unknown>) => promise.then(
    () => { throw new Error('expected requestBodian to reject'); },
    (caught: unknown) => caught as OnlineProviderError,
);

describe('Bodian page-size adaptation', () => {
    it.each([150, 1000])('bounds the GridView batch of %s while preserving its physical cursor', async limit => {
        const data = { list: [{ id: 1 }], bodianPagination: { nextOffset: 200, hasMore: true } };
        const bodianRequest = vi.fn().mockResolvedValue({ ok: true, data });
        vi.stubGlobal('window', { electron: { bodianRequest } });
        expect(await requestBodian('playlist_tracks', { id: '123', limit, offset: 100, source: 5 })).toEqual(data);
        expect(bodianRequest).toHaveBeenCalledWith('playlist_tracks', { id: '123', limit: 100, offset: 100, source: 5 });
    });
});

// What the errors mean for playback and the grid is bodianFailure.ts's to say: these read the facts through it.
describe('Bodian transport failures', () => {
    it('reports a missing desktop bridge as Bodian not usable here', async () => {
        vi.stubGlobal('window', { electron: {} });
        const error = await rejectionOf(requestBodian('audio', { id: '1' }));
        expect(error).toBeInstanceOf(OnlineProviderError);
        expect(error).toMatchObject({ code: 'unavailable', providerId: 'bodian' });
        expect(describeBodianFailure('audio', error)).toEqual({ case: 'not-configured' });
    });

    it('reports a rejected IPC call as the local service failing and keeps the cause', async () => {
        const ipcFailure = new Error('IPC channel closed');
        vi.stubGlobal('window', { electron: { bodianRequest: vi.fn().mockRejectedValue(ipcFailure) } });
        const error = await rejectionOf(requestBodian('audio', { id: '1' }));
        expect(error).toBeInstanceOf(OnlineProviderError);
        expect(error.cause).toBe(ipcFailure);
        expect(describeBodianFailure('audio', error)).toEqual({ case: 'local-service-stopped' });
    });

    it.each([
        [{ code: 'network', message: 'Bodian request timed out' }, 'network', null],
        [{ code: 'network', message: 'Bodian HTTP 503' }, 'network', { httpStatus: 503 }],
        [{ code: 'not-playable', message: 'Bodian requires additional playback rights' }, 'not-playable', { case: 'entitlement-required' }],
        [{ code: 'not-playable', message: 'Bodian preview is unavailable' }, 'not-playable', { case: 'preview-only' }],
        [{ code: 'auth-required', message: 'Bodian requires additional playback rights' }, 'auth-required', { signedOut: true }],
        [{ code: 'auth-required', message: 'Bodian rejected the request (code 11012)' }, 'auth-required', { code: '11012' }],
        [{ code: 'region-restricted', message: '由于版权保护，该资源仅限中国大陆地区使用' },
            'region-restricted', { message: '由于版权保护，该资源仅限中国大陆地区使用' }],
    ])('hands the package error %j on as it was, and says what it means', async (bridgeError, code, said) => {
        vi.stubGlobal('window', { electron: { bodianRequest: vi.fn().mockResolvedValue({ ok: false, error: bridgeError }) } });
        const error = await rejectionOf(requestBodian('audio', { id: '1' }));
        expect(error).toBeInstanceOf(OnlineProviderError);
        expect(error).toMatchObject({ providerId: 'bodian', code, message: bridgeError.message });
        expect(describeBodianFailure('audio', error)).toEqual(said);
    });

    it('keeps auth-required for library sign-in failures so session cleanup still runs', async () => {
        const bridgeError = { code: 'auth-required', message: 'Bodian sign-in is required' };
        vi.stubGlobal('window', { electron: { bodianRequest: vi.fn().mockResolvedValue({ ok: false, error: bridgeError }) } });
        await expect(requestBodian('user_albums')).rejects.toMatchObject({ code: 'auth-required', message: 'Bodian sign-in is required' });
    });
});

// 网页版没有主进程那座桥，改由页面自己的服务端（server/static-server.mjs）跑
// src/webBridge/api/bodian.js；答复是同一个 { ok, data } / { ok, error }。这里量的是那一条路。
describe('Bodian over the page bridge', () => {
    // 桥在不在由 webBridge.ts 探一次并记住：每个用例要一份没探过的模块。
    beforeEach(() => vi.resetModules());

    // 探测走 GET，接口请求走 POST：按方法认出是哪一条。
    const bridgeFetch = (postBody: unknown) => vi.fn((_url: string, init?: RequestInit) => Promise.resolve(
        init?.method === 'POST' ? Response.json(postBody) : Response.json({ ok: true, ready: true }),
    ));

    it('reports the platform as usable where that bridge answers', async () => {
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', bridgeFetch({ ok: true, data: null }));
        const { getBodianTransportAvailability } = await import('@/services/onlineMusic/bodian/bodianTransport');
        const { isWebBridgeAvailable } = await import('@/services/webBridge');

        // 探测还没回来时同步答不了「有桥」：与走同一座桥的其它平台一样，这一刻照旧是这个环境用不了。
        expect(getBodianTransportAvailability()).toEqual({ configured: false, reason: 'runtime-unavailable' });
        await isWebBridgeAvailable();
        expect(getBodianTransportAvailability()).toEqual({ configured: true });
    });

    it('sends the operation and its parameters to the bridge in the package\'s shape', async () => {
        vi.stubGlobal('window', {});
        const data = { list: [{ id: 1 }], bodianPagination: { nextOffset: 200, hasMore: true } };
        const fetchMock = bridgeFetch({ ok: true, data });
        vi.stubGlobal('fetch', fetchMock);
        const { requestBodian } = await import('@/services/onlineMusic/bodian/bodianTransport');
        const { isWebBridgeAvailable } = await import('@/services/webBridge');
        await isWebBridgeAvailable();

        expect(await requestBodian('playlist_tracks', { id: '123', limit: 1000, offset: 100, source: 5 })).toEqual(data);
        const posts = fetchMock.mock.calls.filter(call => call[1]?.method === 'POST');
        expect(posts).toHaveLength(1);
        // 批量上限和桌面那条路一样收在 100：波点一页最多给这么多。
        expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({
            provider: 'bodian',
            operation: 'playlist_tracks',
            params: { id: '123', limit: 100, offset: 100, source: 5 },
        });
    });

    it('hands an operation the bridge refused back as the error it answered with', async () => {
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', bridgeFetch({ ok: false, error: { code: 'auth-required', message: 'Bodian sign-in is required' } }));
        const { requestBodian } = await import('@/services/onlineMusic/bodian/bodianTransport');
        // resetModules 之后要同一个模块实例里认这个类：认的是这棵树自己的 OnlineProviderError。
        const { OnlineProviderError: LoadedError } = await import('@/types/onlineMusic');
        const { isWebBridgeAvailable } = await import('@/services/webBridge');
        await isWebBridgeAvailable();

        const error = await rejectionOf(requestBodian('user_albums'));
        expect(error).toBeInstanceOf(LoadedError);
        // 桥的 code 和原文照旧往上交，不吞成一句「网络错误」。
        expect(error).toMatchObject({ providerId: 'bodian', code: 'auth-required', message: 'Bodian sign-in is required' });
    });

    it('stays unusable where the page is served without that bridge', async () => {
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
        const { getBodianTransportAvailability, requestBodian } = await import('@/services/onlineMusic/bodian/bodianTransport');
        const { describeBodianFailure } = await import('@/services/onlineMusic/bodian/bodianFailure');
        const { isWebBridgeAvailable } = await import('@/services/webBridge');
        await isWebBridgeAvailable();

        expect(getBodianTransportAvailability()).toEqual({ configured: false, reason: 'runtime-unavailable' });
        expect(describeBodianFailure('audio', await rejectionOf(requestBodian('audio', { id: '1' }))))
            .toEqual({ case: 'not-configured' });
    });
});
