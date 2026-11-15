import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createProviderLoginSession,
    PROVIDER_LOGIN_POLL_INTERVAL_MS,
    PROVIDER_LOGIN_SCANNED_LIMIT_MS,
    type ProviderLoginConfirmedHandler,
    type ProviderLoginSession,
} from '@/library/core/account/providerLoginSession.service';
import type { LibraryAccountAuthPort, LibraryAccountClock, LibraryAccountLogger } from '@/library/core/account/account.contract';
import { diagnosticLine } from '@/services/onlineMusic/login/loginDiagnosticReport';
import { noteLoginFailure } from '@/services/onlineMusic/login/loginFailureCase';
import { LoginRequestTimeout } from '@/services/onlineMusic/login/loginRequestLimit';
import { OnlineProviderError, type LoginSelfCheckResult, type LoginState } from '@/types/onlineMusic';
import {
    LOGIN_QR_CACHE_FIELDS,
    clearCachedLoginQr,
    loginQrCacheKey,
    readCachedLoginQr,
    writeCachedLoginQr,
    type LoginQrCacheStorage,
} from '@/library/core/account/loginQrCache';

// test/unit/library/core/providerLoginSession.test.ts
// 登录会话：一次登录（扫码或在浏览器里确认）从开始到结束的每一步。原来登录窗口的 hook（useProviderLogin）的
// 每一条行为都在这里（标注 [hook]），加上会话自己的竞态、串行开始、瞬时失败、自检与日志。没有成功时交出的是哪一种情况
// （services/onlineMusic/login/loginFailureCase）按 A 到 G 七类逐条钉住。时钟注入一个手动推进的假时钟。

const POLL = PROVIDER_LOGIN_POLL_INTERVAL_MS;
// qqProvider 声明的这一次登录的有效期：175 秒，比后端的 180 秒早一步。
const QR_TTL_MS = 175_000;

/** 手动时钟：advance 按到期顺序逐个触发计时器，每次触发前后把微任务排空（让 await 链走完）。 */
const createManualClock = (start = 1_700_000_000_000) => {
    let now = start;
    let seq = 0;
    const timers = new Map<number, { at: number; seq: number; callback: () => void }>();
    const flush = () => new Promise<void>(resolve => setImmediate(resolve));
    const clock: LibraryAccountClock = {
        now: () => now,
        setTimeout: (callback, ms) => {
            const id = ++seq;
            timers.set(id, { at: now + ms, seq: id, callback });
            return id;
        },
        clearTimeout: handle => { timers.delete(handle as number); },
    };
    /**
     * 下一个计时器还有多久到点。测试据此推进，避免把实现里的间隔常量抄进测试
     * —— 抄一遍等于实现改错时测试跟着错。
     */
    const nextTimerDelay = (): number => {
        const due = [...timers.values()].map(timer => timer.at - now).sort((a, b) => a - b);
        return due.length > 0 ? due[0] : 0;
    };
    const advance = async (ms: number) => {
        const target = now + ms;
        for (; ;) {
            await flush();
            const due = [...timers.entries()]
                .filter(([, timer]) => timer.at <= target)
                .sort(([, a], [, b]) => a.at - b.at || a.seq - b.seq)[0];
            if (!due) break;
            timers.delete(due[0]);
            now = due[1].at;
            due[1].callback();
        }
        now = target;
        await flush();
    };
    return { clock, advance, flush, nextTimerDelay, pendingTimers: () => timers.size };
};

const deferred = <T,>() => {
    let resolve: (value: T) => void = () => { };
    let reject: (error: unknown) => void = () => { };
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
};

let auth: { [K in keyof LibraryAccountAuthPort]: ReturnType<typeof vi.fn> };
let manual: ReturnType<typeof createManualClock>;

/**
 * 推进到下一次轮询实际排上的时刻（可推进 times 次）。
 * 轮询间隔自本批次起是退避序列（2.0/2.5/3.2/4.1/5.3s，±15%），不再是固定的 2000ms；
 * 旧期望基于固定 2000ms，故推进方式改为「按被测代码真实排期推进」，断言本身不变。
 */
const advanceToNextPoll = async (times = 1): Promise<void> => {
    for (let i = 0; i < times; i += 1) {
        // 推进到「下一次 checkLogin 真的发生」为止，而不是「下一个计时器到期」：
        // 假时钟里同时躺着二维码 TTL 计时器（netease 173s），按全局最小到期跳过去会直接跳过轮询、把码判过期。
        // 也不用实现里的退避常量反推间隔——走多远由被测代码自己的排期决定，实现改错时测试不会跟着错。
        const target = auth.checkLogin.mock.calls.length + 1;
        let elapsed = 0;
        while (auth.checkLogin.mock.calls.length < target && elapsed < 10_000) {
            // 先排空微任务：deferred resolve 之后要等 handlePollResult 的 async 链跑完才会重排计时器，
            // 单次 flush 通常不够，所以这里「flush → 小步推进」循环到轮询真的发生。
            await manual.flush();
            const due = manual.nextTimerDelay();
            const step = Math.min(due > 0 ? due : 100, 1_000); // 单步不超过 1s，避免一步跨到 TTL 上
            await manual.advance(step);
            elapsed += step;
        }
    }
};
let log: ReturnType<typeof vi.fn<LibraryAccountLogger>>;
let onConfirmed: ReturnType<typeof vi.fn<ProviderLoginConfirmedHandler>>;

/** 假的 sessionStorage：只给缓存模块用的三个方法，测试可以拿到 raw 断言落盘内容。 */
const createFakeQrCache = () => {
    const data = new Map<string, string>();
    const storage: LoginQrCacheStorage = {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => { data.set(key, value); },
        removeItem: key => { data.delete(key); },
    };
    return { storage, raw: data };
};
let qrCache: ReturnType<typeof createFakeQrCache> | undefined;

/** 可控的假 pagehide 端口：手动触发"页面即将隐藏/卸载"，并统计订阅者数量。 */
const createFakePageHide = () => {
    const listeners = new Set<() => void>();
    return {
        port: {
            subscribe: (listener: () => void) => {
                listeners.add(listener);
                return () => { listeners.delete(listener); };
            },
        },
        fire() { for (const listener of [...listeners]) listener(); },
        listenerCount: () => listeners.size,
    };
};

/** 可枚举的租约存储：生产用 localStorage，测试用 Map 包一个。 */
const createLeaseStorage = () => {
    const data = new Map<string, string>();
    return {
        storage: {
            getItem: (key: string) => data.get(key) ?? null,
            setItem: (key: string, value: string) => { data.set(key, value); },
            removeItem: (key: string) => { data.delete(key); },
            get length() { return data.size; },
            key: (index: number) => [...data.keys()][index] ?? null,
        },
        raw: data,
    };
};

