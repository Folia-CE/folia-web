import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// test/unit/webBridge/bridgeSession.test.ts
//
// 会话跟着请求走：桥这次请求优先用客户端带来的那份（没有时退回罐里那份），
// 答复再把「这次请求之后」的会话交回页面，页面存进 localStorage、下一次请求带回来。
//
// 不测真实 803：那条路要 QQ 的二维码轮询与换票三个上游端点，桩出来的形状不是真的。
// 803 那一跳拆成两段钉：saveProviderCookie 写进来的凭据要出现在答复的会话里（这里），
// 答复里的会话要写进 localStorage 并在下一次请求带上（下一个 describe）。

const VKEY_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
const SONGMID = 'song-mid';
const MEDIA_MID = 'media-mid';

type CookieRow = { domain: string; name: string; value: string };

const jar: CookieRow[] = [];
const hostStorage = new Map<string, unknown>();

const hostOf = (url: string): string => {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
};

const row = (item: CookieRow) => ({ ...item, path: '/', secure: true, hostOnly: false });

// 与 server/static-server.mjs 的垫片同一套语义：按 host 归档，`domain` / `url` 两种查询都认。
const chromeShim = {
    cookies: {
        async getAll(query: Record<string, string> = {}) {
            const host = query.url ? hostOf(query.url) : '';
            const domain = String(query.domain || '').replace(/^\./, '');
            return jar
                .filter((item) => {
                    if (host) {
                        return item.domain === host || host.endsWith(`.${item.domain}`) || item.domain.endsWith(`.${host}`);
                    }
                    if (!domain) return true;
                    return item.domain === domain || item.domain.endsWith(`.${domain}`) || domain.endsWith(`.${item.domain}`);
                })
                .map(row);
        },
        async get(query: Record<string, string> = {}) {
            const host = hostOf(query.url || '');
            const found = jar.find((item) => item.domain === host && item.name === query.name);
            return found ? row(found) : null;
        },
        async set(details: Record<string, string> = {}) {
            const host = hostOf(details.url || '') || String(details.domain || '').replace(/^\./, '');
            if (!host || !details.name) return null;
            const existing = jar.find((item) => item.domain === host && item.name === details.name);
            if (existing) existing.value = String(details.value ?? '');
            else jar.push({ domain: host, name: details.name, value: String(details.value ?? '') });
            return row({ domain: host, name: details.name, value: String(details.value ?? '') });
        },
        async remove(details: Record<string, string> = {}) {
            const host = hostOf(details.url || '');
            const index = jar.findIndex((item) => item.domain === host && item.name === details.name);
            if (index < 0) return null;
            const [removed] = jar.splice(index, 1);
            return { url: details.url, name: removed.name };
        },
    },
    storage: {
        local: {
            async get(keys: unknown) {
                if (Array.isArray(keys)) {
                    const out: Record<string, unknown> = {};
                    for (const key of keys) if (hostStorage.has(String(key))) out[String(key)] = hostStorage.get(String(key));
                    return out;
                }
                if (keys && typeof keys === 'object') {
                    const out = { ...(keys as Record<string, unknown>) };
                    for (const key of Object.keys(keys)) if (hostStorage.has(key)) out[key] = hostStorage.get(key);
                    return out;
                }
                if (typeof keys === 'string') {
                    return hostStorage.has(keys) ? { [keys]: hostStorage.get(keys) } : {};
                }
                return Object.fromEntries(hostStorage);
            },
            async set(items: Record<string, unknown> = {}) {
                for (const [key, value] of Object.entries(items)) hostStorage.set(key, value);
            },
            async remove(keys: unknown) {
                for (const key of (Array.isArray(keys) ? keys : [keys])) hostStorage.delete(String(key));
            },
            async clear() {
                hostStorage.clear();
            },
        },
    },
    declarativeNetRequest: { async updateSessionRules() {} },
};

type VkeyCall = { url: string; cookie: string; body: any };

// 上游 vkey 的回答：有 purl，地址是 sip + purl（与 QQ 的真实形状一致）。
const stubFetch = (): VkeyCall[] => {
    const calls: VkeyCall[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: Record<string, any> = {}) => {
        const headers = new Headers(init?.headers || {});
        calls.push({
            url: String(input),
            cookie: String(headers.get('cookie') || ''),
            body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        });
        return Response.json({
            code: 0,
            req_0: {
                code: 0,
                data: {
                    sip: ['http://dl.stream.qqmusic.qq.com/'],
                    midurlinfo: [{ filename: `M500${MEDIA_MID}.mp3`, purl: `/M500${MEDIA_MID}.mp3?vkey=stub` }],
                },
            },
        });
    }));
    return calls;
};

