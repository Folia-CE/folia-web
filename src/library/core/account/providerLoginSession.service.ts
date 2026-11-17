import type { LoginFailureKind, LoginState, LoginStep, OnlineProviderId } from '../../../types/onlineMusic';
import type { LoginFailure } from '../../../types/loginFailure';
import type {
    LibraryAccountAuthPort,
    LibraryAccountClock,
    LibraryAccountPageHide,
    LibraryAccountVisibility,
    LibraryAccountLogger,
    LibraryLoginDiagnosticsEnvironment,
    LibraryLoginSelfCheck,
    LibraryTimerHandle,
} from './account.contract';
import { describeLoginError } from './accountRules';
import { resolveLoginSelfCheckVerdict } from './loginSelfCheckRules';
import { loginCaseOf, loginFailureFacts } from '../../../services/onlineMusic/login/loginFailureCase';
import {
    formatLoginDiagnosticReport,
    LOGIN_TIMELINE_LIMIT,
    type LoginTimelineEvent,
} from '../../../services/onlineMusic/login/loginDiagnosticReport';
import {
    browserLeaderLockStorage,
    canCoordinate,
    holdsLeaderLease,
    LOGIN_LEADER_HEARTBEAT_MS,
    LOGIN_LEADER_MAX_WAIT_MS,
    LOGIN_LEADER_RETRY_MS,
    LOGIN_LEADER_SETTLE_MS,
    pageLoginInstanceId,
    publishLeaderCandidate,
    releaseLeaderLease,
    type LoginLeaderLockStorage,
} from './loginLeaderLease';
import {
    browserQrCacheStorage,
    clearCachedLoginQr,
    LOGIN_QR_CACHE_DEFAULT_TTL_MS,
    readCachedLoginQr,
    touchCachedLoginQrState,
    writeCachedLoginQr,
    type LoginQrCacheStorage,
} from './loginQrCache';
import {
    nextPollDelayMs,
    pollBudgetExhausted,
} from './loginPollBackoff';

// src/library/core/account/providerLoginSession.service.ts
// 一次登录（扫码，或者在浏览器里确认）从开始到结束，按固定的几步走，每一步都进时间线（同一条记录经日志端口打出）：
//   1. 能力判定：provider 没有 auth 能力就直接失败；
//   2. 开始：等上一轮的开始请求结算后才发（后端同一时间只允许一个码在建会话，并发的会被拒 409），等待期间又被
//      取代就不发；拿到 key 时已被取代，就把这把 key keyed 归还；
//   3. 就绪：显示二维码；在浏览器里确认的当场打开登录的页面（provider 自己打开的除外，打不开说是一种情况，登录接着等）；
//      声明了有效期的 provider 由前端计时（到期先停轮询并 keyed 取消，再报「已过期」）；
//   4. 轮询：上一次结算后 2 秒才发下一次，不会重叠。网络层的瞬时失败（transient，码在平台那边仍有效）连续
//      PROVIDER_LOGIN_TRANSIENT_POLL_LIMIT 次以内照常接着轮询，超过才算失败。扫过码、停在已扫码一分钟还没确认，
//      就当这一次没有确认、到期结束（平台不一定会自己报过期）；回到等待扫码就重新算；
//   5. 确认：会话已换成登录凭据，不再取消（后端要让在途轮询继续读到确认）；确认回调（读账号）返回 false
//      记为 account-refresh-failed；
//   6. 失败：停掉计时器，按事实分出是哪一种情况（services/onlineMusic/login/loginFailureCase），然后自动跑一次
//      主动自检（没扫码就过期的除外），结论放进快照，界面据此说明卡在哪一层。
// 代次：每次 start / stop / 到期都前进，每个 await 之后先验代次，晚到的结果作废。
// 时间线与日志里记平台的原话和抛出的错的那句话（原文）：报告会被原样贴进公开的 issue，界面已告知用户其中有哪些数据。
// 无 React、无 window、不直接碰 omni：auth 端口、时钟、诊断环境与日志出口都由调用方注入。

/** 两次轮询之间的间隔（上一个请求结算之后才开始计）。 */
export const PROVIDER_LOGIN_POLL_INTERVAL_MS = 2000;

/** 轮询连续遇到网络层瞬时失败时容忍的次数；超过才算登录失败。 */
export const PROVIDER_LOGIN_TRANSIENT_POLL_LIMIT = 2;

/**
 * 429（平台限流）最多自动退避重试几次，之后转手动。
 * 与 `PROVIDER_LOGIN_TRANSIENT_POLL_LIMIT` 是**两套独立机制、各自计数、不相加**：
 * transient 管「check 请求本身瞬时失败」，本常量管「平台明确说要等（429）」。
 * 所以不存在「2+3=5 是全局上限」这回事；真正的总闸看下面两个：
 * `PROVIDER_LOGIN_AUTO_POLL_LIMIT`（单轮自动请求总数）与 `LOGIN_POLL_TOTAL_BUDGET_MS`（90s 时长）。
 */
export const PROVIDER_LOGIN_RATE_LIMIT_RETRIES = 3;

/**
 * 判断「429 是不是适配层自产退避」的观察窗口：429 之前这么多毫秒内出现过 502，就认为它属于 B 型
 * （502 = 装置注册 / 建码失败，随后按设计转 429），此时客户端再自动重试只是在既有退避上再叠一层。
 */

/**
 * 单轮登录里「因失败而重排」的自动请求总次数上限，到顶转手动。
 * 只数失败重试，不数正常等待扫码的轮询——否则会把正常等待打断。
 */
export const PROVIDER_LOGIN_AUTO_POLL_LIMIT = 5;

/**
 * 扫过码、停在已扫码这么久还没有确认，就当这一次没有确认、到期结束。平台不一定会自己报过期：2026-10-16
 * 的日志里，扫码之后平台一直回「已扫码」，3 分 46 秒里没有一次过期；确认只用了 2 秒。
 */
export const PROVIDER_LOGIN_SCANNED_LIMIT_MS = 60_000;

/** 生成诊断报告时最多等还在跑的自检多久（自检的每一项都有自己的超时，正常十秒内结束）。 */
const SELF_CHECK_REPORT_WAIT_MS = 15_000;

/** idle：还没开始过；loading：正在开始；其余是平台报的状态。 */
export type ProviderLoginSessionPhase = 'idle' | 'loading' | LoginState['state'];