/** 可控的假可见性端口：测试里手动切前台/后台，并统计订阅者数量。 */
const createFakeVisibility = () => {
    let hidden = false;
    const listeners = new Set<() => void>();
    return {
        port: {
            isHidden: () => hidden,
            subscribe: (listener: () => void) => {
                listeners.add(listener);
                return () => { listeners.delete(listener); };
            },
        },
        set(next: boolean) { hidden = next; for (const listener of [...listeners]) listener(); },
        listenerCount: () => listeners.size,
    };
};

const createSession = (overrides: {
    onConfirmed?: ProviderLoginConfirmedHandler | null;
    qrCache?: LoginQrCacheStorage | null;
    visibility?: { isHidden: () => boolean; subscribe: (listener: () => void) => () => void };
    leaderLock?: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; readonly length?: number; key?(index: number): string | null } | null;
    instanceId?: string;
    pageHide?: { subscribe: (listener: () => void) => () => void };
} = {}): ProviderLoginSession => (
    createProviderLoginSession({
        auth: auth as unknown as LibraryAccountAuthPort,
        clock: manual.clock,
        diagnostics: { appVersion: '9.9.9-test', userAgent: 'vitest agent', build: 'official (chthollyphile/folia-major@test)' },
        log,
        // 抖动固定为中位（因子 1），让推进量可预测；随机源由产品代码注入，测试不依赖 Math.random。
        random: () => 0.5,
        // 默认关闭复用：既有用例断言的是「会话结束时会被取消」，注入缓存会改变那条路径。
        // 只有显式要测复用的用例才传 qrCache（见文件末尾的 QR reuse describe）。
        qrCache: overrides.qrCache === undefined ? null : overrides.qrCache,
        visibility: overrides.visibility,
        ...(overrides.leaderLock === undefined ? {} : { leaderLock: overrides.leaderLock }),
        ...(overrides.instanceId === undefined ? {} : { instanceId: overrides.instanceId }),
        ...(overrides.pageHide === undefined ? {} : { pageHide: overrides.pageHide }),
        onConfirmed: overrides.onConfirmed === null ? undefined : overrides.onConfirmed ?? onConfirmed,
    })
);

/** 在浏览器里确认的登录（Spotify 那样）：没有二维码，开始就打开登录的页面。 */
const inBrowser = () => {
    auth.confirmsLoginInBrowser.mockReturnValue(true);
    auth.startLogin.mockResolvedValue({ key: 'web-key-1', imageUrl: '' });
};

beforeEach(() => {
    manual = createManualClock();
    log = vi.fn<LibraryAccountLogger>();
    onConfirmed = vi.fn<ProviderLoginConfirmedHandler>();
    qrCache = createFakeQrCache();
    auth = {
        resolveLoginMethods: vi.fn().mockResolvedValue([]),
        getProviderCapabilities: vi.fn().mockReturnValue({ auth: true }),
        startLogin: vi.fn().mockResolvedValue({ key: 'qr-key-1', imageUrl: 'qr-1.png' }),
        checkLogin: vi.fn().mockResolvedValue({ state: 'waiting' } satisfies LoginState),
        cancelLogin: vi.fn().mockResolvedValue(undefined),
        confirmsLoginInBrowser: vi.fn().mockReturnValue(false),
        opensLoginPageItself: vi.fn().mockReturnValue(false),
        openLoginPage: vi.fn().mockResolvedValue(undefined),
        getLoginTtlMs: vi.fn().mockReturnValue(QR_TTL_MS),
        getLoginTexts: vi.fn().mockReturnValue(null),
        getLoginLocalService: vi.fn().mockReturnValue(null),
        getLoginDiagnostics: vi.fn().mockResolvedValue([diagnosticLine`runtime: test`]),
        canRunLoginSelfCheck: vi.fn().mockReturnValue(false),
        runLoginSelfCheck: vi.fn().mockResolvedValue(null),
        checksAfterLogin: vi.fn().mockReturnValue(false),
        checkAfterLogin: vi.fn().mockResolvedValue(null),
        hasSetup: vi.fn().mockReturnValue(false),
        getSetup: vi.fn().mockResolvedValue(null),
        runSetupAction: vi.fn(),
        dropRequestLimits: vi.fn(),
    };
});

// ─── 一次登录的每一步 ────────────────────────────────────────────────────

