import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// test/unit/webBridge/relayChannel.test.ts
//
// 中继通道（篡改猴脚本 public/folia-bridge-relay.user.js）的页面侧协议：
// 优先级（中继 → 服务器桥）、握手（ready / ping-pong）、5 秒超时回落服务器桥、
// 以及两条通道答复形状一致（`__foliaBridgeSession` 照样能用 readBridgeSession 读）。
//
// 不真的发网络请求：中继用 mock 的 postMessage / MessageEvent 仿真脚本侧，
// 服务器桥用 mock 的 fetch。桌面环境（window.electron）不进这两条通道，单独钉一条。

const ORIGIN = 'https://folia.tangbot.xyz';

type PostMessage = (message: unknown, targetOrigin: string) => void;

const listeners: Array<(event: MessageEvent) => void> = [];
const dispatchFromScript = (data: unknown) => {
    listeners.forEach((listener) => listener(new MessageEvent('message', { origin: ORIGIN, data })));
};

/** 仿真篡改猴脚本那一侧：收到 relay 请求就回结果，收到 ping 就回 ready。 */
const makeScriptSide = (answer: unknown, onPayload?: (payload: any) => void) => ({
    postMessage: (message: unknown, targetOrigin: string) => {
        const data = message as { type?: string; id?: string; payload?: unknown };
        expect(targetOrigin).toBe(ORIGIN);
        if (data.type === '__folia_bridge_relay_ping') {
            queueMicrotask(() => dispatchFromScript({ type: '__folia_bridge_relay_ready' }));
            return;
        }
        if (data.type === '__folia_bridge_relay') {
            onPayload?.(data.payload);
            queueMicrotask(() => dispatchFromScript({ type: '__folia_bridge_relay_result', id: data.id, answer }));
        }
    },
});

describe('页面侧的中继通道', () => {
    let postMessage: PostMessage;

    const stubWindow = (scriptSide?: ReturnType<typeof makeScriptSide>) => {
        const events: MessageEvent[] = [];
        postMessage = (scriptSide ? scriptSide.postMessage : vi.fn()) as PostMessage;
        vi.stubGlobal('window', {
            location: { origin: ORIGIN },
            electron: undefined,
            postMessage,
            addEventListener: (_type: string, listener: (event: MessageEvent) => void) => {
                listeners.push(listener);
            },
        });
        return events;
    };

    const stubFetchServing = () => vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if ((init?.method || 'GET') === 'GET') return Response.json({ ok: true, ready: true });
        return Response.json({ code: 200, via: 'server' });
    });

    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        listeners.length = 0;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('握手成功后中继优先：payload 原样透传（含 sessionCookies），不走 fetch', async () => {
        const seen: any[] = [];
        const scriptSide = makeScriptSide({ code: 200, via: 'relay', __foliaBridgeSession: { provider: 'qq', cookies: 'uin=9' } },
            (payload) => seen.push(payload));
        stubWindow(scriptSide);
        const fetchMock = stubFetchServing();
        vi.stubGlobal('fetch', fetchMock);

        const { requestWebBridge, readBridgeSession, isRelayReady } = await import('@/services/webBridge');

        // 先 ping 一次等握手（模块加载时监听器还没挂上我们 stub 的 window，所以这里等 5 秒上限之前要靠 ping-pong）。
        const answer = await requestWebBridge({
            provider: 'qq',
            operation: 'login_status',
            method: 'GET',
            path: '/login/status',
            params: {},
            sessionCookies: 'uin=1; qm_keyst=KEY',
        });

        expect(isRelayReady()).toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(seen).toHaveLength(1);
        // 原样透传：provider/operation/params/sessionCookies 都在，不读也不改业务字段。
        expect(seen[0]).toMatchObject({
            provider: 'qq',
            operation: 'login_status',
            path: '/login/status',
            sessionCookies: 'uin=1; qm_keyst=KEY',
        });
        // 中继的答复与服务器桥形状一致：会话回写走同一套 readBridgeSession。
        expect(readBridgeSession(answer)).toBe('uin=9');
        expect((answer as any).via).toBe('relay');
    });

    it('中继 5 秒没等到结果时回落服务器桥，不抛错', async () => {
        vi.useFakeTimers();
        try {
            // 脚本侧应了握手但不回结果：请求挂住。
            stubWindow(makeScriptSide(undefined, () => undefined));
            const fetchMock = stubFetchServing();
            vi.stubGlobal('fetch', fetchMock);
            const { requestWebBridge } = await import('@/services/webBridge');

            const promise = requestWebBridge({ provider: 'netease', operation: 'login_status', path: '/login/status' });
            await vi.advanceTimersByTimeAsync(5100);
            const answer = await promise;

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect((answer as any).via).toBe('server');
        } finally {
            vi.useRealTimers();
        }
    });

    it('脚本不在（没有握手）时也直接走服务器桥', async () => {
        vi.useFakeTimers();
        try {
            // 脚本没装：postMessage 没人应答，ping 等满 5 秒后回落。
            stubWindow();
            const fetchMock = stubFetchServing();
            vi.stubGlobal('fetch', fetchMock);
            const { requestWebBridge } = await import('@/services/webBridge');

            const promise = requestWebBridge({ provider: 'netease', operation: 'login_status', path: '/login/status' });
            await vi.advanceTimersByTimeAsync(5100);
            const answer = await promise;

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect((answer as any).via).toBe('server');
        } finally {
            vi.useRealTimers();
        }
    });

    it('桌面环境不进中继（也不该进），逻辑由既有分支负责', async () => {
        const events: MessageEvent[] = [];
        postMessage = vi.fn() as PostMessage;
        vi.stubGlobal('window', {
            location: { origin: ORIGIN },
            electron: { invoke: vi.fn() },
            postMessage,
            addEventListener: () => undefined,
        });
        void events;
        const fetchMock = stubFetchServing();
        vi.stubGlobal('fetch', fetchMock);
        const { requestWebBridge, isRelayReady } = await import('@/services/webBridge');

        await requestWebBridge({ provider: 'netease', operation: 'login_status', path: '/login/status' });

        expect(postMessage).not.toHaveBeenCalled();
        expect(isRelayReady()).toBe(false);
        // 桌面里探测本身也是关的（isDesktopShell），这条 fetch 是回落路径吗？不是：
        // 桌面里 isWebBridgeAvailable 一律 false，transport 根本不会调 requestWebBridge ——
        // 这里直接调到的是探测兜底之外的服务器桥请求，钉的是「中继不插手」。
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