/** 会话的原始状态。没有变化时保持对象身份（useSyncExternalStore 友好）。 */
export type ProviderLoginSessionSnapshot = Readonly<{
    /** 最近一次 start 领到的会话 id（每次开始都换新）；从没 start 过为 0。 */
    sessionId: number;
    /** 最近一次 start 的 provider；从没 start 过为 null。 */
    providerId: OnlineProviderId | null;
    methodId: string | null;
    phase: ProviderLoginSessionPhase;
    /** 在浏览器里确认的登录。 */
    inBrowser: boolean;
    /** 二维码图片地址；还没拿到、或者在浏览器里确认时为空串。 */
    codeImage: string;
    /** 这一次登录的页面能不能再打开一次（provider 自己打开的不能）。 */
    canReopenLoginPage: boolean;
    /** 诊断报告 `failure:` 那一行的形态；没扫就过期、auth 能力缺失都不算，为 null。 */
    failureKind: LoginFailureKind | null;
    /** 这一次为什么没有成功（见 contracts/account 的 LibraryLoginSessionSnapshot.failure）。 */
    failure: LoginFailure | null;
    /** 失败后的主动自检；没有失败或不需要自检时为 null。 */
    selfCheck: LibraryLoginSelfCheck | null;
}>;

/** 登录确认时交给确认回调的事件。 */
export type ProviderLoginConfirmedEvent = {
    sessionId: number;
    providerId: OnlineProviderId;
    methodId: string | null;
};

/**
 * 确认回调：确认后调用，用来读账号。resolve `false` 表示确认了却没拿到登录态，会话回到 error +
 * account-refresh-failed（没读到账号）；其余返回值都算完成。回调结算时会话代次已经变了（再次 start / stop），
 * 结果被丢弃。回调抛错也是没读到账号（报告里记为 check-error）。
 */
export type ProviderLoginConfirmedHandler = (
    event: ProviderLoginConfirmedEvent,
) => Promise<boolean | void> | boolean | void;

export type ProviderLoginSessionDeps = {
    auth: LibraryAccountAuthPort;
    clock: LibraryAccountClock;
    diagnostics: LibraryLoginDiagnosticsEnvironment;
    /** 省略时打到 console（前缀 [ProviderLogin]）。 */
    log?: LibraryAccountLogger;
    /** 省略时确认即完成（phase 停在 confirmed）。 */
    onConfirmed?: ProviderLoginConfirmedHandler;
    /** 抖动用的随机源。省略时用 Math.random；测试注入定值让时序可预测。 */
    random?: () => number;
    /**
     * 二维码复用缓存（只存 key/qrImage/ttlMs/lastState/createdAt，绝不存凭据）。
     * 省略时用浏览器 sessionStorage；显式传 null 可关掉复用（测试用）。
     */
    qrCache?: LoginQrCacheStorage | null;
    /**
     * 页面可见性。省略时当作一直可见。
     * 后台标签页里不再自动轮询，回到前台按原来的绝对 deadline 从剩余退避继续（不重置）。
     */
    visibility?: LibraryAccountVisibility;
    /**
     * 跨标签租约锁（必须是 localStorage 这类跨标签可见的介质）。
     * **同一把锁同时承担 leader 选举与 single-flight**：只有持有它的标签才能取码，
     * 两套锁并存时并发仍会各生成一张码。省略时用浏览器 localStorage；显式 null 表示不跨标签协调。
     */
    leaderLock?: LoginLeaderLockStorage | null;
    /**
     * 页面退出端口：**只用于加速释放租约**（正常刷新/关标签时让位），
     * 正确性由租约到期兜底——崩溃/强杀不触发它。省略时不做加速释放。
     */
    pageHide?: LibraryAccountPageHide;
    /** 随机实例 ID（只区分标签，不含账号信息）。省略时取页面级单例。测试可注入定值。 */
    instanceId?: string;
};

/**
 * start 的回执：sessionId 同步可得（会话已经进入 loading）；settled 在开始请求结算后 resolve
 * （拿到二维码或开始了浏览器登录、失败或被取代），之后的进度只在快照里。
 */
export type ProviderLoginStartTicket = {
    sessionId: number;
    settled: Promise<void>;
};

export interface ProviderLoginSession {
    getSnapshot(): ProviderLoginSessionSnapshot;
    subscribe(listener: () => void): () => void;
    /**
     * 停掉上一轮（keyed 取消它的会话），换新的会话 id 并开始。methodId 是 provider 声明的登录方式；
     * 不传由 provider 取默认值。
     */
    start(providerId: OnlineProviderId, methodId?: string): ProviderLoginStartTicket;
    /**
     * 停轮询、清计时器、不再给还在计时的登录请求计时、keyed 取消当前会话（确认后的会话不取消）。
     * 不改阶段；只在等的时候才成立的那一种情况（浏览器没有打开）随之清掉。
     */
    /**
     * 停轮询、清计时器、不再给在途的登录请求计时。
     * `cancelSession: false` 时**不**向后端发 keyed 取消：关登录窗走这条（服务端会让未扫过的旧码被下一次登录接管，
     * 见 deploy/docker/README.md:106、qq-api/README.md:190-195）。显式退出登录不在本服务里，它走自己的退场路径。
     */
    stop(options?: { cancelSession?: boolean }): void;
    /** 在浏览器里确认的登录：再打开一次登录的页面。回 false 表示没打开（或者此刻不能打开）。 */
    openLoginPage(): Promise<boolean>;
    /** 本轮时间线 + 自检 + provider 诊断；从没 start 过时为 null。自检还在跑时先等它（有上限）。 */
    buildDiagnosticReport(): Promise<string | null>;
    /** stop 并放掉全部订阅；之后的 start 不再生效。 */
    dispose(): void;
}

/** 默认日志出口。 */
export const consoleProviderLoginLogger: LibraryAccountLogger = (level, event, detail) => {
    console[level](`[ProviderLogin] ${event}`, detail);
};

// 记住活跃会话归谁：keyed 取消必须向开始会话的 provider 发，只存 key 就不知道该向谁取消。
type ActiveLoginSession = { providerId: OnlineProviderId; key: string };
type ScheduledTimer = { handle: LibraryTimerHandle };
/**
 * 一轮登录自己的进度（不进快照）：扫过没有、轮询了几次、连续瞬时失败几次、还在不在等结果
 * （会话建好之后是 true，读到确认、过期、出错，或者被停下之后是 false：浏览器打不开只在这段时间里算一种情况）。
 */