describe('providerLoginSession', () => {
    it('[hook] cancels the session with the provider that started it', async () => {
        const session = createSession();
        await session.start('qq').settled;
        session.stop();
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('qq', 'qr-key-1');
    });

    it('[hook] sends no cancel at all when there is no session to release, and stops timing the requests of the sign-in', () => {
        const session = createSession();
        session.stop();
        expect(auth.cancelLogin).not.toHaveBeenCalled();
        expect(auth.dropRequestLimits).toHaveBeenCalledTimes(1);
    });

    it('[hook] releases the live session on dispose and ignores later starts', async () => {
        const session = createSession();
        await session.start('netease').settled;
        session.dispose();
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('netease', 'qr-key-1');
        session.start('netease');
        await manual.flush();
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
    });

    it('[hook] turns the code expired and releases the session once the front-end lifetime elapses', async () => {
        const session = createSession();
        await session.start('qq').settled;
        await manual.advance(QR_TTL_MS);
        expect(session.getSnapshot()).toMatchObject({ phase: 'expired', failureKind: null, failure: { case: { id: 'code-expired' }, facts: { step: 'wait' } } });
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('qq', 'qr-key-1');
        expect(manual.pendingTimers()).toBe(0);
    });

    it('[hook] runs no front-end timer for a provider that declares no lifetime', async () => {
        auth.getLoginTtlMs.mockReturnValue(null);
        const session = createSession();
        await session.start('netease').settled;
        await manual.advance(QR_TTL_MS * 2);
        expect(session.getSnapshot().phase).toBe('waiting');
    });

    it('[hook] keeps exactly one active session when start runs twice, e.g. on a login-method switch', async () => {
        auth.startLogin
            .mockResolvedValueOnce({ key: 'qr-key-1', imageUrl: 'qr-1.png' })
            .mockResolvedValueOnce({ key: 'qr-key-2', imageUrl: 'qr-2.png' });
        const session = createSession();
        await session.start('qq', 'qq').settled;
        await session.start('qq', 'wechat').settled;
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('qq', 'qr-key-1');
        expect(auth.startLogin).toHaveBeenLastCalledWith('qq', 'wechat');
        expect(session.getSnapshot()).toMatchObject({ codeImage: 'qr-2.png', methodId: 'wechat' });
    });

    it('[hook] hands back a session that was superseded while its request was still in flight', async () => {
        const first = deferred<{ key: string; imageUrl: string }>();
        auth.startLogin.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ key: 'qr-key-2', imageUrl: 'qr-2.png' });
        const session = createSession();
        const settled = session.start('kugou').settled;
        session.stop();
        first.resolve({ key: 'qr-key-1', imageUrl: 'qr-1.png' });
        await settled;
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('kugou', 'qr-key-1');
        await session.start('kugou').settled;
        expect(session.getSnapshot()).toMatchObject({ phase: 'waiting', codeImage: 'qr-2.png' });
    });

    it('[hook] clears the lifetime timer on a final state so it cannot fire behind a closed window', async () => {
        auth.checkLogin.mockResolvedValueOnce({ state: 'error', message: 'refused' } satisfies LoginState);
        const session = createSession();
        await session.start('qq').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().phase).toBe('error');
        expect(manual.pendingTimers()).toBe(0);
    });

    it('[hook] never cancels a confirmed session, because a poll in flight still has to read the confirm', async () => {
        auth.checkLogin.mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        session.stop();
        expect(auth.cancelLogin).not.toHaveBeenCalled();
        expect(onConfirmed).toHaveBeenCalledExactlyOnceWith({ sessionId: 1, providerId: 'netease', methodId: null });
    });

    it('[hook] reports no failure kind when a code nobody scanned simply expires', async () => {
        auth.checkLogin.mockResolvedValueOnce({ state: 'expired' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot()).toMatchObject({ phase: 'expired', failureKind: null, failure: { case: { id: 'code-expired' } } });
    });

    it('[hook] treats a code that expires after being scanned as a failed sign-in', async () => {
        auth.checkLogin
            .mockResolvedValueOnce({ state: 'scanned' } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'expired' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(2); // 原为 advance(POLL * 2)
        expect(session.getSnapshot()).toMatchObject({ phase: 'expired', failureKind: 'expired-after-scan', failure: { case: { id: 'expired-after-scan' } } });
    });

    it('[hook] ends a sign-in left scanned for 60 s as the expiry does, with no lifetime declared; back to waiting, the count starts again', async () => {
        auth.getLoginTtlMs.mockReturnValue(null);
        auth.checkLogin.mockResolvedValue({ state: 'scanned' } satisfies LoginState);
        const session = createSession();
        await session.start('kugou').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        // Back to waiting at the next check: the count goes; scanned again at the one after, it starts from there.
        auth.checkLogin.mockResolvedValueOnce({ state: 'waiting' } satisfies LoginState);
        await manual.advance(PROVIDER_LOGIN_SCANNED_LIMIT_MS + POLL / 2);
        expect(session.getSnapshot().phase).toBe('scanned');
        // 原为 advance(POLL * 1.5)：旧期望基于固定 2000ms。
        // 扫描后间隔变为 3s，多轮 poll 不会重启计时器（只在 scannedTimer 为 null 时才设），
        // 所以过期必须真的跨过那个 60s 计时器，而不是「再 poll 一次」。
        await manual.advance(PROVIDER_LOGIN_SCANNED_LIMIT_MS + 1_000);
        expect(session.getSnapshot()).toMatchObject({
            phase: 'expired',
            failureKind: 'expired-after-scan',
            failure: { case: { id: 'expired-after-scan', action: 'refresh-code' }, facts: { step: 'wait', scanned: true } },
        });
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('kugou', 'qr-key-1');
        expect(manual.pendingTimers()).toBe(0);
        expect(log.mock.calls.some(([, event, detail]) => event === 'state' && detail.source === 'scanned')).toBe(true);
    });

    it('[hook] marks a confirmed sign-in whose account cannot be read as failed', async () => {
        onConfirmed.mockResolvedValue(false);
        auth.checkLogin.mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot()).toMatchObject({
            phase: 'error', failureKind: 'account-refresh-failed', failure: { case: { id: 'account-not-read', kind: 'F' }, facts: { step: 'account' } },
        });
    });

    it('[hook] builds a report from this sign-in only and clears the failure on a new start', async () => {
        auth.startLogin.mockRejectedValueOnce(new Error('backend down'));
        const session = createSession();
        await session.start('netease').settled;
        const report = await session.buildDiagnosticReport();
        expect(report).toContain('provider: netease');
        expect(report).toContain('failure: start-error');
        expect(report).toContain('case: unknown (kind G)');
        expect(report).toContain('build: official (chthollyphile/folia-major@test)');
        expect(report).toContain('runtime: test');
        expect(report).toContain('start:error');

        await session.start('netease').settled;
        expect(session.getSnapshot()).toMatchObject({ phase: 'waiting', failureKind: null, failure: null });
        const next = await session.buildDiagnosticReport();
        expect(next).toContain('failure: none');
        expect(next).not.toContain('start:error');
    });

    it('issues a new session id on every start and exposes the raw snapshot from loading on', async () => {
        const session = createSession();
        const first = session.start('netease');
        expect(first.sessionId).toBe(1);
        expect(session.getSnapshot()).toMatchObject({ sessionId: 1, providerId: 'netease', phase: 'loading', codeImage: '', failure: null });
        await first.settled;
        const second = session.start('qq', 'wechat');
        expect(second.sessionId).toBeGreaterThan(first.sessionId);
        expect(session.getSnapshot()).toMatchObject({ sessionId: second.sessionId, providerId: 'qq', methodId: 'wechat', phase: 'loading' });
    });

    it('keeps the snapshot identity while nothing changes and notifies subscribers only on change', async () => {
        const session = createSession();
        const listener = vi.fn();
        const unsubscribe = session.subscribe(listener);
        await session.start('netease').settled;
        const ready = session.getSnapshot();
        const calls = listener.mock.calls.length;
        await advanceToNextPoll(3); // 原为 advance(POLL * 3)
        expect(session.getSnapshot()).toBe(ready);
        expect(listener).toHaveBeenCalledTimes(calls);
        unsubscribe();
        session.stop();
    });

    it('polls serially: the next check is scheduled only after the previous one settles', async () => {
        const check = deferred<LoginState>();
        auth.checkLogin.mockReturnValueOnce(check.promise);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(5); // 原为 advance(POLL * 5)
        expect(auth.checkLogin).toHaveBeenCalledTimes(1);
        check.resolve({ state: 'waiting' });
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(auth.checkLogin).toHaveBeenCalledTimes(2);
    });

    it('fails straight away without asking for a code when the provider has no sign-in', async () => {
        auth.getProviderCapabilities.mockReturnValue({ auth: false });
        const session = createSession();
        await session.start('folium.mod.source').settled;
        expect(auth.startLogin).not.toHaveBeenCalled();
        expect(session.getSnapshot()).toMatchObject({ phase: 'error', failureKind: null, failure: { case: { id: 'unknown' }, facts: { step: 'start' } } });
        expect(auth.runLoginSelfCheck).not.toHaveBeenCalled();
    });

    it('classifies a thrown check as check-error and stops polling and the lifetime', async () => {
        auth.checkLogin.mockRejectedValueOnce(new Error('socket hang up'));
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot()).toMatchObject({ phase: 'error', failureKind: 'check-error', failure: { facts: { step: 'check' } } });
        expect(manual.pendingTimers()).toBe(0);
    });

    it('drops the confirm callback result when a new start supersedes the session meanwhile', async () => {
        const refresh = deferred<boolean>();
        onConfirmed.mockReturnValueOnce(refresh.promise);
        auth.checkLogin.mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        await session.start('qq').settled;
        refresh.resolve(false);
        await manual.flush();
        expect(session.getSnapshot()).toMatchObject({ providerId: 'qq', phase: 'waiting', failure: null });
    });

    it('hands back a code that arrives after stop', async () => {
        const created = deferred<{ key: string; imageUrl: string }>();
        auth.startLogin.mockReturnValueOnce(created.promise);
        const session = createSession();
        const { settled } = session.start('qq');
        session.stop();
        created.resolve({ key: 'late-key', imageUrl: 'late.png' });
        await settled;
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('qq', 'late-key');
        expect(session.getSnapshot().codeImage).toBe('');
    });

    it('logs the same records it keeps in the timeline, in order', async () => {
        auth.checkLogin
            .mockResolvedValueOnce({ state: 'scanned' } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(2); // 原为 advance(POLL * 2)
        expect(log.mock.calls.map(([, event]) => event)).toEqual(['start', 'ready', 'state', 'state', 'complete']);
        expect(log.mock.calls.every(([, , detail]) => detail.providerId === 'netease' && typeof detail.elapsedMs === 'number')).toBe(true);
        const report = await session.buildDiagnosticReport();
        expect(report).toMatch(/start .*ready.*state state=scanned.*state state=confirmed.*complete/s);
    });

    it('treats a throwing confirm callback as an account that was not read (check-error in the report)', async () => {
        onConfirmed.mockRejectedValueOnce(new Error('refresh exploded'));
        auth.checkLogin.mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot()).toMatchObject({ phase: 'error', failureKind: 'check-error', failure: { case: { id: 'account-not-read' }, facts: { step: 'account' } } });
    });

    it('stays confirmed without a confirm callback', async () => {
        auth.checkLogin.mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession({ onConfirmed: null });
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot()).toMatchObject({ phase: 'confirmed', failure: null });
    });

    it('has no report before the first start', async () => {
        await expect(createSession().buildDiagnosticReport()).resolves.toBeNull();
    });

    it('falls back to the console logger with its prefix when no logger is injected', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => { });
        const session = createProviderLoginSession({
            auth: auth as unknown as LibraryAccountAuthPort,
            clock: manual.clock,
            diagnostics: { appVersion: null, userAgent: '' },
        });
        await session.start('netease').settled;
        expect(info).toHaveBeenCalledWith('[ProviderLogin] start', expect.objectContaining({ providerId: 'netease' }));
        info.mockRestore();
    });
});

