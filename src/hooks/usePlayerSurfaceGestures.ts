import { useCallback } from 'react';
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react';
import { usePlayerSwipeGesture } from './usePlayerSwipeGesture';
import { usePlayerTapGesture } from './usePlayerTapGesture';
import type { TapEvent } from '../utils/doubleTap';

// src/hooks/usePlayerSurfaceGestures.ts
// 播放页可视层（App.tsx 里那块 data-testid="player-visual-surface" 的底层）上的手势总装配：
// 左右滑动切歌、单击翻转控件显隐、双击暂停 / 继续。
//
// 三件事读的是同一串指针与点击事件，所以装配在一处，由它保证那条最难的线：
// 滑动切完歌浏览器照旧补一个 click，那一下不能再被当成「点空白」翻一次控件显隐。
//
// App.tsx 只接返回值挂到元素上，不再自己拼这几个 handler —— 那里是入口文件，只做组装。

interface UsePlayerSurfaceGesturesOptions {
    /** 现在是不是播放页。这一层在首页、Lattice 底下也铺着当背景，在那儿划一下就切歌既看不见也猜不到。 */
    isPlayerPage: boolean;
    /** 面板开着时这一下的意思是「关掉它」；滑动交给面板自己的手势。 */
    isPanelOpen: boolean;
    /** 单击翻不翻控件显隐：「始终显示」那一档不接管（双击暂停照旧）。 */
    canToggleChrome: boolean;
    /** 控件显隐的那个开关本身（App 里的 setIsPlayerChromeHidden），翻转用函数式更新，不读旧值。 */
    setIsPlayerChromeHidden: Dispatch<SetStateAction<boolean>>;
    onClosePanel: () => void;
    onTogglePlayback: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export interface PlayerSurfaceGestureBinding {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    onClick: (event: TapEvent) => void;
}

/**
 * 一次点击落到播放页空白上该做的事：面板开着先关面板，否则翻控件显隐。
 *
 * 面板开着时那一层不压双击窗口（见 hooks/usePlayerTapGesture）：这一下的意思就是关掉它，
 * 晚 340ms 才关会让人以为没点上；双击暂停在这一档也不用，第一下已经用来关面板了。
 */
export const usePlayerSurfaceGestures = ({
    isPlayerPage,
    isPanelOpen,
    canToggleChrome,
    setIsPlayerChromeHidden,
    onClosePanel,
    onTogglePlayback,
    onNext,
    onPrev,
}: UsePlayerSurfaceGesturesOptions): PlayerSurfaceGestureBinding => {
    const handleTap = useCallback(() => {
        if (isPanelOpen) {
            onClosePanel();
            return;
        }
        if (isPlayerPage && canToggleChrome) setIsPlayerChromeHidden(previous => !previous);
    }, [canToggleChrome, isPanelOpen, isPlayerPage, onClosePanel, setIsPlayerChromeHidden]);

    const { onClick: handleTapEvent, resetTapSequence } = usePlayerTapGesture({
        enabled: isPlayerPage && !isPanelOpen,
        onTap: handleTap,
        onDoubleTap: onTogglePlayback,
    });

    /** 滑动一旦成立，滑动前那一下点击就不再是单击了：压着的单击和双击的第一击一起清掉。 */
    const handleSwipeNext = useCallback(() => {
        resetTapSequence();
        onNext();
    }, [onNext, resetTapSequence]);
    const handleSwipePrev = useCallback(() => {
        resetTapSequence();
        onPrev();
    }, [onPrev, resetTapSequence]);

    const {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        consumeSuppressedClick,
    } = usePlayerSwipeGesture({
        enabled: isPlayerPage && !isPanelOpen,
        onNext: handleSwipeNext,
        onPrev: handleSwipePrev,
    });

    /** 滑动那次松手补发的 click 先在这里被吃掉，剩下的才轮到单击 / 双击判定。 */
    const onClick = useCallback((event: TapEvent) => {
        if (consumeSuppressedClick()) return;
        handleTapEvent(event);
    }, [consumeSuppressedClick, handleTapEvent]);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick };
};
