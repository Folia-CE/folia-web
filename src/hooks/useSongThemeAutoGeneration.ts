import { useEffect, useRef } from 'react';
import type { GenerateAIThemeOptions, GenerateAIThemeResult } from './useThemeController';
import type { LyricData, SongResult, DualTheme } from '../types';
import type { ThemeGenerationSource } from '../services/themePreferences';
import { getCachedThemeStateForSong } from '../services/themeCache';
import { readCloudThemeFromLyrics } from '../services/aiText';
import { isFoliaCloudCacheEnabled } from '../services/foliaCloud';
import {
    getSongThemeAutoGenerationKey,
    hasSongThemePromptSource,
    isSongThemeGenerationStillCurrent,
    shouldRequestSongThemeAutoGeneration,
} from '../utils/songThemeAutoGeneration';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { isPureMusicLyricText } from '../utils/lyrics/pureMusic';

// src/hooks/useSongThemeAutoGeneration.ts
// Coordinates delayed AI theme generation for the real current playback song.

type GenerateAITheme = (
    lyrics: LyricData | null,
    currentSong: SongResult | null,
    options?: GenerateAIThemeOptions,
) => Promise<GenerateAIThemeResult>;

type UseSongThemeAutoGenerationParams = {

    enabled: boolean;
    isLyricsLoading: boolean;
    // 'cover' generates from the artwork alone, so it does not wait for a lyric prompt source.
    themeGenerationSource: ThemeGenerationSource;
    generateAITheme: GenerateAITheme;
    /**
     * 把云缓存取回的主题落到界面上（写本地缓存 + 应用 + 提示）。
     *
     * 单独一个回调，是因为它和「生成」是两码事：这条路不需要 Key、不花模型调用、
     * 也不看上面那个 `enabled` 开关。
     */
    applyCloudTheme?: (song: SongResult, theme: DualTheme) => void | Promise<void>;
};

const AUTO_GENERATE_DELAY_MS = 650;

