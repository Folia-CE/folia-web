import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { isPlayerSwipePointerType, resolvePlayerSwipe, type PlayerSwipePoint } from '../utils/playerSwipeGesture';

// src/hooks/usePlayerSwipeGesture.ts
// 播放页可视层上的左右滑动切歌：绑定到元素的一组 pointer 事件。
//
// 两条容易踩的线：
//
//  1. 触发后浏览器照旧会在松手时补一个 click。播放页空白的 click 是「控件显隐翻转」
//     （见 hooks/usePlayerSurfaceGestures），不吃掉的话每切一首歌控件的显隐就翻一次 ——
//     所以这里留了 suppressClickRef，由 click 处理器先问一句 consumeSuppressedClick()。
//
//  2. 只在横向明显主导时才算数（判定见 utils/playerSwipeGesture），否则会和歌词轨那种
//     纵向触摸滚动抢事件。
//
// 判定本身是纯函数，不碰 DOM 也不碰 React —— 单测直接测那个。

interface UsePlayerSwipeGestureOptions {
    enabled: boolean;
    onNext: () => void;
    onPrev: () => void;
}

export interface PlayerSwipeGestureBinding {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    /** click 处理器开头先问一句：这次 click 是刚才那次滑动的尾巴吗？问过即作废。 */
    consumeSuppressedClick: () => boolean;
}

export const usePlayerSwipeGesture = ({
    enabled,
    onNext,
    onPrev,
}: UsePlayerSwipeGestureOptions): PlayerSwipeGestureBinding => {
    const startRef = useRef<PlayerSwipePoint | null>(null);
    // 这次手势属于哪根手指。多指同时触屏很常见（扶着手机的手、搭在屏幕边上的手指），
    // 簿记不分指针的话：第二根手指一落就抢走起点、抹掉 triggeredRef，两根手指的移动又都
    // 拿来跟同一个起点比 —— 静止手指的抖动会乱切歌，同一次触碰还会连切。
    const pointerIdRef = useRef<number | null>(null);
    const triggeredRef = useRef(false);
    // 这个标记要活过 pointerup —— click 是在它之后才到的，所以收尾时不能清它。
    const suppressClickRef = useRef(false);

    const finish = useCallback(() => {
        startRef.current = null;
        pointerIdRef.current = null;
        triggeredRef.current = false;
    }, []);

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        // 鼠标不算：桌面上拖过歌词页不该切歌（判定在 utils/playerSwipeGesture）。
        if (!isPlayerSwipePointerType(event.pointerType)) return;
        // 上面那次手势的 click 已经派发完了（click 总在 pointerup 之后），这里可以安全重置。
        // 已经有手指在跟就不再接新的：换起点会把原手势的几何整个打乱；也不能顺手重置
        // suppressClickRef，那会把刚触发那下滑的 click 放出来。
        if (startRef.current !== null) return;
        suppressClickRef.current = false;
        if (!enabled) return;
        startRef.current = { x: event.clientX, y: event.clientY };
        pointerIdRef.current = event.pointerId;
        triggeredRef.current = false;
    }, [enabled]);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const start = startRef.current;
        if (!enabled || !start || triggeredRef.current || event.pointerId !== pointerIdRef.current) return;
        const direction = resolvePlayerSwipe(start, { x: event.clientX, y: event.clientY });
        if (!direction) return;
        // 一次手势只切一首：手指继续往同一边划不该连切。
        triggeredRef.current = true;
        suppressClickRef.current = true;
        if (direction === 'next') onNext();
        else onPrev();
    }, [enabled, onNext, onPrev]);

    const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        // 别的手指抬起不算收尾 —— 不然它一松手，还在滑的那根手指就断了。
        if (event.pointerId !== pointerIdRef.current) return;
        finish();
    }, [finish]);

    const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        if (event.pointerId !== pointerIdRef.current) return;
        finish();
    }, [finish]);

    const consumeSuppressedClick = useCallback(() => {
        if (!suppressClickRef.current) return false;
        suppressClickRef.current = false;
        return true;
    }, []);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, consumeSuppressedClick };
};