// ─── 在浏览器里确认的登录 ────────────────────────────────────────────────

describe('providerLoginSession · a sign-in confirmed in the browser', () => {
    it('[hook] opens the provider page at once, and has no code to show', async () => {
        inBrowser();
        const session = createSession();
        await session.start('spotify').settled;
        await manual.flush();
        expect(session.getSnapshot()).toMatchObject({ inBrowser: true, phase: 'waiting', codeImage: '', canReopenLoginPage: true });
        expect(auth.openLoginPage).toHaveBeenCalledExactlyOnceWith('spotify', 'web-key-1');
        // The person's button opens it again.
        await expect(session.openLoginPage()).resolves.toBe(true);
        expect(auth.openLoginPage).toHaveBeenCalledTimes(2);
    });

    it('[hook] opens nothing for a sign-in whose page the provider opened itself, and says that it cannot be opened again', async () => {
        inBrowser();
        auth.opensLoginPageItself.mockReturnValue(true);
        const session = createSession();
        await session.start('ytm').settled;
        await manual.flush();
        expect(auth.openLoginPage).not.toHaveBeenCalled();
        expect(session.getSnapshot().canReopenLoginPage).toBe(false);
    });

    it('kind E: a browser that did not open is told as a case while the sign-in goes on waiting (browser-not-opened)', async () => {
        inBrowser();
        auth.openLoginPage.mockRejectedValueOnce(new Error('no handler for https'));
        const session = createSession();
        await session.start('spotify').settled;
        await manual.flush();
        expect(session.getSnapshot()).toMatchObject({
            phase: 'waiting',
            failure: { case: { id: 'browser-not-opened', kind: 'E', action: 'reopen-browser' }, facts: { step: 'open', inBrowser: true } },
        });
        // Still waiting: the checks go on.
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(auth.checkLogin).toHaveBeenCalledTimes(1);
    });

    it('clears what was told of a failed open once the page opens, whatever case the provider named for it', async () => {
        inBrowser();
        const opening = new Error('blocked');
        noteLoginFailure(opening, { case: 'no-browser' });
        auth.openLoginPage.mockRejectedValueOnce(opening);
        const session = createSession();
        await session.start('spotify').settled;
        await manual.flush();
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'no-browser' }, facts: { step: 'open' } });
        await expect(session.openLoginPage()).resolves.toBe(true);
        expect(session.getSnapshot().failure).toBeNull();
    });

    it('keeps a failure already told when the browser fails to open after it', async () => {
        inBrowser();
        const open = deferred<void>();
        auth.openLoginPage.mockReturnValueOnce(open.promise);
        auth.checkLogin.mockResolvedValueOnce({ state: 'error', failure: { case: 'browser-closed-early', mainCode: 'exited' } } satisfies LoginState);
        const session = createSession();
        await session.start('ytm').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        open.reject(new Error('late'));
        await manual.flush();
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'browser-closed-early' } });
    });

    it('sets nothing when the browser fails to open after the sign-in was confirmed', async () => {
        inBrowser();
        const open = deferred<void>();
        auth.openLoginPage.mockReturnValueOnce(open.promise);
        auth.checkLogin.mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession();
        await session.start('spotify').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        open.reject(new Error('late'));
        await manual.flush();
        expect(session.getSnapshot()).toMatchObject({ phase: 'confirmed', failure: null });
    });

    it('does not let a page that opened for an earlier sign-in clear what the next sign-in tells, nor put its error in the next timeline', async () => {
        inBrowser();
        const first = deferred<void>();
        auth.openLoginPage.mockReturnValueOnce(first.promise).mockRejectedValueOnce(new Error('second failed'));
        const session = createSession();
        await session.start('spotify').settled;
        await session.start('spotify').settled;
        await manual.flush();
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'browser-not-opened' } });
        first.reject(new Error('first failed'));
        await manual.flush();
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'browser-not-opened' } });
        const report = await session.buildDiagnosticReport();
        expect(report).toContain('second failed');
        expect(report).not.toContain('first failed');
        expect(log).toHaveBeenCalledWith('warn', 'open-page:error (an earlier sign-in)', expect.objectContaining({ providerId: 'spotify' }));
    });

    it('forgets a browser that did not open when the sign-in is stopped, and keeps the failure of a sign-in that ended', async () => {
        inBrowser();
        auth.openLoginPage.mockRejectedValueOnce(new Error('no handler'));
        const session = createSession();
        await session.start('spotify').settled;
        await manual.flush();
        session.stop();
        expect(session.getSnapshot().failure).toBeNull();

        auth.checkLogin.mockResolvedValueOnce({ state: 'expired' } satisfies LoginState);
        await session.start('spotify').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        session.stop();
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'browser-unfinished' } });
    });

    it('cannot open the page again once the sign-in is stopped', async () => {
        inBrowser();
        const session = createSession();
        await session.start('spotify').settled;
        session.stop();
        await expect(session.openLoginPage()).resolves.toBe(false);
        expect(auth.openLoginPage).toHaveBeenCalledTimes(1);
    });
});