export function useSongThemeAutoGeneration({
    enabled,
    isLyricsLoading,
    themeGenerationSource,
    generateAITheme,
    applyCloudTheme,
}: UseSongThemeAutoGenerationParams) {
    const currentSong = usePlaybackStore(state => state.currentSong);
    const lyrics = usePlaybackStore(state => state.lyrics);

    const requiresPromptSource = themeGenerationSource !== 'cover';
    const latestSongKeyRef = useRef<string | null>(null);
    const latestEnabledRef = useRef(enabled);
    const latestGenerationInputRef = useRef({ currentSong, lyrics });
    const attemptedSongKeysRef = useRef(new Set<string>());
    const generateAIThemeRef = useRef(generateAITheme);
    const applyCloudThemeRef = useRef(applyCloudTheme);
    const cloudTriedSongKeysRef = useRef(new Set<string>());
    const songKey = getSongThemeAutoGenerationKey(currentSong);
    const hasPromptSource = currentSong
        ? hasSongThemePromptSource(currentSong, lyrics)
        : false;

    useEffect(() => {
        generateAIThemeRef.current = generateAITheme;
    }, [generateAITheme]);

    useEffect(() => {
        applyCloudThemeRef.current = applyCloudTheme;
    }, [applyCloudTheme]);

    useEffect(() => {
        latestGenerationInputRef.current = { currentSong, lyrics };
    }, [currentSong, lyrics]);

    useEffect(() => {
        latestEnabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        latestSongKeyRef.current = songKey;
    }, [songKey]);

    /**
     * 换歌时先问一次云缓存 —— **不看 AI 主题开关，也不看本地有没有缓存**。
     *
     * 这一段刻意排在上面那段自动生成之前，而且完全不读 `enabled`：
     * 云缓存是纯读、不要 Key、不花模型调用，它没有任何理由被「生成」的开关挡住。
     * 而它最该服务的恰恰是开关关着 / 没填 Key 的人 —— 对他们来说这是唯一能拿到主题的路。
     *
     * 命中就落到界面；没命中、拉失败、歌词还没到，都静静退回去，不影响任何既有行为。
     */
    useEffect(() => {
        const input = latestGenerationInputRef.current;
        const targetSong = input.currentSong;
        const targetSongKey = songKey;
        if (!targetSong || !targetSongKey) {
            return;
        }
        if (!applyCloudThemeRef.current || !isFoliaCloudCacheEnabled()) {
            return;
        }
        // 歌词还在路上：等它到了，这个 effect 会因为 lyrics 变化再跑一次。
        if (isLyricsLoading || !(input.lyrics?.lines.length)) {
            return;
        }
        // 每首歌只问一次（问不到也不重复问，aiCloudCache 那边还有一层 miss 缓存）。
        if (cloudTriedSongKeysRef.current.has(targetSongKey)) {
            return;
        }
        cloudTriedSongKeysRef.current.add(targetSongKey);

        let cancelled = false;
        void (async () => {
            const lines = input.lyrics?.lines ?? [];
            const allText = lines.map(line => line.fullText).join('\n').trim() || '';
            const songTitle = targetSong.name?.trim() || input.lyrics?.title?.trim() || '';
            const isPureMusic = Boolean(targetSong.isPureMusic) || isPureMusicLyricText(allText);
            // 与生成那条路同口径：纯音乐喂歌名，其余喂歌词正文。
            const promptText = (isPureMusic ? songTitle : allText) || allText;
            if (!promptText) return;

            let theme: DualTheme | null = null;
            try {
                theme = await readCloudThemeFromLyrics(promptText);
            } catch {
                theme = null;
            }
            if (!theme || cancelled || latestSongKeyRef.current !== targetSongKey) {
                return;
            }
            try {
                await applyCloudThemeRef.current?.(targetSong, theme);
            } catch {
                // 落不下去也不算错：云缓存只是加速器。
            }
        })();

        return () => {
            cancelled = true;
        };
        // 故意不依赖 enabled：开关变化不该让缓存重查，也不该让它停下。
    }, [songKey, isLyricsLoading, lyrics]);

    useEffect(() => {
        const scheduledInput = latestGenerationInputRef.current;
        const scheduledSong = scheduledInput.currentSong;
        if (!scheduledSong || !songKey) {
            return;
        }

        if (!shouldRequestSongThemeAutoGeneration({
            enabled,
            currentSong: scheduledSong,
            lyrics: scheduledInput.lyrics,
            isLyricsLoading,
            hasAttempted: attemptedSongKeysRef.current.has(songKey),
            hasCachedTheme: false,
            requiresPromptSource,
        })) {
            return;
        }

        const targetSongKey = songKey;
        let cancelled = false;
        const timeoutId = window.setTimeout(() => {
            void (async () => {
                if (cancelled || !isSongThemeGenerationStillCurrent({
                    latestSongKey: latestSongKeyRef.current,
                    targetSongKey,
                    enabled: latestEnabledRef.current,
                })) {
                    return;
                }

                const latestInput = latestGenerationInputRef.current;
                const latestSong = latestInput.currentSong;
                if (!latestSong) {
                    return;
                }

                const cachedTheme = await getCachedThemeStateForSong(latestSong);
                if (cancelled || !isSongThemeGenerationStillCurrent({
                    latestSongKey: latestSongKeyRef.current,
                    targetSongKey,
                    enabled: latestEnabledRef.current,
                })) {
                    return;
                }
                if (!shouldRequestSongThemeAutoGeneration({
                    enabled: latestEnabledRef.current,
                    currentSong: latestSong,
                    lyrics: latestInput.lyrics,
                    isLyricsLoading: false,
                    hasAttempted: attemptedSongKeysRef.current.has(targetSongKey),
                    hasCachedTheme: cachedTheme.kind !== 'none',
                    requiresPromptSource,
                })) {
                    attemptedSongKeysRef.current.add(targetSongKey);
                    return;
                }

                attemptedSongKeysRef.current.add(targetSongKey);
                await generateAIThemeRef.current(latestInput.lyrics, latestSong, {
                    source: 'auto',
                    shouldApply: () => isSongThemeGenerationStillCurrent({
                        latestSongKey: latestSongKeyRef.current,
                        targetSongKey,
                        enabled: latestEnabledRef.current,
                    }),
                });
            })();
        }, AUTO_GENERATE_DELAY_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [enabled, hasPromptSource, isLyricsLoading, requiresPromptSource, songKey]);
}
