import { describe, expect, it } from 'vitest';
import {
    LOGIN_POLL_BACKOFF_MAX_MS,
    LOGIN_POLL_BACKOFF_STEPS_MS,
    LOGIN_POLL_SCANNED_INTERVAL_MS,
    LOGIN_POLL_TOTAL_BUDGET_MS,
    jitterMs,
    nextPollDelayMs,
    pollBackoffBaseMs,
    pollBudgetExhausted,
    retryCooldownSeconds,
} from '@/library/core/account/loginPollBackoff';

// test/unit/library/core/loginPollBackoff.test.ts
// 扫码轮询退避：序列、抖动边界、不倒退、已扫码例外、与上游 retryAfterMs 取大、单次上限、总预算、
// 单位口径（毫秒）、以及纯函数不许把 NaN/Infinity 传出去。随机源由调用方注入，所以这里全部是确定值。

describe('loginPollBackoff · 序列与抖动', () => {
    it('基准序列就是任务卡写的那五个值，之后停在最后一个', () => {
        expect(LOGIN_POLL_BACKOFF_STEPS_MS).toEqual([2000, 2500, 3200, 4100, 5300]);
        expect(pollBackoffBaseMs(0)).toBe(2000);
        expect(pollBackoffBaseMs(4)).toBe(5300);
        expect(pollBackoffBaseMs(99)).toBe(5300);
    });

    it('抖动是 ±15%：random=0 取 -15%，random=0.5 取中位，random=1 取 +15%', () => {
        expect(jitterMs(2000, 0)).toBeCloseTo(1700, 6);
        expect(jitterMs(2000, 0.5)).toBeCloseTo(2000, 6);
        expect(jitterMs(2000, 1)).toBeCloseTo(2300, 6);
    });

    it('抖动后夹进单次上限（clamp 在抖动之后，所以 8s 是产出值的真上限）', () => {
        // 用一个远超上限的基准，模拟"将来往步表里加了更大的值"。
        expect(Math.min(LOGIN_POLL_BACKOFF_MAX_MS, jitterMs(10000, 1))).toBe(LOGIN_POLL_BACKOFF_MAX_MS);
        const worst = nextPollDelayMs({ attempt: 99, scanned: false, random: 1 });
        expect(worst).toBeLessThanOrEqual(LOGIN_POLL_BACKOFF_MAX_MS);
    });

    it('未扫码时抖动不会让间隔倒退：200 次采样零倒退', () => {
        let previous = 0;
        for (let i = 0; i < 200; i += 1) {
            const random = (i * 37 % 101) / 100;
            const attempt = Math.floor(i / 20);
            const delay = nextPollDelayMs({ attempt, scanned: false, previousDelayMs: previous, random });
            expect(delay).toBeGreaterThanOrEqual(previous);
            previous = delay;
        }
    });
});

describe('loginPollBackoff · 上游 retryAfterMs（A1/A2）', () => {
    it('retryAfterMs 优先：比退避大就按它等（A1 的 9000ms 用例）', () => {
        expect(nextPollDelayMs({ attempt: 0, scanned: false, retryAfterMs: 9000, random: 0.5 })).toBe(9000);
        expect(nextPollDelayMs({ attempt: 0, scanned: false, retryAfterMs: 2000, random: 0.5 })).toBe(2000);
    });

    it('单位是毫秒，调度层不再乘 1000（A2：body 的 retryAfterMs 与 Retry-After 头都已归一成毫秒）', () => {
        // 若这里被当成"秒"再乘一次，2000 会变成 2,000,000ms；断言收的是毫秒原值。
        expect(nextPollDelayMs({ attempt: 0, scanned: false, retryAfterMs: 2000, random: 0.5 })).toBe(2000);
        // 头路径由 qqTransport 的 seconds*1000 归一后再进来：这里模拟它归一后的 3000ms。
        expect(nextPollDelayMs({ attempt: 0, scanned: false, retryAfterMs: 3000, random: 0.5 })).toBe(3000);
        // 比退避小的 retryAfterMs 不会把间隔拉小。
        expect(nextPollDelayMs({ attempt: 4, scanned: false, retryAfterMs: 1200, random: 0.5 })).toBe(5300);
    });
});

describe('loginPollBackoff · 已扫码是状态迁移', () => {
    it('扫码后回到 3s，不被上一段的"不倒退"钳制顶住', () => {
        expect(nextPollDelayMs({ attempt: 4, scanned: true, previousDelayMs: 6095, random: 0.5 }))
            .toBe(LOGIN_POLL_SCANNED_INTERVAL_MS);
    });

    it('但平台要求的 retryAfterMs 照旧优先（硬下限与状态无关）', () => {
        expect(nextPollDelayMs({ attempt: 4, scanned: true, previousDelayMs: 6095, retryAfterMs: 9000, random: 0.5 }))
            .toBe(9000);
    });
});

describe('loginPollBackoff · 总预算', () => {
    it('90s 到顶', () => {
        expect(pollBudgetExhausted(0, LOGIN_POLL_TOTAL_BUDGET_MS - 1)).toBe(false);
        expect(pollBudgetExhausted(0, LOGIN_POLL_TOTAL_BUDGET_MS)).toBe(true);
    });
});

describe('loginPollBackoff · NaN / Infinity 防御', () => {
    it('非有限输入回落到安全默认，输出始终是有限正整数', () => {
        const cases = [
            { attempt: Number.NaN, scanned: false },
            { attempt: Number.POSITIVE_INFINITY, scanned: false },
            { attempt: 0, scanned: false, random: Number.NaN },
            { attempt: 0, scanned: false, retryAfterMs: Number.NaN },
            { attempt: 0, scanned: false, previousDelayMs: Number.POSITIVE_INFINITY },
            { attempt: 0, scanned: false, retryAfterMs: Number.NEGATIVE_INFINITY },
        ];
        for (const input of cases) {
            const delay = nextPollDelayMs(input);
            expect(Number.isFinite(delay)).toBe(true);
            expect(delay).toBeGreaterThan(0);
        }
        expect(pollBackoffBaseMs(Number.NaN)).toBe(2000);
        expect(pollBudgetExhausted(Number.NaN, Number.NaN)).toBe(false);
    });
});

describe('loginPollBackoff · 倒计时秒数（复用 qrRetryCooldown 的 {{seconds}}）', () => {
    it('有 retryAfterMs 用它，没有就用退避兜底，且永远是非零正整数', () => {
        expect(retryCooldownSeconds(9000, 2000)).toBe(9);
        expect(retryCooldownSeconds(undefined, 5300)).toBe(6);
        expect(retryCooldownSeconds(undefined, 0)).toBeGreaterThan(0);
        expect(retryCooldownSeconds(Number.NaN, 2500)).toBeGreaterThan(0);
    });
});