// ─── 没有成功时是哪一种情况（A 到 G） ───────────────────────────────────

describe('providerLoginSession · why the sign-in did not succeed', () => {
    it('kind A: a scanned code ended with a wait named by the platform keeps the wait, and the refresh waits for it', async () => {
        auth.checkLogin
            .mockResolvedValueOnce({ state: 'scanned' } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'expired', failure: { retryAfterMs: 30_000 } } satisfies LoginState);
        const session = createSession();
        await session.start('qq').settled;
        await advanceToNextPoll(2); // 原为 advance(POLL * 2)
        expect(session.getSnapshot().failure).toMatchObject({
            case: { id: 'expired-after-scan', action: 'wait-then-retry' }, facts: { retryAfterMs: 30_000 },
        });
    });

    it('kind B: the sign-in could not start because the platform was not reached (unreachable), or was not answered in time (no-answer)', async () => {
        auth.startLogin.mockRejectedValueOnce(new OnlineProviderError('network', 'fetch failed', 'kugou'));
        const session = createSession();
        await session.start('kugou').settled;
        expect(session.getSnapshot()).toMatchObject({ phase: 'error', failureKind: 'start-error', failure: { case: { id: 'unreachable', kind: 'B' } } });

        auth.startLogin.mockRejectedValueOnce(new LoginRequestTimeout());
        await session.start('kugou').settled;
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'no-answer', kind: 'B', action: 'refresh-code' }, facts: { step: 'start' } });
    });

    it('kind C: the platform refused, with its code and words (refused); it asked for a wait (retry-later); the account is over its device limit', async () => {
        auth.checkLogin.mockResolvedValueOnce({ state: 'error', failure: { code: '8821', message: '当前登录存在安全风险' } } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'refused', kind: 'C' }, facts: { code: '8821', message: '当前登录存在安全风险' } });

        auth.checkLogin.mockResolvedValueOnce({ state: 'error', failure: { case: 'retry-later', retryAfterMs: 31_000 } } satisfies LoginState);
        await session.start('qq').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'retry-later', action: 'wait-then-retry' }, facts: { retryAfterMs: 31_000 } });

        auth.checkLogin.mockResolvedValueOnce({ state: 'error', failure: { case: 'device-limit', code: '20279' } } satisfies LoginState);
        auth.canRunLoginSelfCheck.mockReturnValue(true);
        await session.start('qq').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot()).toMatchObject({ failureKind: 'check-error', failure: { case: { id: 'device-limit', kind: 'C' } } });
        // A device limit is still worth a self-check.
        expect(auth.runLoginSelfCheck).toHaveBeenCalledWith('qq');
    });

    it('kind D: the case the provider named for an error it threw (local-service-stopped)', async () => {
        const error = new Error('ECONNREFUSED');
        noteLoginFailure(error, { case: 'local-service-stopped' });
        auth.startLogin.mockRejectedValueOnce(error);
        const session = createSession();
        await session.start('netease').settled;
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'local-service-stopped', kind: 'D', action: 'restart-service' } });
    });

    it('kind A: a sign-in in the browser that was not finished (browser-unfinished)', async () => {
        inBrowser();
        auth.checkLogin.mockResolvedValueOnce({ state: 'expired' } satisfies LoginState);
        const session = createSession();
        await session.start('spotify').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'browser-unfinished', kind: 'A', action: 'sign-in-again' } });
    });

    it('kind F: confirmed, and the account then not read (account-not-read)', async () => {
        onConfirmed.mockResolvedValueOnce(false);
        auth.checkLogin.mockResolvedValueOnce({ state: 'confirmed' } satisfies LoginState);
        const session = createSession();
        await session.start('kugou').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'account-not-read', kind: 'F' } });
    });

    it('kind G: nothing to go by (unknown): an error without facts, a check that throws a bare error', async () => {
        auth.startLogin.mockRejectedValueOnce(new Error('???'));
        const session = createSession();
        await session.start('kugou').settled;
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'unknown', kind: 'G' } });

        auth.checkLogin.mockRejectedValueOnce(new Error('???'));
        await session.start('kugou').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'unknown' }, facts: { step: 'check' } });
    });

    it('tells no case for a sign-in that was stopped, also when its answer comes after the stop', async () => {
        const check = deferred<LoginState>();
        auth.checkLogin.mockReturnValueOnce(check.promise);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        session.stop();
        check.resolve({ state: 'error', failure: { code: '8821' } });
        await manual.flush();
        expect(session.getSnapshot()).toMatchObject({ phase: 'waiting', failure: null });
    });

    it('takes nothing of a thrown error\'s sentence into the facts, and keeps it whole in the report\'s timeline', async () => {
        auth.startLogin.mockRejectedValueOnce(new Error("EPERM: open 'C:\\Users\\Zhang San\\AppData\\Roaming\\Folia\\token'"));
        const session = createSession();
        await session.start('netease').settled;
        expect(JSON.stringify(session.getSnapshot().failure)).not.toMatch(/Zhang|AppData/);
        const report = await session.buildDiagnosticReport();
        expect(report).toMatch(/start:error name=Error message=".*Zhang San.*AppData.*token'"/);
    });

    it('ends a check that throws with its timers gone, whatever the error names', async () => {
        const error = new Error('boom');
        noteLoginFailure(error, { case: 'not-authorized' });
        auth.checkLogin.mockRejectedValueOnce(error);
        const session = createSession();
        await session.start('spotify').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().failure).toMatchObject({ case: { id: 'not-authorized' } });
        expect(manual.pendingTimers()).toBe(0);
    });
});

// ─── 串行开始、瞬时失败与自检 ────────────────────────────────────────────

