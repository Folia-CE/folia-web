// src/library/core/account/loginPollBackoff.ts
// 扫码登录轮询的退避策略：纯函数，不碰 window、不碰计时器，时钟与随机数由调用方注入。
// 约束（D 安全红线 + C 可验收清单 v1.1）：
//   · 未扫码的自动退避序列单调不减（抖动之后也不许倒退，否则等于退回固定间隔）；
//   · 已扫码是状态迁移（新的等待段落），允许从退避曲线回落到 SCANNED_INTERVAL，不受上一段钳制；
//   · 上游 retryAfterMs 优先于我们的退避值（取大），单次上限只约束「我们自己的退避」；
//   · 单次上限夹在抖动之后：将来往步表里加更大的值也不会破「上限 8s」的承诺；
//   · 总时长有上限，到顶停自动重试、转人工；
//   · 单位统一毫秒：body 的 retryAfterMs 本是毫秒，Retry-After 头由 transport 乘 1000 后再进来（qqTransport.ts:269）；
//   · 纯函数不把 NaN 传出去：任何非有限输入都回落到安全默认。

/** 第 n 次自动轮询的基准间隔（毫秒）。最后一项之后一直用它。 */
export const LOGIN_POLL_BACKOFF_STEPS_MS = [2000, 2500, 3200, 4100, 5300] as const;

/** 我们自己退避的单次上限。上游给的 retryAfterMs 可以超过它（那是平台要求，必须尊重）。 */
export const LOGIN_POLL_BACKOFF_MAX_MS = 8000;

/** 已扫过码时的间隔：用户在手机上操作，等太久体验更差。这是状态迁移，不受上一段退避钳制。 */
export const LOGIN_POLL_SCANNED_INTERVAL_MS = 3000;

/** 抖动幅度 ±15%。 */
export const LOGIN_POLL_JITTER_RATIO = 0.15;

/** 自动轮询从开始算起的总时长上限；到顶即停自动、转人工。 */
export const LOGIN_POLL_TOTAL_BUDGET_MS = 90_000;

const DEFAULT_RANDOM = 0.5;

/** 有限数才收；其余（NaN / ±Infinity / undefined）一律视作「没有」。 */
const finiteOr = (value: number | undefined, fallback: number): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clamp01 = (value: number): number => {
    const safe = finiteOr(value, DEFAULT_RANDOM);
    return safe < 0 ? 0 : safe > 1 ? 1 : safe;
};

/** 第 attempt 次自动轮询的基准间隔，未抖动、未考虑 retryAfterMs。非有限 attempt 当第 0 次。 */
export const pollBackoffBaseMs = (attempt: number): number => {
    const steps = LOGIN_POLL_BACKOFF_STEPS_MS;
    const raw = Math.trunc(finiteOr(attempt, 0));
    const index = Math.min(Math.max(raw, 0), steps.length - 1);
    return steps[index];
};

/** 给基准间隔加 ±15% 抖动。random 由调用方给，测试里可以钉死；非有限值当中位数。 */
export const jitterMs = (baseMs: number, random: number): number => {
    const base = finiteOr(baseMs, 0);
    const factor = 1 + (clamp01(random) * 2 - 1) * LOGIN_POLL_JITTER_RATIO;
    return base * factor;
};

export type LoginPollDelayInput = Readonly<{
    /** 这是第几次自动轮询（0 起）。手动触发不计入。 */
    attempt: number;
    /** 已经扫过码。 */
    scanned: boolean;
    /** 上游要求的等待毫秒数；没有就不传。 */
    retryAfterMs?: number;
    /** 上一次实际用的间隔：保证未扫码时抖动之后也不倒退。 */
    previousDelayMs?: number;
    /** [0,1] 的随机源；测试里注入定值。 */
    random?: number;
}>;

/**
 * 下一次轮询该等多久（毫秒）。
 * 未扫码：基准 → 抖动 → 夹进单次上限 → 与上一次取大（防抖动倒退）。
 * 已扫码：基准就是 SCANNED_INTERVAL（状态迁移，跳过「不倒退」钳制，让扫完码后能被更勤地问到）。
 * 两者最后都与 retryAfterMs 取大：平台的硬下限与状态无关，永远尊重。
 */
export const nextPollDelayMs = (input: LoginPollDelayInput): number => {
    const random = finiteOr(input.random, DEFAULT_RANDOM);
    // 不做 clamp：平台要 120s 就按 120s 等。若这个等待会超出 90s 总预算，调度层干脆不排自动轮询、
    // 交回手动触发（见 scheduleNextPoll 的预算闸），既不提前重试招二次 429，也不会无限等。
    const retryAfterMs = finiteOr(input.retryAfterMs, 0);
    const previousDelayMs = finiteOr(input.previousDelayMs, 0);
    const base = input.scanned
        ? LOGIN_POLL_SCANNED_INTERVAL_MS
        : pollBackoffBaseMs(input.attempt);
    // clamp 在抖动之后：这样「单次上限 8s」约束的是最终产出的等待值。
    let delay = Math.min(LOGIN_POLL_BACKOFF_MAX_MS, jitterMs(base, random));
    // 只有未扫码的连续退避才需要「不倒退」；已扫码是新的等待段落，允许回落。
    if (!input.scanned && delay < previousDelayMs) delay = previousDelayMs;
    if (retryAfterMs > delay) delay = retryAfterMs;
    const rounded = Math.round(delay);
    return Number.isFinite(rounded) && rounded > 0 ? rounded : LOGIN_POLL_BACKOFF_STEPS_MS[0];
};

/** 自动轮询是否已经用满总预算（到顶后只允许手动触发）。 */
export const pollBudgetExhausted = (startedAt: number, now: number): boolean => {
    const start = finiteOr(startedAt, 0);
    const at = finiteOr(now, 0);
    return at - start >= LOGIN_POLL_TOTAL_BUDGET_MS;
};

/**
 * 平台要求等待的秒数：给界面「{{seconds}} 秒后可以重试」用（复用现成键 qrRetryCooldown）。
 * 有 retryAfterMs 就用它；没有就用退避推算值兜底，并保证是非零正整数（禁止只说「稍后重试」）。
 */
export const retryCooldownSeconds = (retryAfterMs: number | undefined, fallbackMs: number): number => {
    const retry = finiteOr(retryAfterMs, 0);
    const fallback = finiteOr(fallbackMs, LOGIN_POLL_BACKOFF_STEPS_MS[0]);
    const source = retry > 0 ? retry : fallback;
    const seconds = Math.ceil(source / 1000);
    return seconds > 0 ? seconds : 1;
};
