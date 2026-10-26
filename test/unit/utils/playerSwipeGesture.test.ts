import { describe, expect, it } from 'vitest';
import {
    isPlayerSwipePointerType,
    PLAYER_SWIPE_AXIS_RATIO,
    PLAYER_SWIPE_TRIGGER_PX,
    resolvePlayerSwipe,
} from '@/utils/playerSwipeGesture';

// test/unit/utils/playerSwipeGesture.test.ts
// 播放页左右滑动切歌的纯判定：触发阈值、横纵主导比、方向映射，以及鼠标拖动不算切歌。

/** 从屏幕中间往右 / 往左划一段，起点固定，省得每个用例都写两遍坐标。 */
const swipeFrom = (deltaX: number, deltaY: number) => resolvePlayerSwipe({ x: 200, y: 400 }, { x: 200 + deltaX, y: 400 + deltaY });

describe('playerSwipeGesture', () => {
    it('pins the geometry the real devices were tuned on', () => {
        expect(PLAYER_SWIPE_TRIGGER_PX).toBe(56);
        expect(PLAYER_SWIPE_AXIS_RATIO).toBe(1.2);
    });

    it('keeps a short drag inside the trigger dead zone', () => {
        expect(swipeFrom(0, 0)).toBeNull();
        expect(swipeFrom(PLAYER_SWIPE_TRIGGER_PX - 1, 0)).toBeNull();
        expect(swipeFrom(-(PLAYER_SWIPE_TRIGGER_PX - 1), 0)).toBeNull();
    });

    it('fires exactly at the trigger, left is next and right is prev', () => {
        expect(swipeFrom(PLAYER_SWIPE_TRIGGER_PX, 0)).toBe('prev');
        expect(swipeFrom(-PLAYER_SWIPE_TRIGGER_PX, 0)).toBe('next');
        expect(swipeFrom(PLAYER_SWIPE_TRIGGER_PX - 1, 0)).toBeNull();
    });

    it('leaves a mostly vertical drag alone, so scrolling the lyrics never skips a track', () => {
        // 竖着划：横向够阈值也不切。
        expect(swipeFrom(20, 200)).toBeNull();
        expect(swipeFrom(-30, -180)).toBeNull();
        // 斜着划但纵向占便宜：同样不切。
        expect(swipeFrom(60, 60)).toBeNull();
        // 60 <= 51 * 1.2 = 61.2，横向还没有明显主导。
        expect(swipeFrom(60, 51)).toBeNull();
        // 60 > 49 * 1.2 = 58.8，这才算横着划。
        expect(swipeFrom(60, 49)).toBe('prev');
        expect(swipeFrom(-60, 49)).toBe('next');
    });

    it('refuses the exact axis ratio boundary, so the ratio stays a strict comparison', () => {
        const deltaY = 100;
        expect(swipeFrom(deltaY * PLAYER_SWIPE_AXIS_RATIO, deltaY)).toBeNull();
        expect(swipeFrom(deltaY * PLAYER_SWIPE_AXIS_RATIO + 1, deltaY)).toBe('prev');
    });

    it('reads the direction off the horizontal delta only', () => {
        expect(swipeFrom(-80, -40)).toBe('next');
        expect(swipeFrom(-80, 40)).toBe('next');
        expect(swipeFrom(80, -40)).toBe('prev');
        expect(swipeFrom(80, 40)).toBe('prev');
    });

    it('takes fingers and pens but not the mouse', () => {
        expect(isPlayerSwipePointerType('touch')).toBe(true);
        expect(isPlayerSwipePointerType('pen')).toBe(true);
        // 浏览器认不出类型时按「能」处理。
        expect(isPlayerSwipePointerType('')).toBe(true);
        expect(isPlayerSwipePointerType('mouse')).toBe(false);
    });
});