describe('providerLoginSession · serial starts, transient checks and the self-check', () => {
    it('sends only the latest of several quick starts, after the one already in flight settles', async () => {
        const first = deferred<{ key: string; imageUrl: string }>();
        auth.startLogin.mockReturnValueOnce(first.promise).mockResolvedValue({ key: 'qr-key-3', imageUrl: 'qr-3.png' });
        const session = createSession();
        session.start('qq');
        session.start('qq');
        const last = session.start('qq');
        await manual.flush();
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
        first.resolve({ key: 'qr-key-1', imageUrl: 'qr-1.png' });
        await last.settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(2);
        expect(auth.cancelLogin).toHaveBeenCalledExactlyOnceWith('qq', 'qr-key-1');
        expect(session.getSnapshot().codeImage).toBe('qr-3.png');
    });

    it('waits for a failed request too, and a stop while waiting sends nothing', async () => {
        const first = deferred<{ key: string; imageUrl: string }>();
        auth.startLogin.mockReturnValueOnce(first.promise);
        const session = createSession();
        session.start('qq');
        const second = session.start('qq');
        session.stop();
        first.reject(new Error('409 session-busy'));
        await second.settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
    });

    it('keeps checking through transient network failures while the code is still valid', async () => {
        auth.checkLogin
            .mockResolvedValueOnce({ state: 'error', transient: true, failure: { httpStatus: 502 } } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'error', transient: true, failure: { httpStatus: 502 } } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'scanned' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(2); // 原为 advance(POLL * 2)
        expect(session.getSnapshot()).toMatchObject({ phase: 'waiting', failure: null });
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot().phase).toBe('scanned');
        expect(log.mock.calls.filter(([, event]) => event === 'poll:retry')).toHaveLength(2);
    });

    it('[A] 429 with a 502 predecessor is the adapter own backoff: no automatic retry, hand over to the user', async () => {
        auth.checkLogin
            .mockResolvedValueOnce({ state: 'error', transient: true, failure: { httpStatus: 502 } } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'error', failure: { httpStatus: 429, retryAfterMs: 5_000 } } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll();
        await advanceToNextPoll();
        // 502 之后的那次重试，间隔由退避决定（≥2000ms），所以「502 前驱」不能按时间窗口判。
        expect(auth.checkLogin).toHaveBeenCalledTimes(2);
        expect(session.getSnapshot()).toMatchObject({ phase: 'error', failureKind: 'check-error' });
        expect(manual.pendingTimers()).toBe(0);
        const rateLimited = log.mock.calls.filter(([, event]) => event === 'poll:rate-limited');
        expect(rateLimited).toHaveLength(1);
        expect(rateLimited[0][2]).toMatchObject({ has502Predecessor: true, autoRetrySkipped: true });
    });

    it('[A] 429 without a 502 predecessor is upstream throttling: still retried with backoff', async () => {
        auth.checkLogin
            .mockResolvedValueOnce({ state: 'error', failure: { httpStatus: 429, retryAfterMs: 1_000 } } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'waiting' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll();
        const first = log.mock.calls.filter(([, event]) => event === 'poll:rate-limited');
        expect(first).toHaveLength(1);
        expect(first[0][2]).toMatchObject({ has502Predecessor: false });
        expect(first[0][2]).not.toHaveProperty('autoRetrySkipped');
        await advanceToNextPoll();
        expect(auth.checkLogin).toHaveBeenCalledTimes(2);
        expect(session.getSnapshot().phase).toBe('waiting');
    });

    it('[A] a 502 is forgotten once a normal poll happens, so a later 429 is not mistaken for the adapter backoff', async () => {
        auth.checkLogin
            .mockResolvedValueOnce({ state: 'error', transient: true, failure: { httpStatus: 502 } } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'waiting' } satisfies LoginState)
            .mockResolvedValueOnce({ state: 'error', failure: { httpStatus: 429, retryAfterMs: 1_000 } } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(2);
        await advanceToNextPoll();
        const rateLimited = log.mock.calls.filter(([, event]) => event === 'poll:rate-limited');
        expect(rateLimited).toHaveLength(1);
        expect(rateLimited[0][2]).toMatchObject({ has502Predecessor: false });
    });

    it('fails once the transient failures exceed the limit, and counts only consecutive ones', async () => {
        const transient = { state: 'error', transient: true, failure: { httpStatus: 502 } } satisfies LoginState;
        auth.checkLogin
            .mockResolvedValueOnce(transient)
            .mockResolvedValueOnce({ state: 'waiting' } satisfies LoginState)
            .mockResolvedValueOnce(transient)
            .mockResolvedValueOnce(transient)
            .mockResolvedValueOnce(transient);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(4); // 原为 advance(POLL * 4)：旧期望基于固定 2000ms
        expect(session.getSnapshot().phase).toBe('waiting');
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(session.getSnapshot()).toMatchObject({ phase: 'error', failureKind: 'check-error', failure: { case: { id: 'unreachable' } } });
    });

    it('runs the self-check after a failure and keeps its verdict in the snapshot and the report', async () => {
        const result: LoginSelfCheckResult = {
            providerId: 'netease', runtime: 'electron', startedAt: 0, durationMs: 120,
            backend: { status: 'error', port: null, error: 'listen EADDRINUSE', probe: null },
            proxy: null, hosts: [],
        };
        const check = deferred<LoginSelfCheckResult | null>();
        auth.canRunLoginSelfCheck.mockReturnValue(true);
        auth.runLoginSelfCheck.mockReturnValueOnce(check.promise);
        auth.startLogin.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
        const session = createSession();
        await session.start('netease').settled;
        expect(session.getSnapshot().selfCheck).toEqual({ status: 'running' });
        check.resolve(result);
        await manual.flush();
        expect(session.getSnapshot().selfCheck).toMatchObject({ status: 'done', verdict: { kind: 'backend-down' } });
        const report = await session.buildDiagnosticReport();
        expect(report).toContain('self-check: electron, 120ms');
        expect(report).toContain('verdict: backend-down');
    });

    it('does not run a self-check when a code nobody scanned simply expired', async () => {
        auth.canRunLoginSelfCheck.mockReturnValue(true);
        auth.checkLogin.mockResolvedValueOnce({ state: 'expired' } satisfies LoginState);
        const session = createSession();
        await session.start('netease').settled;
        await advanceToNextPoll(); // 原为 advance(POLL)：旧期望基于固定 2000ms
        expect(auth.runLoginSelfCheck).not.toHaveBeenCalled();
        expect(session.getSnapshot().selfCheck).toBeNull();
    });

    it('still runs the self-check when the front-end lifetime ends a scanned code', async () => {
        auth.canRunLoginSelfCheck.mockReturnValue(true);
        auth.checkLogin.mockResolvedValue({ state: 'scanned' } satisfies LoginState);
        const session = createSession();
        await session.start('qq').settled;
        await manual.advance(QR_TTL_MS);
        expect(session.getSnapshot()).toMatchObject({ failureKind: 'expired-after-scan' });
        expect(auth.runLoginSelfCheck).toHaveBeenCalledTimes(1);
    });

    it('drops a self-check result that arrives after a new start', async () => {
        const check = deferred<LoginSelfCheckResult | null>();
        auth.canRunLoginSelfCheck.mockReturnValue(true);
        auth.runLoginSelfCheck.mockReturnValueOnce(check.promise);
        auth.startLogin.mockRejectedValueOnce(new Error('down'));
        const session = createSession();
        await session.start('netease').settled;
        await session.start('netease').settled;
        check.resolve({ providerId: 'netease', runtime: 'web', startedAt: 0, durationMs: 1, backend: null, proxy: null, hosts: [] });
        await manual.flush();
        expect(session.getSnapshot().selfCheck).toBeNull();
    });

    it('waits for a running self-check before building the report, and records a self-check that failed', async () => {
        const check = deferred<LoginSelfCheckResult | null>();
        auth.canRunLoginSelfCheck.mockReturnValue(true);
        auth.runLoginSelfCheck.mockReturnValueOnce(check.promise);
        auth.startLogin.mockRejectedValueOnce(new Error('down'));
        const session = createSession();
        await session.start('netease').settled;
        const report = session.buildDiagnosticReport();
        check.reject(new Error('IPC channel closed'));
        await expect(report).resolves.toContain('self-check: failed (IPC channel closed)');
        expect(session.getSnapshot().selfCheck).toEqual({ status: 'failed', message: 'IPC channel closed' });
    });
});