const playOnce = async (sessionCookies?: unknown) => {
    const { handleFoliaApiRequest } = await import('@/webBridge/api/folia.js');
    return await handleFoliaApiRequest({
        provider: 'qq',
        operation: 'music_play',
        params: { songmid: SONGMID, mediaId: MEDIA_MID },
        ...(sessionCookies === undefined ? {} : { sessionCookies }),
    });
};

// 一次 music_play 会打两次上游：先查歌曲详情（拿到 media_mid / 封面），再取 vkey。
// 要问「凭据带没带」的是后者。
const vkeyCalls = (calls: VkeyCall[]): VkeyCall[] => calls.filter(
    (call) => call.body?.req_0?.module === 'vkey.GetVkeyServer',
);

describe('桥的会话跟着请求走', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        jar.length = 0;
        hostStorage.clear();
        vi.stubGlobal('chrome', chromeShim);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('带会话时优先用客户端那份，而不是罐里/垫片里的', async () => {
        // 桥这个进程自己记着的是一份旧会话（例如上一个账号留下的）。
        hostStorage.set('foliaBridgeQqCookie', 'uin=999; qm_keyst=JAR-KEY');
        await chromeShim.cookies.set({ url: 'https://y.qq.com/', name: 'qm_keyst', value: 'JAR-KEY' });
        const calls = stubFetch();

        const answer = await playOnce('uin=123; qm_keyst=CLIENT-KEY');

        const [vkey] = vkeyCalls(calls);
        expect(vkey.url).toContain(VKEY_URL);
        expect(vkey.cookie).toContain('qm_keyst=CLIENT-KEY');
        expect(vkey.cookie).not.toContain('JAR-KEY');
        // vkey 的 comm 要带的凭据跟着这份会话走（authst 就是 qm_keyst，uin 是数字那部分）。
        expect(vkey.body.comm.authst).toBe('CLIENT-KEY');
        expect(vkey.body.comm.uin).toBe('123');
        expect(answer.data.playUrl[SONGMID].url).toContain(`M500${MEDIA_MID}.mp3`);
        // 答复把这份会话交回页面。
        expect(answer.__foliaBridgeSession).toMatchObject({ provider: 'qq' });
        expect(answer.__foliaBridgeSession.cookies).toContain('qm_keyst=CLIENT-KEY');
    });

    it('不带会话时退回罐里那份（与改动前一样）', async () => {
        await chromeShim.cookies.set({ url: 'https://y.qq.com/', name: 'uin', value: '999' });
        await chromeShim.cookies.set({ url: 'https://y.qq.com/', name: 'qm_keyst', value: 'JAR-ONLY' });
        const calls = stubFetch();

        await playOnce();

        const [vkey] = vkeyCalls(calls);
        expect(vkey.cookie).toContain('qm_keyst=JAR-ONLY');
        expect(vkey.body.comm.authst).toBe('JAR-ONLY');
    });

    it('也认 [{ name, value }] 这种形状', async () => {
        const calls = stubFetch();

        await playOnce([{ name: 'uin', value: '123' }, { name: 'qm_keyst', value: 'ARR-KEY' }]);

        expect(vkeyCalls(calls)[0].cookie).toContain('qm_keyst=ARR-KEY');
    });

    it('会话只在这一次请求里有效，不留在进程里', async () => {
        hostStorage.set('foliaBridgeQqCookie', 'uin=999; qm_keyst=JAR-KEY');
        stubFetch();

        await playOnce('uin=123; qm_keyst=CLIENT-KEY');
        const { getQQCookie, clearCookieCache } = await import('@/webBridge/api/cookies.js');
        clearCookieCache();
        const after = await getQQCookie();

        expect(after).not.toContain('CLIENT-KEY');
        expect(after).toContain('JAR-KEY');
    });

    // 803 之后会话要回到页面侧：扫码确认时桥把换到的凭据写进罐里，答复里读到的就是带新凭据那份。
    it('请求里写进来的凭据出现在答复的会话里', async () => {
        const { adoptRequestSession, currentProviderSession, dropRequestSession, saveProviderCookie } =
            await import('@/webBridge/api/cookies.js');

        adoptRequestSession('qq', 'uin=123; qm_keyst=OLD-KEY');
        await saveProviderCookie('qq', 'uin=123; qm_keyst=NEW-KEY');
        const answered = await currentProviderSession('qq');
        dropRequestSession();

        // 旧凭据被这次登录换掉：答复里带的是新会话（页面据此覆盖 localStorage）。
        expect(answered).toContain('qm_keyst=NEW-KEY');
        expect(answered).not.toContain('OLD-KEY');
    });

    // 未登录时罐里也会攒下搬运 cookie（ptcz / RK 之类）。那些不是会话：答给页面就等于告诉它
    // 「你登录着」，一次匿名搜索就能把页面存着的登录态冲掉。没有会话就不带这个字段。
    it('没有会话时不把罐里的搬运 cookie 当会话交回去', async () => {
        await chromeShim.cookies.set({ url: 'https://y.qq.com/', name: 'ptcz', value: 'transport-only' });
        const calls = stubFetch();

        const answer = await playOnce();

        expect(vkeyCalls(calls)[0].cookie).toContain('ptcz=transport-only');
        expect(answer).not.toHaveProperty('__foliaBridgeSession');
    });
});

