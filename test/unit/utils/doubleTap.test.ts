import { describe, expect, it } from 'vitest';
import { DOUBLE_TAP_MS, DOUBLE_TAP_SLOP_PX, isDoubleTap, type TapPoint } from '@/utils/doubleTap';

// test/unit/utils/doubleTap.test.ts
// 播放页双击暂停的那条判定：两次点击的间隔上限与位移上限，两个都按窗口边界（含）算。

const tapAt = (at: number, x = 200, y = 400): TapPoint => ({ at, x, y });

describe('doubleTap', () => {
    it('pins the window and the slop the touch tuning was done on', () => {
        expect(DOUBLE_TAP_MS).toBe(340);
        expect(DOUBLE_TAP_SLOP_PX).toBe(24);
    });

    it('needs a previous tap to compare against', () => {
        expect(isDoubleTap(null, tapAt(1000))).toBe(false);
    });

    it('takes the second tap anywhere inside the window, including both edges', () => {
        expect(isDoubleTap(tapAt(1000), tapAt(1000))).toBe(true);
        expect(isDoubleTap(tapAt(1000), tapAt(1000 + DOUBLE_TAP_MS))).toBe(true);
        expect(isDoubleTap(tapAt(1000), tapAt(1001 + DOUBLE_TAP_MS))).toBe(false);
    });

    it('refuses a previous tap that is later than the current one', () => {
        // 时钟回拨、或同一次点击的两条事件乱了序：不猜，当两次独立点击。
        expect(isDoubleTap(tapAt(2000), tapAt(1000))).toBe(false);
    });

    it('allows the finger to land a little off the first tap, but not a drag away', () => {
        expect(isDoubleTap(tapAt(1000, 200, 400), tapAt(1200, 200 + DOUBLE_TAP_SLOP_PX, 400 - DOUBLE_TAP_SLOP_PX))).toBe(true);
        expect(isDoubleTap(tapAt(1000, 200, 400), tapAt(1200, 200 + DOUBLE_TAP_SLOP_PX + 1, 400))).toBe(false);
        expect(isDoubleTap(tapAt(1000, 200, 400), tapAt(1200, 200, 400 + DOUBLE_TAP_SLOP_PX + 1))).toBe(false);
    });

    it('wants both the window and the slop to hold at the same time', () => {
        expect(isDoubleTap(tapAt(1000, 200, 400), tapAt(1000 + DOUBLE_TAP_MS + 1, 200, 400))).toBe(false);
        expect(isDoubleTap(tapAt(1000, 200, 400), tapAt(1000 + DOUBLE_TAP_MS, 0, 0))).toBe(false);
    });
});