describe('providerLoginSession · visibility pause must not eat the poll budget (audit P1)', () => {
    it('keeps polling after the tab stayed hidden longer than the whole budget', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        auth.checkLogin.mockResolvedValue({ state: 'waiting' } satisfies LoginState);
        const vis = createFakeVisibility();
        const session = createSession({ visibility: vis.port });
        await session.start('netease').settled;
        await advanceToNextPoll();
        expect(auth.checkLogin).toHaveBeenCalledTimes(1);

        // 用户切走 100 秒 —— 超过 90s 总预算，但期间一个请求都没发。
        vis.set(true);
        await manual.advance(100_000);
        vis.set(false);
        await manual.flush();

        // 恢复后必须继续自动轮询：后台那段墙钟不能算进预算。
        await advanceToNextPoll();
        expect(auth.checkLogin).toHaveBeenCalledTimes(2);
        expect(log.mock.calls.some(([, event]) => event === 'poll:budget-exhausted')).toBe(false);
    });

    it('still stops when the active polling time itself exceeds the budget', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        auth.checkLogin.mockResolvedValue({ state: 'waiting' } satisfies LoginState);
        const vis = createFakeVisibility();
        const session = createSession({ visibility: vis.port });
        await session.start('netease').settled;
        await advanceToNextPoll(20);
        expect(log.mock.calls.some(([, event]) => event === 'poll:budget-exhausted')).toBe(true);
    });

    it('does not expire a scanned code while the tab is hidden (client-side inference needs polling)', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        auth.checkLogin.mockResolvedValue({ state: 'scanned' } satisfies LoginState);
        const vis = createFakeVisibility();
        const session = createSession({ visibility: vis.port });
        await session.start('netease').settled;
        await advanceToNextPoll();
        expect(session.getSnapshot().phase).toBe('scanned');

        // 后台待 61 秒：超过「已扫码 60 秒」的客户端推断时限。
        // 但这段时间我们一个请求都没发，根本无从知道用户有没有在手机上确认，
        // 因此不能据此判死 —— 更不能顺手把后端会话取消掉。
        vis.set(true);
        await manual.advance(61_000);
        vis.set(false);
        await manual.flush();
        expect(session.getSnapshot().phase).toBe('scanned');
        expect(auth.cancelLogin).not.toHaveBeenCalled();
    });

    it('unsubscribes from visibility when the session is disposed', () => {
        const vis = createFakeVisibility();
        const session = createSession({ visibility: vis.port });
        expect(vis.listenerCount()).toBe(1);
        session.dispose();
        expect(vis.listenerCount()).toBe(0);
    });
});

describe('providerLoginSession · Q0: one sign-in turn must not generate extra codes (A-41 ④)', () => {
    // Q0 的口径：**一个登录周转内**（从用户点登录到会话结束）生成的二维码数量。
    // 每次生成 = login_qr_key + login_qr_create = 2 次上游调用，直接换成 429 风险。
    // 目标：正常路径 = 1；已被治理的浪费路径（关窗重开、多标签）= 0 增量。
    const codesGenerated = () => auth.startLogin.mock.calls.length;

    it('generates exactly one code for a normal sign-in', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        expect(codesGenerated()).toBe(1);
    });

    it('adds no extra code when the window is closed and reopened within the lifetime', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        session.stop({ cancelSession: false });
        await session.start('netease').settled;
        session.stop({ cancelSession: false });
        await session.start('netease').settled;
        // 三次开关窗口，仍然只有第一张码：复用生效。
        expect(codesGenerated()).toBe(1);
        expect(log.mock.calls.filter(([, event]) => event === 'poll:qr-reused').length).toBe(2);
    });

    it('generates exactly one code even when a smaller id asks after we already took one (FCFS)', async () => {
        // 这是 C 的取证场景：A 先到并取码，B 后到但 instanceId 更小。
        // ID 排序下 B 会抢走 leadership 再取一次码（qrGenerations = 2）；
        // FCFS 下 B 必须让位（qrGenerations = 1）—— 上游只被打一次。
        auth.getLoginTtlMs.mockReturnValue(175_000);
        const lease = createLeaseStorage();
        const first = createSession({ leaderLock: lease.storage, instanceId: 'inst-mmm' });
        const ticketFirst = first.start('netease');
        await manual.advance(200);
        await ticketFirst.settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(1);

        // 后到者 ID 更小：FCFS 下不能抢走。
        const second = createSession({ leaderLock: lease.storage, instanceId: 'inst-aaa' });
        const ticketSecond = second.start('netease');
        await manual.advance(400);
        expect(auth.startLogin).toHaveBeenCalledTimes(1);

        first.stop();
        second.stop();
        expect(ticketSecond).toBeTruthy();
    });
    it('adds no extra code when a second tab asks while the first holds the lease', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        const lease = createLeaseStorage();
        const first = createSession({ leaderLock: lease.storage, instanceId: 'inst-a' });
        const ticketFirst = first.start('netease');
        await manual.advance(200);
        await ticketFirst.settled;
        expect(codesGenerated()).toBe(1);

        // 第二个标签拿不到租约：它一张码都不该生成。
        const second = createSession({ leaderLock: lease.storage, instanceId: 'inst-b' });
        const ticketSecond = second.start('netease');
        await manual.advance(400);
        expect(codesGenerated()).toBe(1);
        first.stop();
        second.stop();
        expect(ticketSecond).toBeTruthy();
    });

    it('generates a fresh code only when the previous one is genuinely unusable', async () => {
        auth.getLoginTtlMs.mockReturnValue(60_000);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        session.stop({ cancelSession: false });
        // 过了有效期：必须重新取码（不能为了 Q0 而让用户扫一张死码）。
        await manual.advance(60_001);
        await session.start('netease').settled;
        expect(codesGenerated()).toBe(2);
    });
});
describe('providerLoginSession · cross-tab lease release: pagehide first, TTL as backstop', () => {
    it('hands the lease over immediately when the page is hidden, without waiting for the TTL', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        const lease = createLeaseStorage();
        const pageHide = createFakePageHide();
        const a = createSession({ leaderLock: lease.storage, instanceId: 'inst-a', pageHide: pageHide.port });
        const ticketA = a.start('netease');
        await manual.advance(200);
        await ticketA.settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(1);

        // 正常刷新/关标签：pagehide 触发，立刻让出租约（不依赖 TTL）。
        pageHide.fire();
        expect(lease.raw.size).toBe(0);

        const b = createSession({ leaderLock: lease.storage, instanceId: 'inst-b', pageHide: pageHide.port });
        const ticketB = b.start('netease');
        await manual.advance(200); // 只够越过静默期，远小于 5s 租约
        await ticketB.settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(2);
    });

    it('does not hand over when pagehide never fires: the lease must expire first', async () => {
        auth.getLoginTtlMs.mockReturnValue(175_000);
        const lease = createLeaseStorage();
        const pageHide = createFakePageHide(); // 模拟被强杀：回调永不触发
        const a = createSession({ leaderLock: lease.storage, instanceId: 'inst-a', pageHide: pageHide.port });
        const ticketA = a.start('netease');
        await manual.advance(200);
        await ticketA.settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(1);

        const b = createSession({ leaderLock: lease.storage, instanceId: 'inst-b', pageHide: pageHide.port });
        const ticketB = b.start('netease');
        await manual.advance(200);
        // A 的候选还活着（它的心跳在续租）：B 只能等，不能取码 —— 这证明释放不是自动发生的。
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
        expect(lease.raw.size).toBeGreaterThan(0);
        expect(ticketB).toBeTruthy();

        // 收尾：停掉两个会话，避免心跳定时器留给后续用例。
        a.stop();
        b.stop();
        // 说明：「租约到期后接管」由 loginLeaderLease.test.ts 的
        // 'lets a follower take over once the leader stops renewing' 单独覆盖 ——
        // 那一层能精确模拟「心跳停止」，这里两个 session 共享同一个假时钟，做不到。
    });
});