type RoundState = {
    sessionId: number;
    providerId: OnlineProviderId;
    methodId: string | undefined;
    inBrowser: boolean;
    scanned: boolean;
    polls: number;
    transientFailures: number;
    awaiting: boolean;
    /** 这是第几次自动轮询（退避序列的下标，手动触发不计入）。 */
    backoffAttempt: number;
    /** 上一次实际用的间隔，用来保证抖动之后不倒退。 */
    lastPollDelayMs: number;
    /** 自动轮询的起点，用于 90s 总预算。 */
    pollStartedAt: number;
    /** 已经因为 429 / retryAfterMs 退避重试过几次。 */
    rateLimitRetries: number;
    /** 这一轮已经自动排过多少次轮询：单轮总闸，防止两种失败机制交错时次数失控。 */
    autoRetries: number;
        /**
     * 上一轮轮询的结果是不是 502。**每一轮 poll 结果都会重算**：任何非 502 的结果都会把它清零，
     * 所以它表达的是「紧接在上一轮 502 之后」这个状态，不要实现成「只在 429 分支清」。
     * 判断 429 属于哪一型靠它，**不能按时间窗口判**：
     * 502 之后走的是退避重试，下一次 poll 至少 2000ms 后才发生（序列首项，还可能叠加 retryAfterMs），
     * 任何「几百毫秒内」的时间窗都恒为 false，扫不出样本。B 型的本质是「紧接在一次 502 之后」，是状态不是时间差。
     */
    lastPollWas502: boolean;
};

const INITIAL_SNAPSHOT: ProviderLoginSessionSnapshot = Object.freeze({
    sessionId: 0,
    providerId: null,
    methodId: null,
    phase: 'idle',
    inBrowser: false,
    codeImage: '',
    canReopenLoginPage: true,
    failureKind: null,
    failure: null,
    selfCheck: null,
});

const sameSnapshot = (a: ProviderLoginSessionSnapshot, b: ProviderLoginSessionSnapshot): boolean => (
    a.sessionId === b.sessionId
    && a.providerId === b.providerId
    && a.methodId === b.methodId
    && a.phase === b.phase
    && a.inBrowser === b.inBrowser
    && a.codeImage === b.codeImage
    && a.canReopenLoginPage === b.canReopenLoginPage
    && a.failureKind === b.failureKind
    && a.failure === b.failure
    && a.selfCheck === b.selfCheck
);

// 轮询报 error 时进时间线的字段：平台的原话、是否瞬时、平台说的码与 HTTP 状态和要求的等待。
const describeErrorState = (result: Extract<LoginState, { state: 'error' }>): Record<string, unknown> => ({
    message: result.message,
    transient: result.transient,
    httpStatus: result.failure?.httpStatus,
    retryAfterMs: result.failure?.retryAfterMs,
});

// provider 不在了（例如 mod 源刚被关掉）时问它的同步问题会抛错：当它说「不」。
const askSafely = (ask: () => boolean): boolean => {
    try {
        return ask();
    } catch {
        return false;
    }
};

/** 建一个登录会话；同一时间只有一轮在跑，再次 start 会先停掉上一轮。 */
// 没有注入可见性端口时当作一直可见：库本身不碰 document。
const ALWAYS_VISIBLE: LibraryAccountVisibility = {
    isHidden: () => false,
    subscribe: () => () => {},
};

