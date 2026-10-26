// src/utils/playerSwipeGesture.ts
// 播放页左右滑动切歌的几何常量与判定。
//
// 抽成纯函数只有一个理由：这条手势最容易出的问题是「该切没切」和「不该切乱切」，
// 两种都只有拿在手里才看得见，而真机反馈一轮要一次打包。判定不依赖 DOM 也不依赖
// React，放在这里就能直接单测（vitest 只收 test/unit/**/*.test.ts，组件层测不到）。

/** 触发阈值，px。划够这么远就切，不用等松手。 */
export const PLAYER_SWIPE_TRIGGER_PX = 56;

/**
 * 横向主导比例。横向位移必须比纵向大这么多倍才算数。
 *
 * 播放页的歌词轨是纵向滚动（MonetLyricsRail 自己挂 touchstart / touchmove，并把
 * touchAction 定成 none），没有这个约束的话「竖着划一下看歌词」会在手抖时被当成切歌。
 */
export const PLAYER_SWIPE_AXIS_RATIO = 1.2;

export type PlayerSwipeDirection = 'next' | 'prev';

export interface PlayerSwipePoint {
    x: number;
    y: number;
}

/**
 * 这根指针能不能起手。鼠标拖动不是切歌：桌面上按着左键划过歌词页、或者拖选区的手一抖，
 * 都会正好够一个阈值，切走了却没处可看。手指和手写笔才算；空字符串是浏览器认不出类型
 * 时的兜底，按「能」处理。
 */
export function isPlayerSwipePointerType(pointerType: string): boolean {
    return pointerType !== 'mouse';
}

/**
 * 左滑（手指往左，deltaX < 0）→ 下一首；右滑 → 上一首。
 * 与队列的顺序一致：往左是「往后面的歌走」。
 */
export function resolvePlayerSwipe(start: PlayerSwipePoint, end: PlayerSwipePoint): PlayerSwipeDirection | null {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    if (Math.abs(deltaX) < PLAYER_SWIPE_TRIGGER_PX) return null;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * PLAYER_SWIPE_AXIS_RATIO) return null;
    return deltaX < 0 ? 'next' : 'prev';
}