describe('loginQrCache · clearing a provider wipes every method but nothing else (audit P2-2)', () => {
    /** 生产用的 sessionStorage 支持枚举；假存储不带 length/key 时会走降级分支，那条路之前零覆盖。 */
    const createEnumerableStorage = () => {
        const data = new Map<string, string>();
        const storage: LoginQrCacheStorage = {
            getItem: key => data.get(key) ?? null,
            setItem: (key, value) => { data.set(key, value); },
            removeItem: key => { data.delete(key); },
            get length() { return data.size; },
            key: index => [...data.keys()][index] ?? null,
        };
        return { storage, raw: data };
    };
    const entry = (key: string) => ({ key, qrImage: 'img', ttlMs: 60_000, lastState: 'waiting' });
    const now = 1_700_000_000_000;

    it('removes every method of one provider and leaves other providers alone', () => {
        const { storage, raw } = createEnumerableStorage();
        writeCachedLoginQr(storage, 'qq', 'qq', entry('k1'), now);
        writeCachedLoginQr(storage, 'qq', 'wechat', entry('k2'), now);
        writeCachedLoginQr(storage, 'netease', null, entry('k3'), now);
        expect(raw.size).toBe(3);

        clearCachedLoginQr(storage, 'qq');

        expect(raw.has(loginQrCacheKey('qq', 'qq'))).toBe(false);
        expect(raw.has(loginQrCacheKey('qq', 'wechat'))).toBe(false);
        expect(raw.has(loginQrCacheKey('netease'))).toBe(true);
        expect(readCachedLoginQr(storage, 'netease', null, now)?.key).toBe('k3');
    });

    it('does not touch a provider whose id merely starts with the same letters', () => {
        const { storage, raw } = createEnumerableStorage();
        writeCachedLoginQr(storage, 'qq', 'qq', entry('k1'), now);
        writeCachedLoginQr(storage, 'qq2', 'qq', entry('k2'), now);

        clearCachedLoginQr(storage, 'qq');

        expect(raw.has(loginQrCacheKey('qq', 'qq'))).toBe(false);
        // 前缀带尾冒号，所以 'qq' 不会误伤 'qq2'。
        expect(raw.has(loginQrCacheKey('qq2', 'qq'))).toBe(true);
    });
});

describe('providerLoginSession · QR reuse within one tab (task-8 batch 3)', () => {
    const entryOf = (providerId: string): Record<string, unknown> => {
        // 键结构由产品代码定义（v2 起含 methodId），测试不硬编码命名空间。
        const raw = qrCache!.raw.get(loginQrCacheKey(providerId));
        expect(raw).toBeTruthy();
        return JSON.parse(raw!) as Record<string, unknown>;
    };

    it('reuses a still-valid code after the window is closed instead of asking upstream again', async () => {
        auth.getLoginTtlMs.mockReturnValue(60_000);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
        session.stop({ cancelSession: false });
        await session.start('netease').settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
        expect(log.mock.calls.some(([, event]) => event === 'poll:qr-reused')).toBe(true);
    });

    it('asks upstream again once the cached code has expired, so the cache never freezes sign-in', async () => {
        auth.getLoginTtlMs.mockReturnValue(60_000);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        session.stop({ cancelSession: false });
        await manual.advance(60_001);
        await session.start('netease').settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(2);
    });

    it('stores only the whitelisted fields and never anything that looks like a credential', async () => {
        auth.getLoginTtlMs.mockReturnValue(60_000);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        const entry = entryOf('netease');
        expect(Object.keys(entry).sort()).toEqual([...LOGIN_QR_CACHE_FIELDS].sort());
        expect(JSON.stringify(entry)).not.toMatch(/(cookie|token|session|authorization)/i);
    });

    it('does not use the cache for platforms that confirm in the browser and have no code', async () => {
        inBrowser();
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
        session.stop({ cancelSession: false });
        await session.start('netease').settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(2);
        expect(log.mock.calls.some(([, event]) => event === 'poll:qr-reused')).toBe(false);
    });

    it('does not reuse a code that has already been scanned: upstream has consumed it', async () => {
        auth.getLoginTtlMs.mockReturnValue(60_000);
        auth.checkLogin.mockResolvedValue({ state: 'scanned' } satisfies LoginState);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        await advanceToNextPoll();
        expect(auth.startLogin).toHaveBeenCalledTimes(1);
        session.stop({ cancelSession: false });
        // 扫过的码不能再复用：必须重新取一张。
        await session.start('netease').settled;
        expect(auth.startLogin).toHaveBeenCalledTimes(2);
    });

    it('keeps the original createdAt on reuse, so the lifetime cannot be extended forever', async () => {
        auth.getLoginTtlMs.mockReturnValue(60_000);
        const session = createSession({ qrCache: qrCache!.storage });
        await session.start('netease').settled;
        const first = entryOf('netease');
        session.stop({ cancelSession: false });
        await manual.advance(10_000);
        await session.start('netease').settled;
        const second = entryOf('netease');
        expect(second.createdAt).toBe(first.createdAt);
    });
});