export const createProviderLoginSession = (deps: ProviderLoginSessionDeps): ProviderLoginSession => {
    const { auth, clock, diagnostics, onConfirmed } = deps;
    const visibility = deps.visibility ?? ALWAYS_VISIBLE;
    const random = deps.random ?? Math.random;
    const qrCache = deps.qrCache === undefined ? browserQrCacheStorage() : deps.qrCache;
    const leaderLock = deps.leaderLock === undefined ? browserLeaderLockStorage() : deps.leaderLock;
    // 页面级单例：同一标签内多次创建会话复用同一个 ID，否则关窗再开会自己跟自己抢锁。
    const instanceId = deps.instanceId ?? pageLoginInstanceId();
    const log = deps.log ?? consoleProviderLoginLogger;
    const listeners = new Set<() => void>();
    let snapshot = INITIAL_SNAPSHOT;
    // 代次：start / stop / 到期都前进；每个 await 之后先验代次。
    let generation = 0;
    // 最近一轮的时间线：失败时连同自检与 provider 的诊断一起生成报告。只保留一轮，重新开始即清空。
    let timeline: LoginTimelineEvent[] = [];
    let meta: { providerId: OnlineProviderId | null; methodId: string | null; startedAt: number } = {
        providerId: null,
        methodId: null,
        startedAt: 0,
    };
    let checkTimer: ScheduledTimer | null = null;
    // 页面在后台时挂起的下一次轮询：记的是绝对 deadline，回前台按剩余时间继续，不重置退避。
    // hiddenAt：页面转入后台的时刻。恢复时用它把「后台待着的这段墙钟」从 90s 总预算里扣掉，
    // 否则后台暂停期间也会消耗预算（零请求却在掉额度），恢复后可能一次都不再自动轮询。
    let pausedPoll: { round: RoundState; key: string; deadline: number; hiddenAt: number } | null = null;
    // 已经排上队的下一次轮询的绝对 deadline：页面在后台时用它把计时器换成挂起。
    let checkDeadline: number | null = null;
    let checkKey: string | null = null;
    let heartbeatTimer: ScheduledTimer | null = null;
    let ttlTimer: ScheduledTimer | null = null;
    let scannedTimer: ScheduledTimer | null = null;
    let activeSession: ActiveLoginSession | null = null;
    let currentRound: RoundState | null = null;
    // 还在路上的开始请求（不论结果都会结算）。新一轮开始前先等它，同一时间只让一个开始请求到后端。
    let pendingCreate: Promise<void> | null = null;
    // 这一轮还在跑的自检：生成报告时先等它。
    let pendingSelfCheck: { sessionId: number; done: Promise<void> } | null = null;
    let lastLoggedPhase: ProviderLoginSessionPhase = 'idle';
    let disposed = false;

    // 订阅可见性：转入后台挂起、回到前台按剩余 deadline 续上。
    const unsubscribeVisibility = visibility.subscribe(() => {
        if (visibility.isHidden()) suspendPoll();
        else resumePausedPoll();
    });

    // 正常刷新/关标签时立刻让出租约，新页面马上能取码（否则要等租约到期，最长一个 TTL）。
    // 这只是**加速**：被强杀时不触发，正确性仍由租约到期兜底。
    const unsubscribePageHide = deps.pageHide?.subscribe(() => {
        releaseLeaderLease(leaderLock, instanceId);
    });

    const update = (patch: Partial<ProviderLoginSessionSnapshot>): void => {
        const next = { ...snapshot, ...patch };
        if (sameSnapshot(snapshot, next)) return;
        snapshot = next;
        for (const listener of [...listeners]) listener();
    };

    const schedule = (callback: () => void, ms: number): ScheduledTimer => ({ handle: clock.setTimeout(callback, ms) });

    // 页面转入后台：收起所有**依赖前台活动**的计时器，并记下轮询的绝对 deadline（不是扔掉重来）。
    //   · checkTimer：下一次轮询 —— 后台零请求，必须停；
    //   · scannedTimer：「一直看到 scanned 所以确认可能被拒」的**客户端推断**，前提是我们在持续轮询；
    //     后台期间看不到任何状态变化，前提不成立，继续倒计时到点会 expire → stop → 真的把后端会话取消掉。
    //   · ttlTimer **不动**：那是二维码在服务端的**真实过期**（现实时间），与标签页可见性无关；
    //     若把它也暂停，后台待久了会出现「码其实已过期，我们还在让用户扫」。
    // 这里**不记 scannedTimer 的剩余**：恢复后第一次 poll 若仍返回 scanned，
    // 现有逻辑（scannedTimer === null 时重新设 60s）会从「真正再次观察到 scanned」重新起算，比续剩余更准。
    const suspendPoll = (): void => {
        scannedTimer = clearTimer(scannedTimer);
        if (!checkTimer || checkDeadline === null || checkKey === null) return;
        const round = currentRound;
        if (!round) return;
        clearTimer(checkTimer);
        checkTimer = null;
        pausedPoll = { round, key: checkKey, deadline: checkDeadline, hiddenAt: clock.now() };
        note('poll:paused', { remainingMs: Math.max(0, checkDeadline - clock.now()) });
        checkDeadline = null;
        checkKey = null;
    };

    // 回到前台：还有挂起的轮询就按剩余时间续上（剩余已经过了就马上发一次），退避进度不重置。
    const resumePausedPoll = (): void => {
        const paused = pausedPoll;
        if (!paused) return;
        pausedPoll = null;
        if (!isCurrent(paused.round)) return;
        // 把后台这段时间从总预算里扣掉：暂停期间零请求，不应消耗 90s 额度。
        const hiddenMs = Math.max(0, clock.now() - paused.hiddenAt);
        if (hiddenMs > 0) paused.round.pollStartedAt += hiddenMs;
        const remainingMs = Math.max(0, paused.deadline - clock.now());
        note('poll:resume', { remainingMs, polls: paused.round.polls });
        checkTimer = schedule(() => { void poll(paused.round, paused.key); }, remainingMs);
    };

    const clearTimer = (timer: ScheduledTimer | null): null => {
        if (timer) clock.clearTimeout(timer.handle);
        return null;
    };

    const clearRoundTimers = (): void => {
        heartbeatTimer = clearTimer(heartbeatTimer);
        checkTimer = clearTimer(checkTimer);
        ttlTimer = clearTimer(ttlTimer);
        scannedTimer = clearTimer(scannedTimer);
    };

    const isCurrent = (round: RoundState): boolean => round.sessionId === generation;

    // 同一条记录既进时间线，也经日志端口打出（打包版可在开发者设置的日志面板里看到）。
    const note = (event: string, detail: Record<string, unknown> = {}, level: 'info' | 'warn' = 'info'): void => {
        const at = clock.now();
        const entry = { at, event, detail: { ...detail, elapsedMs: at - meta.startedAt } };
        timeline = [...timeline, entry].slice(-LOGIN_TIMELINE_LIMIT);
        log(level, event, { providerId: meta.providerId, ...entry.detail });
    };

    // 一次没有成功的登录：事实、按事实分出的情况、发生的时刻。
    const failureAt = (
        round: RoundState,
        step: LoginStep,
        source?: Parameters<typeof loginFailureFacts>[1],
    ): LoginFailure => {
        const facts = loginFailureFacts({ step, inBrowser: round.inBrowser, scanned: round.scanned }, source);
        return { case: loginCaseOf(facts), facts, at: clock.now() };
    };

    // 取消是 keyed 的，只放掉自己这一把 key；全局清空会在多客户端场景下杀掉别人正在手机上确认的会话。
    // Fire-and-forget：关窗时不该等后端回话，取消失败最多留下一个会自己过期的会话。
    const releaseSession = (session: ActiveLoginSession | null): void => {
        if (!session) return;
        // 如果这张码正是「下一次登录要复用的那张」（同一 provider + 同一登录方式），就**不要**取消它：
        // 取消 = 白烧一次生成，而且复用时会把一张已被服务端作废的码展示给用户。
        const currentMethodId = currentRound?.methodId;
        const reusable = readCachedLoginQr(qrCache, session.providerId, currentMethodId, clock.now());
        if (reusable !== null && reusable.key === session.key) {
            log('info', 'cancel:skipped-reusable', { providerId: session.providerId });
            return;
        }
        // 真要取消：顺手把该方式对应的缓存条目也清掉，免得之后又复用一张已经作废的码。
        clearCachedLoginQr(qrCache, session.providerId, currentMethodId);
        const logCancelError = (error: unknown) => {
            log('warn', 'cancel:error', { providerId: session.providerId, ...describeLoginError(error) });
        };
        try {
            void Promise.resolve(auth.cancelLogin(session.providerId, session.key)).catch(logCancelError);
        } catch (error) {
            logCancelError(error);
        }
    };

    const stop = (options: { cancelSession?: boolean } = {}): void => {
        generation += 1;
        pausedPoll = null;
        clearRoundTimers();
        // 正常停止时主动让出租约（被强杀时走不到这里，由租约到期兜底）。
        releaseLeaderLease(leaderLock, instanceId);
        // 此刻还在计时的登录请求不再计时：没有人等它们的结果了。
        auth.dropRequestLimits();
        // 默认仍然 keyed 取消（重启登录、到期等语义不变）；只有关登录窗明确传 false，才把码留给服务端接管。
        if (options.cancelSession === false) {
            // 计数器：这一次本来会发 /login/qr/cancel，现在不发了。
            // 用途（A-38 (a)）：一周后统计「避免了多少次白烧的取码」，作为关窗不复用这条改动是否真的降量的唯一证据。
            if (activeSession !== null) {
                log('info', 'cancel:skipped-on-close', { providerId: activeSession.providerId });
            }
        } else {
            releaseSession(activeSession);
        }
        activeSession = null;
        if (currentRound) currentRound.awaiting = false;
        // 只在等的时候才成立的那一种情况（浏览器没有打开）随停下清掉；结束了的登录的失败留着。
        if (snapshot.failure?.facts.step === 'open') update({ failure: null });
    };

    // ─── 第 6 步：失败后的主动自检 ─────────────────────────────────────

    // 结果按会话 id 认领（而不是代次）：失败后关窗、到期都会推进代次，但这一轮的结论仍属于这一轮；
    // 只有新的 start 换了会话 id 才作废。
    const runSelfCheck = (sessionId: number, providerId: OnlineProviderId): void => {
        if (!askSafely(() => auth.canRunLoginSelfCheck(providerId))) return;
        update({ selfCheck: { status: 'running' } });
        note('self-check:start');
        const done = (async () => {
            let selfCheck: LibraryLoginSelfCheck | null;
            try {
                const result = await auth.runLoginSelfCheck(providerId);
                if (snapshot.sessionId !== sessionId) return;
                if (!result) {
                    selfCheck = null;
                    note('self-check', { result: 'nothing to check' });
                } else {
                    const verdict = resolveLoginSelfCheckVerdict(result);
                    selfCheck = { status: 'done', result, verdict };
                    note('self-check', {
                        verdict: verdict.kind,
                        detail: verdict.detail ?? undefined,
                        proxy: verdict.proxy ?? undefined,
                        durationMs: result.durationMs,
                    }, verdict.kind === 'network-ok' ? 'info' : 'warn');
                }
            } catch (error) {
                if (snapshot.sessionId !== sessionId) return;
                const described = describeLoginError(error);
                selfCheck = { status: 'failed', message: String(described.message ?? described.name) };
                note('self-check:error', described, 'warn');
            }
            update({ selfCheck });
        })();
        pendingSelfCheck = { sessionId, done };
    };

    /** 进入失败：停计时器，记下形态与情况；有失败形态的（没扫码就过期不算），自动跑一次自检。 */
    const fail = (
        round: RoundState,
        phase: 'error' | 'expired',
        failureKind: LoginFailureKind | null,
        failure: LoginFailure,
    ): void => {
        // 失败 / 过期之后这张码不能再用，清掉该平台所有方式的缓存；否则下次会复用一张已作废的码。
        clearCachedLoginQr(qrCache, round.providerId, round.methodId);
        // 先把计时器收掉，再说是哪一种情况：不会留下一个到点把状态改成过期的计时器。
        clearRoundTimers();
        round.awaiting = false;
        update({ phase, failureKind, failure });
        if (failureKind !== null) runSelfCheck(round.sessionId, round.providerId);
    };

    // 前端计时到点：有效期到了（'ttl'），或者停在已扫码太久（'scanned'）。先停轮询并取消会话，再报「已过期」。
    const expire = (round: RoundState, source: 'ttl' | 'scanned'): void => {
        note('state', { state: 'expired', source, scanned: round.scanned, polls: round.polls });
        stop();
        fail(round, 'expired', round.scanned ? 'expired-after-scan' : null, failureAt(round, 'wait'));
    };

    // ─── 第 5 步：确认 ─────────────────────────────────────────────────

    const confirm = async (round: RoundState): Promise<void> => {
        // 终态清该平台所有登录方式的缓存（理由见 loginQrCache.clearCachedLoginQr）。
        clearCachedLoginQr(qrCache, round.providerId, round.methodId);
        clearRoundTimers();
        round.awaiting = false;
        // 会话已经换成登录凭据，不该再取消：后端要让在途的轮询继续读到确认。
        activeSession = null;
        // 确认了：之前「浏览器没有打开」的那种情况不再成立。
        update({ phase: 'confirmed', failure: null, failureKind: null });
        let completed: boolean | void;
        try {
            completed = onConfirmed
                ? await onConfirmed({ sessionId: round.sessionId, providerId: round.providerId, methodId: round.methodId ?? null })
                : undefined;
        } catch (error) {
            if (!isCurrent(round)) return;
            // 读账号这一步抛了错：报告里照旧记为 check-error，窗口说的是没读到账号（停在 account 这一步）。
            note('check:error', { polls: round.polls, scanned: round.scanned, ...describeLoginError(error) }, 'warn');
            fail(round, 'error', 'check-error', failureAt(round, 'account', { error }));
            return;
        }
        if (!isCurrent(round)) return;
        note('complete', { completed: completed !== false }, completed === false ? 'warn' : 'info');
        if (completed === false) fail(round, 'error', 'account-refresh-failed', failureAt(round, 'account'));
    };

    // ─── 第 4 步：轮询 ─────────────────────────────────────────────────

    // 自动重试总闸：单轮内因失败重排的次数到此为止（transient 与 429 共用这一个总额，避免「2+3=5」
    // 只停留在理论上——实际交错时次数会更多）。返回 false 表示额度已用完，调用方不要再排程。
    const countAutoRetry = (round: RoundState): boolean => {
        round.autoRetries += 1;
        if (round.autoRetries > PROVIDER_LOGIN_AUTO_POLL_LIMIT) {
            note('poll:auto-limit', { polls: round.polls, autoRetries: round.autoRetries });
            return false;
        }
        return true;
    };

    // 下一次轮询排到什么时候。间隔由 nextPollDelayMs 定：退避序列 → 抖动 → 取大不倒退 → 与上游 retryAfterMs 取大。
    // 总预算（90s）用完就不再自动排，只留手动触发；页面在后台时先挂起，回前台按绝对 deadline 继续。
    const scheduleNextPoll = (round: RoundState, key: string, retryAfterMs?: number): void => {
        const delayMs = nextPollDelayMs({
            attempt: round.backoffAttempt,
            scanned: round.scanned,
            retryAfterMs,
            previousDelayMs: round.lastPollDelayMs,
            random: random(),
        });
        // 预算判定必须把「即将等待的这段时间」也算进去：否则最坏是 90s 预算之外再叠一次等待。
        // 超了就不排下一次自动轮询（记一笔），交回手动触发——尊重平台不等于必须无限等。
        if (pollBudgetExhausted(round.pollStartedAt, clock.now() + delayMs)) {
            note('poll:budget-exhausted', { polls: round.polls, scanned: round.scanned, nextDelayMs: delayMs });
            return;
        }
        round.backoffAttempt += 1;
        round.lastPollDelayMs = delayMs;
        if (visibility.isHidden()) {
            pausedPoll = { round, key, deadline: clock.now() + delayMs, hiddenAt: clock.now() };
            note('poll:paused', { delayMs });
            return;
        }
        checkDeadline = clock.now() + delayMs;
        checkKey = key;
        checkTimer = schedule(() => { void poll(round, key); }, delayMs);
    };

    const handlePollResult = async (round: RoundState, key: string, result: LoginState): Promise<void> => {
        // 判断 429 要用「上一轮」的结果：先取出上一轮的值，再更新本轮标记。
        // 502 = 装置注册 / 建码失败，平台随后常按设计转 429（qq-api/README.md:192-193）；
        // 这是区分 A 型（上游限流）与 B 型（适配层自产退避）的唯一线索，不做任何额外请求。
        const previousPollWas502 = round.lastPollWas502;
        round.lastPollWas502 = result.state === 'error' && result.failure?.httpStatus === 502;
        if (result.state === 'error' && result.transient && round.transientFailures < PROVIDER_LOGIN_TRANSIENT_POLL_LIMIT) {
            // 没拿到平台的回答，码在平台那边仍然有效：界面保持原样，接着轮询。
            round.transientFailures += 1;
            note('poll:retry', { polls: round.polls, attempt: round.transientFailures, ...describeErrorState(result) }, 'warn');
            // 单轮自动重试总闸：只数「因失败而重排」的自动请求，正常等待扫码的轮询不占额度。
            if (!countAutoRetry(round)) return;
            scheduleNextPoll(round, key, result.failure?.retryAfterMs);
            return;
        }
        round.transientFailures = 0;
        if (result.state === 'scanned') round.scanned = true;
        if (lastLoggedPhase !== result.state) {
            lastLoggedPhase = result.state;
            note('state', {
                state: result.state,
                polls: round.polls,
                ...(result.state === 'error' ? describeErrorState(result) : {}),
            }, result.state === 'error' ? 'warn' : 'info');
        }

        switch (result.state) {
            case 'waiting':
            case 'scanned':
                update({ phase: result.state });
                touchCachedLoginQrState(qrCache, round.providerId, round.methodId, clock.now(), result.state);
                // 停在已扫码的计时从第一次读到已扫码算起；回到等待扫码（可以再扫一次）就作废，再扫码时重新算。
                if (result.state === 'scanned' && scannedTimer === null) {
                    scannedTimer = schedule(() => {
                        scannedTimer = null;
                        if (isCurrent(round)) expire(round, 'scanned');
                    }, PROVIDER_LOGIN_SCANNED_LIMIT_MS);
                } else if (result.state === 'waiting') {
                    scannedTimer = clearTimer(scannedTimer);
                }
                scheduleNextPoll(round, key);
                return;
            case 'confirmed':
                await confirm(round);
                return;
            case 'expired':
                // 扫过码之后才过期，多半是手机端的确认被拒了，要当失败处理。
                fail(round, 'expired', round.scanned ? 'expired-after-scan' : null, failureAt(round, 'wait', { detail: result.failure }));
                return;
            case 'error': {
                // 平台要求等一会儿（429 / 带 retryAfterMs）：按它说的退避后再来一次，不立刻把这次登录判死。
                // 次数用尽、或者根本没有等待信息时，才按普通失败处理。
                const waitMs = result.failure?.retryAfterMs;
                // 只有平台明确限流（httpStatus 429）才自动退避重试。
                // 其它带 retryAfterMs 的终态错误（device-limit / refused 等）重试没有意义：既把已知失败往后拖，
                // 又白打几次上游请求——与本次"降低请求量"的目标相反，所以立刻按普通失败处理。
                const rateLimited = result.failure?.httpStatus === 429;
                // 不用时间窗口：502 之后的重试间隔 ≥2000ms，任何几百毫秒的窗口都恒为 false（见 lastPollWas502 注释）。
                const has502Predecessor = rateLimited && previousPollWas502;
                if (rateLimited && has502Predecessor) {
                    // B 型：平台已经在退避了，客户端再自动重试就是退避套退避，只会把恢复窗口拖长。
                    // 直接转手动，让用户自己决定何时重试。
                    // 这里不记 attempt：B 型压根没重试过，记个恒 0 的 attempt 会让统计误以为「重试了 0 次」是常态。
                    note('poll:rate-limited', {
                        polls: round.polls,
                        has502Predecessor: true,
                        autoRetrySkipped: true,
                        ...describeErrorState(result),
                    }, 'warn');
                    fail(round, 'error', 'check-error', failureAt(round, 'check', { detail: result.failure }));
                    return;
                }
                if (rateLimited && round.rateLimitRetries < PROVIDER_LOGIN_RATE_LIMIT_RETRIES) {
                    round.rateLimitRetries += 1;
                    note('poll:rate-limited', {
                        polls: round.polls,
                        attempt: round.rateLimitRetries,
                        has502Predecessor: false,
                        ...describeErrorState(result),
                    }, 'warn');
                    if (!countAutoRetry(round)) return;
                    scheduleNextPoll(round, key, waitMs);
                    return;
                }
                fail(round, 'error', 'check-error', failureAt(round, 'check', { detail: result.failure }));
                return;
            }
        }
    };

    // 串行轮询：上一个 check 结算之后才排下一次，不会重叠。
    const poll = async (round: RoundState, key: string): Promise<void> => {
        if (!isCurrent(round)) return;
        let result: LoginState;
        try {
            round.polls += 1;
            result = await auth.checkLogin(round.providerId, key);
        } catch (error) {
            if (!isCurrent(round)) return;
            // 异常不算正常结果，但也不能让上一轮的 502 标志残留：否则「异常 → 429」会被误判成 B 型。
            round.lastPollWas502 = false;
            note('check:error', { polls: round.polls, scanned: round.scanned, ...describeLoginError(error) }, 'warn');
            fail(round, 'error', 'check-error', failureAt(round, 'check', { error }));
            return;
        }
        if (!isCurrent(round)) return;
        await handlePollResult(round, key, result);
    };

    // ─── 第 3 步：就绪 ─────────────────────────────────────────────────

    // 只有声明了这一次登录有效期的 provider 才由前端计时；其余仍旧等平台把过期报上来。
    const armTtl = (round: RoundState): void => {
        const ttlMs = auth.getLoginTtlMs(round.providerId);
        if (ttlMs === null) return;
        ttlTimer = schedule(() => {
            ttlTimer = null;
            if (isCurrent(round)) expire(round, 'ttl');
        }, ttlMs);
    };

    // 浏览器打不开：登录还在等，阶段不变，只把「浏览器没有打开」交出去；已经有别的失败时不盖掉它。
    // 这一轮已经确认、结束或被停下了，这一种情况就不成立，什么都不设。
    const noteOpenPageFailure = (round: RoundState, error: unknown): void => {
        if (!isCurrent(round)) {
            // 这时已经换了一次登录：这个错不是现在这一次的，不进它的时间线，只留一行日志。
            log('warn', 'open-page:error (an earlier sign-in)', { providerId: round.providerId, ...describeLoginError(error) });
            return;
        }
        note('open-page:error', describeLoginError(error), 'warn');
        if (round.awaiting && !snapshot.failure) update({ failure: failureAt(round, 'open', { error }) });
    };

    // ─── 第 2 步：开始 ─────────────────────────────────────────────────

    /** 发出开始请求并登记为在途；同步抛错由调用方按 start-error 处理，此时没有在途请求，不必登记。 */
    const requestStart = (round: RoundState): Promise<{ key: string; imageUrl: string }> => {
        const request = Promise.resolve(auth.startLogin(round.providerId, round.methodId));
        const settledRequest = request.then(() => undefined, () => undefined);
        pendingCreate = settledRequest;
        void settledRequest.then(() => {
            if (pendingCreate === settledRequest) pendingCreate = null;
        });
        return request;
    };

    // 抢租约：立刻试一次，不行就按固定间隔重试，直到拿到 / 超时 / 本轮被取代。
    // 用注入的 clock 等待，测试推进假时钟即可；不依赖任何真实定时器。
    const waitForLeaderLease = async (round: RoundState): Promise<boolean> => {
        // 降级路径必须在**等待层**也短路：没有可用的锁介质（SSR / 测试 / 隐私模式）时
        // 根本不需要协调，同步放行、不引入任何等待。只降级判定层会让每次登录白等一个静默期。
        // 这里不记日志：「没有锁介质」是常态（隐私模式、非浏览器环境），每次登录都记一条属于噪音
        // ——与批次2「不为每次流程新增日志事件」同一原则。只有真正的协调动作（拿到/丢失/让位）才记。
        if (!canCoordinate(leaderLock)) return true;
        const deadline = clock.now() + LOGIN_LEADER_MAX_WAIT_MS;
        for (;;) {
            if (!isCurrent(round)) return false;
            // 只写自己的候选键，不判断谁赢：先让写入落定（静默期），再做确定性裁决。
            publishLeaderCandidate(leaderLock, instanceId, clock.now());
            await new Promise<void>(resolve => { clock.setTimeout(resolve, LOGIN_LEADER_SETTLE_MS); });
            if (!isCurrent(round)) return false;
            if (holdsLeaderLease(leaderLock, instanceId, clock.now())) {
                note('login:leader', { providerId: round.providerId });
                startLeaderHeartbeat(round);
                return true;
            }
            if (clock.now() >= deadline) {
                // 不无限等：明确交回上层（界面会显示普通失败，用户可再点一次）。
                note('login:leader-timeout', { providerId: round.providerId }, 'warn');
                fail(round, 'error', 'start-error', failureAt(round, 'start'));
                return false;
            }
            note('login:leader-wait', { providerId: round.providerId });
            await new Promise<void>(resolve => { clock.setTimeout(resolve, LOGIN_LEADER_RETRY_MS); });
        }
    };

    // 心跳：定期续租。续不上说明已被别的标签接管（租约过期后被抢），立刻停手，
    // 否则两个标签会同时往上打。
    const startLeaderHeartbeat = (round: RoundState): void => {
        heartbeatTimer = clearTimer(heartbeatTimer);
        const tick = (): void => {
            heartbeatTimer = null;
            if (!isCurrent(round)) return;
            // 续自己的候选，然后**重新裁决**：如果别人 ID 更小（例如它的候选比我晚写进来但排序在前），
            // 立刻让位，不让「双方都以为自己是 leader」的状态持续下去。
            publishLeaderCandidate(leaderLock, instanceId, clock.now());
            if (!holdsLeaderLease(leaderLock, instanceId, clock.now())) {
                note('login:leader-lost', { providerId: round.providerId, hadSession: activeSession !== null }, 'warn');
                releaseLeaderLease(leaderLock, instanceId);
                // 已经生成过码就一并撤销：让位之后这张码不再归我们管，留着就是第二张可用码。
                // 注意**不能**用 releaseSession：它有「这张码下次要复用就不取消」的短路（cancel:skipped-reusable），
                // 而让位恰恰必须撤销，否则码留着、下次还可能被复用。所以这里先清缓存、再直接取消。
                if (activeSession !== null) {
                    const revoking = activeSession;
                    activeSession = null;
                    clearCachedLoginQr(qrCache, revoking.providerId, round.methodId);
                    try {
                        void Promise.resolve(auth.cancelLogin(revoking.providerId, revoking.key))
                            .catch((error: unknown) => log('warn', 'cancel:error', { providerId: revoking.providerId, ...describeLoginError(error) }));
                    } catch (error) {
                        log('warn', 'cancel:error', { providerId: revoking.providerId, ...describeLoginError(error) });
                    }
                }
                fail(round, 'error', 'start-error', failureAt(round, 'start'));
                return;
            }
            heartbeatTimer = schedule(tick, LOGIN_LEADER_HEARTBEAT_MS);
        };
        heartbeatTimer = schedule(tick, LOGIN_LEADER_HEARTBEAT_MS);
    };

    // ─── 一轮登录 ─────────────────────────────────────────────────────

    const run = async (round: RoundState): Promise<void> => {
        note('start', { methodId: round.methodId });
        // 第 1 步：能力判定。
        if (!askSafely(() => Boolean(auth.getProviderCapabilities(round.providerId).auth))) {
            update({ phase: 'error', failure: failureAt(round, 'start') });
            return;
        }

        // 跨标签协调：**同一把锁同时管 leader 选举与 single-flight**——拿不到租约的标签不允许取码，
        // 这样并发时只有一个标签调到上游，不会各生成一张。释放只能靠租约到期（被强杀不触发 unload），
        // 所以 follower 最多等一个租约周期就能接管；等待上限是两个租约周期，绝不无限等。
        if (!(await waitForLeaderLease(round))) return;

        let started: { key: string; imageUrl: string };
        // 复用：本标签内还有一张没过期、没被扫过的码，就不再打 login_qr_key + login_qr_create。
        // 服务端本就允许未扫过的旧码被下一次登录接管，所以复用时不需要先 cancel。
        const reusable = round.inBrowser
            ? null
            : readCachedLoginQr(qrCache, round.providerId, round.methodId, clock.now());
        try {
            if (pendingCreate) {
                await pendingCreate;
                // 等的时候又被更新的 start（或 stop）取代：这一轮不再开始，交给更新的那一轮。
                if (!isCurrent(round)) return;
            }
            if (reusable && isCurrent(round)) {
                note('poll:qr-reused', { providerId: round.providerId, lastState: reusable.lastState });
                started = { key: reusable.key, imageUrl: reusable.qrImage };
            } else {
                started = await requestStart(round);
            }
        } catch (error) {
            if (!isCurrent(round)) return;
            note('start:error', describeLoginError(error), 'warn');
            fail(round, 'error', 'start-error', failureAt(round, 'start', { error }));
            return;
        }
        if (!isCurrent(round)) {
            // 这一轮已被更新的 start（或 stop）取代（例如连点刷新）：把刚拿到的会话还回去，
            // 否则它会一直占着后端直到过期。
            releaseSession({ providerId: round.providerId, key: started.key });
            return;
        }

        // 跨标签复核：静默期只能保证「同一时刻写入的候选都可见」，保证不了「集合不会随后变大」。
        // 若取码期间有更小 ID 的候选写进来，我此刻已不再是 leader —— 不能把这张码交给 UI，
        // 否则两个标签会各持一张可用码（残留双 leader 窗口）。
        if (!holdsLeaderLease(leaderLock, instanceId, clock.now())) {
            note('login:leader-lost-after-create', { providerId: round.providerId, reused: reusable !== null }, 'warn');
            releaseLeaderLease(leaderLock, instanceId);
            if (!reusable) {
                // 撤销刚生成的码：login_qr_cancel 幂等，代价 1 次上游调用，远小于「两张码并存」。
                try {
                    void Promise.resolve(auth.cancelLogin(round.providerId, started.key))
                        .catch((error: unknown) => log('warn', 'cancel:error', { providerId: round.providerId, ...describeLoginError(error) }));
                } catch (error) {
                    log('warn', 'cancel:error', { providerId: round.providerId, ...describeLoginError(error) });
                }
            }
            fail(round, 'error', 'start-error', failureAt(round, 'start'));
            return;
        }

        activeSession = { providerId: round.providerId, key: started.key };
        // 只在新取的码上写缓存；复用命中时不覆盖 createdAt（否则永远不过期）。
        if (!reusable) {
            let declaredTtl: number | null = null;
            try { declaredTtl = auth.getLoginTtlMs(round.providerId); } catch { /* 平台没声明就按保守默认 */ }
            writeCachedLoginQr(qrCache, round.providerId, round.methodId, {
                key: started.key,
                qrImage: started.imageUrl,
                // 平台没声明有效期时用保守默认值（见 loginQrCache 的注释）。
                ttlMs: declaredTtl ?? LOGIN_QR_CACHE_DEFAULT_TTL_MS,
                lastState: 'waiting',
            }, clock.now());
        }
        round.awaiting = true;
        const opensItself = askSafely(() => auth.opensLoginPageItself(round.providerId, started.key));
        update({ codeImage: started.imageUrl, phase: 'waiting', canReopenLoginPage: !opensItself });
        lastLoggedPhase = 'waiting';
        note('ready');
        // 没有东西要先看：登录一开始就把浏览器打开（provider 自己已经打开的除外）。
        if (round.inBrowser && !opensItself) {
            void Promise.resolve()
                .then(() => auth.openLoginPage(round.providerId, started.key))
                .catch((error: unknown) => noteOpenPageFailure(round, error));
        }
        armTtl(round);
        scheduleNextPoll(round, started.key);
    };

    const start = (providerId: OnlineProviderId, methodId?: string): ProviderLoginStartTicket => {
        if (disposed) return { sessionId: snapshot.sessionId, settled: Promise.resolve() };
        stop();
        const sessionId = generation;
        const inBrowser = askSafely(() => auth.confirmsLoginInBrowser(providerId));
        timeline = [];
        meta = { providerId, methodId: methodId ?? null, startedAt: clock.now() };
        lastLoggedPhase = 'loading';
        pendingSelfCheck = null;
        update({
            sessionId,
            providerId,
            methodId: methodId ?? null,
            phase: 'loading',
            inBrowser,
            codeImage: '',
            canReopenLoginPage: true,
            failureKind: null,
            failure: null,
            selfCheck: null,
        });
        const round: RoundState = {
            sessionId,
            providerId,
            methodId,
            inBrowser,
            scanned: false,
            polls: 0,
            transientFailures: 0,
            awaiting: false,
            backoffAttempt: 0,
            lastPollDelayMs: 0,
            pollStartedAt: clock.now(),
            rateLimitRetries: 0,
            autoRetries: 0,
            lastPollWas502: false,
        };
        currentRound = round;
        return { sessionId, settled: run(round) };
    };

    // 在浏览器里确认的登录：让 provider 在系统浏览器里把登录的页面再打开一次。
    const openLoginPage = async (): Promise<boolean> => {
        const session = activeSession;
        const round = currentRound;
        if (!session || !round || !round.inBrowser || !isCurrent(round)) return false;
        try {
            await auth.openLoginPage(session.providerId, session.key);
        } catch (error) {
            noteOpenPageFailure(round, error);
            return false;
        }
        // 这一次打开了：在「打开」这一步记下的那一条不再成立（不管 provider 给它点了什么名），别的失败不动。
        if (isCurrent(round) && snapshot.failure?.facts.step === 'open') update({ failure: null });
        return true;
    };

    // 等还在跑的自检（属于当前会话的那个），最多等 SELF_CHECK_REPORT_WAIT_MS。
    const waitForSelfCheck = async (): Promise<void> => {
        const pending = pendingSelfCheck;
        if (!pending || pending.sessionId !== snapshot.sessionId) return;
        let timer: ScheduledTimer | null = null;
        await Promise.race([
            pending.done,
            new Promise<void>(resolve => { timer = schedule(resolve, SELF_CHECK_REPORT_WAIT_MS); }),
        ]);
        clearTimer(timer);
    };

    // 生成可以直接贴进 issue 的诊断报告：本轮时间线 + 窗口显示的情况 + 自检 + provider 自己的诊断。
    const buildDiagnosticReport = async (): Promise<string | null> => {
        const { providerId, methodId } = meta;
        if (providerId === null) return null;
        await waitForSelfCheck();
        return formatLoginDiagnosticReport({
            generatedAt: clock.now(),
            appVersion: diagnostics.appVersion,
            userAgent: diagnostics.userAgent,
            build: diagnostics.build ?? null,
            origin: diagnostics.origin ?? null,
            providerId,
            methodId,
            failure: snapshot.failureKind,
            loginFailure: snapshot.failure,
            timeline,
            selfCheck: snapshot.selfCheck,
            providerLines: await auth.getLoginDiagnostics(providerId),
        });
    };

    return {
        getSnapshot: () => snapshot,
        subscribe: listener => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        start,
        stop,
        openLoginPage,
        buildDiagnosticReport,
        dispose: () => {
            stop();
            // 退订可见性监听：不退的话每次 dispose 都会在端口上留一个回调（泄漏）。
            unsubscribeVisibility();
            unsubscribePageHide?.();
            disposed = true;
            listeners.clear();
        },
    };
};