describe('页面把会话存在 localStorage 里，每次请求带上', () => {
    const storage = new Map<string, string>();
    const BRIDGE = '/api/__folia_bridge';

    // 探测是 GET /api/__folia_bridge；之后每个请求都是 POST 一个 { provider, operation, ... }。
    const bridgeServing = (answer: (payload: any) => unknown) => vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            if (String(input) !== BRIDGE) throw new Error(`unexpected target ${String(input)}`);
            if ((init?.method || 'GET') === 'GET') return Response.json({ ok: true, ready: true });
            return Response.json(answer(JSON.parse(String(init?.body))));
        },
    );
    const sent = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls
        .filter(([, init]) => init?.method === 'POST')
        .map(([, init]) => JSON.parse(String(init?.body)));

    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        storage.clear();
        vi.stubEnv('VITE_QQ_API_BASE', '');
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => { storage.set(key, value); },
            removeItem: (key: string) => { storage.delete(key); },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('答复里的会话写进 localStorage，下一次请求带回去', async () => {
        storage.set('online_provider:qq:cookie', 'uin=1; qm_keyst=OLD-KEY');
        const fetchMock = bridgeServing((payload: any) => (payload.operation === 'login_status'
            ? { code: 200, data: { profile: {} }, __foliaBridgeSession: { provider: 'qq', cookies: 'uin=1; qm_keyst=NEW-KEY' } }
            : { code: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const { requestQq } = await import('@/services/onlineMusic/qq/qqTransport');

        // 第一次：带上页面存着的那份旧会话。
        await requestQq('login_status');
        expect(sent(fetchMock)[0].sessionCookies).toBe('uin=1; qm_keyst=OLD-KEY');

        // 桥交回来的那份覆盖掉 localStorage（键名照现有习惯：online_provider:qq:cookie）。
        expect(storage.get('online_provider:qq:cookie')).toBe('uin=1; qm_keyst=NEW-KEY');

        // 下一次请求带的就是新的 —— 桥重启后认得出这是谁，靠的就是它。
        await requestQq('login_status');
        expect(sent(fetchMock)[1].sessionCookies).toBe('uin=1; qm_keyst=NEW-KEY');
    });

    it('没有存过会话时不带这个字段，也不臆造一份', async () => {
        const fetchMock = bridgeServing(() => ({ code: 200, data: { profile: {} } }));
        vi.stubGlobal('fetch', fetchMock);
        const { requestQq } = await import('@/services/onlineMusic/qq/qqTransport');

        await requestQq('login_status');

        expect(sent(fetchMock)[0]).not.toHaveProperty('sessionCookies');
        expect(storage.has('online_provider:qq:cookie')).toBe(false);
    });

    it('答复里没有会话时不动存着的那份', async () => {
        storage.set('online_provider:kugou:cookie', 'userid=1; token=t');
        const fetchMock = bridgeServing(() => ({ code: 200, data: {} }));
        vi.stubGlobal('fetch', fetchMock);
        const { requestKugou } = await import('@/services/onlineMusic/kugou/kugouTransport');

        await requestKugou('search', { keywords: 'x' });

        // 每次请求都带上页面存着的那份（桥重启后认得出来）；答复没给新的就不动它。
        expect(sent(fetchMock).at(-1)).toMatchObject({ sessionCookies: 'userid=1; token=t' });
        expect(storage.get('online_provider:kugou:cookie')).toBe('userid=1; token=t');
    });
});
