import { useEffect, useRef } from 'react';

// src/hooks/usePlayerTouchGestures.ts
//
// 播放页在**触摸屏**上的三件事，合在一处，因为它们都读同一串指针事件、
// 也都要分清楚「这是一次点按」还是「这是一次滑动」：
//
//   1. 触摸空闲后自动收起界面（底部进度条等）—— 现有的 usePlayerChromeAutoHide 只听
//      mouseout / mousemove / wheel，手机上这些一个都不会来，所以那边等价于永远不收；
//   2. 点屏幕空白处把界面收起来（再点一下放回来）；
//   3. 左右滑动切歌。
//
// 都只在「指针是手指」时才动作（`pointerType === 'touch'`）：桌面上的鼠标拖动是别的交互
// （拖进度条、拖词卡），不能被这里劫走。
//
// 这个 hook 不发命令，只把判断结果交给调用方 —— 收/放界面用 `onToggleChrome`，
// 切歌用 `onSwipeLeft` / `onSwipeRight`，这样它不依赖任何播放相关的状态。

/** 手指按下后移动超过这个距离，就不再当成「点了一下」。 */
const TAP_SLOP_PX = 10;

/** 横向位移超过这个值、并且明显大于纵向位移，才算一次切歌手势。 */
const SWIPE_MIN_PX = 56;

/** 滑动要比纵向多出这么多倍，才不会跟「上下滑歌词 / 滚动」抢。 */
const SWIPE_AXIS_RATIO = 1.6;

/** 一次滑动最长允许的时间：慢慢拖着看，不该被当成切歌。 */
const SWIPE_MAX_MS = 700;

/** 触摸空闲多久之后收起界面。 */
const TOUCH_IDLE_HIDE_MS = 3000;

type SwipeOptions = {
    /** 界面的可见状态：滑动不改变它，但空闲收起的计时要知道现在露着没有。 */
    isChromeHidden: boolean;
    /** 把界面收起来或放回来。 */
    onToggleChrome: () => void;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    /** 关掉整个手势层（例如播放页不在、或用户选了「始终显示」）。 */
    enabled?: boolean;
};

/**
 * 挂在播放页根节点上。返回的 `onPointerDownCapture` 之类不用自己接：
 * 它直接把监听器挂到 `window` 上，和现有那套鼠标逻辑并列。
 */
export const usePlayerTouchGestures = ({
    isChromeHidden,
    onToggleChrome,
    onSwipeLeft,
    onSwipeRight,
    enabled = true,
}: SwipeOptions): void => {
    // 回调放进 ref：它们每次渲染都是新函数，放进依赖会让监听器反复重建。
    const latest = useRef({ isChromeHidden, onToggleChrome, onSwipeLeft, onSwipeRight });
    latest.current = { isChromeHidden, onToggleChrome, onSwipeLeft, onSwipeRight };

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        let idleTimer: number | undefined;
        let startX = 0;
        let startY = 0;
        let startAt = 0;
        let tracking = false;

        const clearIdle = () => {
            window.clearTimeout(idleTimer);
            idleTimer = undefined;
        };

        const scheduleIdleHide = () => {
            clearIdle();
            idleTimer = window.setTimeout(() => {
                idleTimer = undefined;
                // 已经收着就不用再收；放回来这件事只由「点一下」负责。
                if (!latest.current.isChromeHidden) latest.current.onToggleChrome();
            }, TOUCH_IDLE_HIDE_MS);
        };

        const isTouch = (event: PointerEvent) => event.pointerType === 'touch';

        const handlePointerDown = (event: PointerEvent) => {
            if (!isTouch(event)) return;
            tracking = true;
            startX = event.clientX;
            startY = event.clientY;
            startAt = event.timeStamp;
            // 手指还在屏幕上时不收界面，否则正读到一半的进度条会中途消失。
            clearIdle();
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (!isTouch(event) || !tracking) return;
            tracking = false;

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            const elapsed = event.timeStamp - startAt;

            if (absX >= SWIPE_MIN_PX && absX > absY * SWIPE_AXIS_RATIO && elapsed <= SWIPE_MAX_MS) {
                // 滑完立刻重新计时：用户刚动过手，界面该再露一会儿。
                scheduleIdleHide();
                if (dx < 0) latest.current.onSwipeLeft();
                else latest.current.onSwipeRight();
                return;
            }

            if (absX <= TAP_SLOP_PX && absY <= TAP_SLOP_PX && elapsed <= SWIPE_MAX_MS) {
                // 一次干净的点击：收 / 放界面。点在按钮上时按钮自己会 stopPropagation
                // 之外仍然会冒到这里 —— 所以由调用方决定哪些区域算「空白」，
                // 这里只在拿不到更具体目标时才算数（见下）。
                const target = event.target as HTMLElement | null;
                if (target && target.closest('[data-touch-chrome-control]')) {
                    // 点在控件上：放回界面并重新计时，不要切换。
                    scheduleIdleHide();
                    if (latest.current.isChromeHidden) latest.current.onToggleChrome();
                    return;
                }
                latest.current.onToggleChrome();
                scheduleIdleHide();
                return;
            }

            scheduleIdleHide();
        };

        const handlePointerCancel = () => {
            tracking = false;
            scheduleIdleHide();
        };

        window.addEventListener('pointerdown', handlePointerDown, { passive: true });
        window.addEventListener('pointerup', handlePointerUp, { passive: true });
        window.addEventListener('pointercancel', handlePointerCancel, { passive: true });

        // 一进来就按「刚动过手」算：首次进入播放页时界面是露着的，三秒后才收。
        scheduleIdleHide();

        return () => {
            clearIdle();
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerCancel);
        };
    }, [enabled]);
};
