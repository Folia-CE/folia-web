import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { isMissingAiApiKeyError, readCloudThemeFromLyrics } from '../services/aiText';
import { saveToCache } from '../services/db';
import { DualTheme, LyricData, SongResult, StatusMessage, Theme, ThemeMode } from '../types';
import { getCachedThemeState, getCachedThemeStateForSong, getLastDualTheme, getLastLegacyTheme, type ThemeCacheSongKey } from '../services/themeCache';
import { saveSyncedThemeForSong } from '../services/sync/syncRepository';
import {
    applyStoredAnimationIntensityToDualTheme,
    applyStoredAnimationIntensityToTheme,
    isThemeAnimationIntensity,
    readStoredLastAppliedThemePointer,
    readStoredThemeAutoGenerateEnabled,
    readStoredThemeAutoSwitchEnabled,
    readStoredThemeGenerationSource,
    resolveCustomThemePreferenceChange,
    resolveSongThemeAutoGenerateChange,
    resolveSongThemeAutoSwitchChange,
    saveStoredAnimationIntensity,
    saveStoredLastAppliedThemePointer,
    saveStoredThemeAutoGenerateEnabled,
    saveStoredThemeAutoSwitchEnabled,
    saveStoredThemeGenerationSource,
    type ThemeGenerationSource,
    type ThemePreferenceSwitchState,
} from '../services/themePreferences';
import { FALLBACK_AI_DUAL_THEME, sanitizeDualTheme, sanitizeTheme } from '../services/themeSanitizer';
import { extractColors } from '../utils/colorExtractor';
import { isPureMusicLyricText } from '../utils/lyrics/pureMusic';
import {
    buildThemeSourceModel,
    buildBuiltinDualTheme,
    buildDefaultCustomDualTheme,
    getBaseThemeForMode,
    resolveBgModeTheme,
} from './themeControllerState';
import { getPlaybackSongKey } from '../utils/appPlaybackGuards';
import { usePlaybackStore } from '../stores/usePlaybackStore';
import { setStatusMessage as setStatusMsg } from '../stores/useStatusMessageStore';
import { useStableCallbacks } from './useStableCallbacks';

type StatusSetter = Dispatch<SetStateAction<StatusMessage | null>>;
export type GenerateAIThemeOptions = {
    source?: 'manual' | 'auto';
    shouldApply?: () => boolean;
};

export type GenerateAIThemeResult =
    | { status: 'generated'; applied: boolean }
    | { status: 'skipped'; reason: 'in-flight' | 'empty-prompt' }
    | { status: 'failed' };

const CUSTOM_DUAL_THEME_KEY = 'custom_dual_theme';

// Keeps local theme operations successful when the optional sync server is unavailable.
const saveSyncedThemeWithoutBlocking = (...args: Parameters<typeof saveSyncedThemeForSong>) => {
    void saveSyncedThemeForSong(...args).catch((error) => {
        console.warn('[sync] Failed to upload theme:', error);
    });
};
const CUSTOM_THEME_PREFERRED_KEY = 'custom_theme_preferred';

const sanitizeCustomTheme = (
    theme: Theme,
    fallbackName: string,
    fallbackTheme: Theme,
): Theme => {
    const sanitized = sanitizeTheme(theme, {
        ...fallbackTheme,
        name: fallbackName,
        description: '',
        wordColors: [],
        lyricsIcons: [],
        provider: 'Custom',
    });

    return {
        ...sanitized,
        name: sanitized.name?.trim() || fallbackName,
        description: sanitized.description || '',
        provider: sanitized.provider || 'Custom',
    };
};

const sanitizeCustomDualTheme = (dualTheme: DualTheme): DualTheme => ({
    light: sanitizeCustomTheme(dualTheme.light, 'Theme Park Light', FALLBACK_AI_DUAL_THEME.light),
    dark: sanitizeCustomTheme(dualTheme.dark, 'Theme Park Dark', FALLBACK_AI_DUAL_THEME.dark),
});

const isValidTheme = (value: unknown): value is Theme => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<Theme>;
    return typeof candidate.name === 'string'
        && typeof candidate.backgroundColor === 'string'
        && typeof candidate.primaryColor === 'string'
        && typeof candidate.accentColor === 'string'
        && typeof candidate.secondaryColor === 'string'
        && (candidate.fontStyle === 'sans' || candidate.fontStyle === 'serif' || candidate.fontStyle === 'mono')
        && (candidate.animationIntensity === 'calm' || candidate.animationIntensity === 'normal' || candidate.animationIntensity === 'chaotic');
};

const readStoredCustomTheme = (): DualTheme | null => {
    const saved = localStorage.getItem(CUSTOM_DUAL_THEME_KEY);
    if (!saved) {
        return null;
    }

    try {
        const parsed = JSON.parse(saved) as Partial<DualTheme>;
        if (!isValidTheme(parsed.light) || !isValidTheme(parsed.dark)) {
            return null;
        }

        return applyStoredAnimationIntensityToDualTheme(sanitizeCustomDualTheme({
            light: parsed.light,
            dark: parsed.dark,
        }));
    } catch {
        return null;
    }
};

const readStoredCustomPreferred = () => localStorage.getItem(CUSTOM_THEME_PREFERRED_KEY) === 'true';

const getSelectedDualTheme = (dualTheme: DualTheme, isDaylight: boolean) => (
    isDaylight ? dualTheme.light : dualTheme.dark
);

/** The theme the app shows in a mode (`isDaylight`), from the song's theme sources. */
export const resolveControllerTheme = ({
    bgMode,
    aiTheme,
    legacyTheme,
    customTheme,
    isDaylight,
    defaultTheme,
    daylightTheme,
    previousTheme,
}: {
    bgMode: ThemeMode;
    aiTheme: DualTheme | null;
    legacyTheme: Theme | null;
    customTheme: DualTheme | null;
    isDaylight: boolean;
    defaultTheme: Theme;
    daylightTheme: Theme;
    previousTheme: Theme;
}): Theme => {
    const normalizeTheme = (nextTheme: Theme) => applyStoredAnimationIntensityToTheme(nextTheme);

    if (bgMode === 'custom' && customTheme) {
        return normalizeTheme(getSelectedDualTheme(customTheme, isDaylight));
    }

    if (bgMode === 'ai') {
        if (aiTheme) {
            return normalizeTheme(getSelectedDualTheme(aiTheme, isDaylight));
        }

        if (legacyTheme) {
            return normalizeTheme(legacyTheme);
        }
    }

    // The default source is the built-in theme itself: an AI or legacy theme stays loaded so the
    // user can switch back to it, but lends none of its colors here (#947).
    return normalizeTheme(resolveBgModeTheme({
        mode: bgMode === 'custom' ? 'default' : bgMode,
        aiTheme,
        isDaylight,
        defaultTheme,
        daylightTheme,
        previousTheme,
    }));
};

export function useThemeController({
    defaultTheme,
    daylightTheme,
    isDaylight,
    setDaylightPreference,
    coverUrl,
    t,
}: {
    defaultTheme: Theme;
    daylightTheme: Theme;
    isDaylight: boolean;
    setDaylightPreference: (enabled: boolean) => void;
    coverUrl?: string | null;
    t: (key: string, options?: Record<string, unknown>) => string;
}) {
    const getBaseTheme = () => getBaseThemeForMode({ defaultTheme, daylightTheme, isDaylight });
    const storedCustomTheme = useMemo(readStoredCustomTheme, []);
    const initialCustomTheme = useMemo(() => (
        storedCustomTheme ?? buildDefaultCustomDualTheme({ defaultTheme, daylightTheme })
    ), [daylightTheme, defaultTheme, storedCustomTheme]);
    const initialThemePreferenceState = useMemo<ThemePreferenceSwitchState>(() => {
        const customPreferred = Boolean(initialCustomTheme && readStoredCustomPreferred());
        if (customPreferred) {
            return {
                isCustomThemePreferred: true,
                songThemeAutoSwitchEnabled: false,
                songThemeAutoGenerateEnabled: false,
            };
        }

        const autoSwitchEnabled = readStoredThemeAutoSwitchEnabled();
        return {
            isCustomThemePreferred: false,
            songThemeAutoSwitchEnabled: autoSwitchEnabled,
            songThemeAutoGenerateEnabled: autoSwitchEnabled && readStoredThemeAutoGenerateEnabled(),
        };
    }, [initialCustomTheme]);

    const [theme, setTheme] = useState<Theme>(() => applyStoredAnimationIntensityToTheme(getBaseTheme()));
    const [aiTheme, setAiTheme] = useState<DualTheme | null>(null);
    const [legacyTheme, setLegacyTheme] = useState<Theme | null>(null);
    const [customTheme, setCustomTheme] = useState<DualTheme | null>(initialCustomTheme);
    const [isCustomThemePreferred, setIsCustomThemePreferred] = useState(initialThemePreferenceState.isCustomThemePreferred);
    const [songThemeAutoSwitchEnabled, setSongThemeAutoSwitchEnabled] = useState(initialThemePreferenceState.songThemeAutoSwitchEnabled);
    const [songThemeAutoGenerateEnabled, setSongThemeAutoGenerateEnabled] = useState(initialThemePreferenceState.songThemeAutoGenerateEnabled);
    const [themeGenerationSource, setThemeGenerationSource] = useState<ThemeGenerationSource>(() => readStoredThemeGenerationSource());
    const [bgMode, setBgMode] = useState<ThemeMode>(() => (
        initialCustomTheme && initialThemePreferenceState.isCustomThemePreferred ? 'custom' : 'default'
    ));
    const [currentSongHasLocalAiTheme, setCurrentSongHasLocalAiTheme] = useState(false);
    const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
    const activeThemeGenerationCountRef = useRef(0);
    const themeGenerationSongKeysRef = useRef(new Set<string>());

    const themeSourceModel = useMemo(() => buildThemeSourceModel({
        bgMode,
        aiTheme,
        legacyTheme,
        customTheme,
        isDaylight,
        defaultTheme,
        daylightTheme,
        currentSongHasLocalAiTheme,
    }), [aiTheme, bgMode, customTheme, daylightTheme, defaultTheme, isDaylight, legacyTheme, currentSongHasLocalAiTheme]);

    // The three switches are mutually constrained by the resolvers, so they are only ever written
    // together through applyPreferenceSwitchState -- which lets a ref mirror them exactly. Reading the
    // render-scoped state instead would make two resolver calls in one handler (config import applies
    // both song-theme flags back to back) both start from the pre-import snapshot, so the second
    // write would silently discard the first.
    const preferenceSwitchRef = useRef<ThemePreferenceSwitchState>(initialThemePreferenceState);

    const getPreferenceSwitchState = (): ThemePreferenceSwitchState => preferenceSwitchRef.current;

    const applyPreferenceSwitchState = (state: ThemePreferenceSwitchState) => {
        preferenceSwitchRef.current = state;
        setIsCustomThemePreferred(state.isCustomThemePreferred);
        setSongThemeAutoSwitchEnabled(state.songThemeAutoSwitchEnabled);
        setSongThemeAutoGenerateEnabled(state.songThemeAutoGenerateEnabled);
    };

    const beginThemeGeneration = () => {
        activeThemeGenerationCountRef.current += 1;
        setIsGeneratingTheme(true);
    };

    const endThemeGeneration = () => {
        activeThemeGenerationCountRef.current = Math.max(0, activeThemeGenerationCountRef.current - 1);
        setIsGeneratingTheme(activeThemeGenerationCountRef.current > 0);
    };

    useEffect(() => {
        if (customTheme) {
            localStorage.setItem(CUSTOM_DUAL_THEME_KEY, JSON.stringify(customTheme));
        } else {
            localStorage.removeItem(CUSTOM_DUAL_THEME_KEY);
        }
    }, [customTheme]);

    useEffect(() => {
        localStorage.setItem(CUSTOM_THEME_PREFERRED_KEY, String(isCustomThemePreferred && !!customTheme));
    }, [customTheme, isCustomThemePreferred]);

    useEffect(() => {
        saveStoredAnimationIntensity(theme.animationIntensity);
    }, [theme.animationIntensity]);

    useEffect(() => {
        saveStoredThemeAutoSwitchEnabled(songThemeAutoSwitchEnabled);
    }, [songThemeAutoSwitchEnabled]);

    useEffect(() => {
        saveStoredThemeAutoGenerateEnabled(songThemeAutoGenerateEnabled);
    }, [songThemeAutoGenerateEnabled]);

    useEffect(() => {
        saveStoredThemeGenerationSource(themeGenerationSource);
    }, [themeGenerationSource]);

    useEffect(() => {
        const pointer = bgMode === 'custom' && customTheme
            ? 'custom'
            : bgMode === 'ai' && (aiTheme || legacyTheme)
                ? 'ai'
                : 'default';
        saveStoredLastAppliedThemePointer(pointer);
    }, [aiTheme, bgMode, customTheme, legacyTheme]);

    useEffect(() => {
        setTheme(previousTheme => resolveControllerTheme({
            bgMode, aiTheme, legacyTheme, customTheme, isDaylight, defaultTheme, daylightTheme, previousTheme,
        }));
    }, [aiTheme, bgMode, customTheme, daylightTheme, defaultTheme, isDaylight, legacyTheme]);

    // The song's light and dark themes: the pair `theme` is picked from by the app's mode (a scene takes
    // the one that fits its own picture, whatever that mode).
    const songThemePair = useMemo((): DualTheme => {
        const sources = { bgMode, aiTheme, legacyTheme, customTheme, defaultTheme, daylightTheme, previousTheme: theme };
        return {
            light: resolveControllerTheme({ ...sources, isDaylight: true }),
            dark: resolveControllerTheme({ ...sources, isDaylight: false }),
        };
    }, [aiTheme, bgMode, customTheme, daylightTheme, defaultTheme, legacyTheme, theme]);

    const handleToggleDaylight = (isLight: boolean) => {
        setDaylightPreference(isLight);
    };

    const handleBgModeChange = (mode: ThemeMode) => {
        if (mode === 'custom' && !customTheme) {
            return;
        }

        setBgMode(mode);
    };

    const handleResetTheme = () => {
        setAiTheme(null);
        setLegacyTheme(null);
        setBgMode('default');
    };

    const applyDefaultTheme = () => {
        setAiTheme(null);
        setLegacyTheme(null);
        setBgMode('default');
        setStatusMsg({
            type: 'success',
            text: t('notifications.appliedDefaultTheme', { themeName: isDaylight ? 'Daylight Default' : 'Midnight Default' }),
        });
    };

    const applyDualTheme = (
        dualTheme: DualTheme,
        options?: { respectCustomPreference?: boolean }
    ) => {
        const normalizedDualTheme = applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(dualTheme));
        setLegacyTheme(null);
        setAiTheme(normalizedDualTheme);
        void saveToCache('last_dual_theme', normalizedDualTheme);
        const respectCustomPreference = options?.respectCustomPreference ?? true;
        if (!respectCustomPreference || !isCustomThemePreferred) {
            setBgMode('ai');
        }
    };

    const applyLegacyTheme = (
        nextLegacyTheme: Theme,
        options?: { respectCustomPreference?: boolean }
    ) => {
        const normalizedLegacyTheme = applyStoredAnimationIntensityToTheme(
            sanitizeTheme(nextLegacyTheme, FALLBACK_AI_DUAL_THEME.dark),
        );
        setAiTheme(null);
        setLegacyTheme(normalizedLegacyTheme);
        void saveToCache('last_theme', normalizedLegacyTheme);
        const respectCustomPreference = options?.respectCustomPreference ?? true;
        if (!respectCustomPreference || !isCustomThemePreferred) {
            setBgMode('ai');
        }
    };

    const applyThemeFallback = () => {
        setAiTheme(null);
        setLegacyTheme(null);
        if (bgMode !== 'custom') {
            setBgMode('default');
        }
    };

    const getThemeParkSeedTheme = (): DualTheme => {
        if (bgMode === 'custom' && customTheme) {
            return customTheme;
        }

        if (aiTheme) {
            return aiTheme;
        }

        const baseDualTheme = applyStoredAnimationIntensityToDualTheme({
            light: {
                ...daylightTheme,
                wordColors: [],
                lyricsIcons: [],
            },
            dark: {
                ...defaultTheme,
                wordColors: [],
                lyricsIcons: [],
            },
        });

        if (legacyTheme) {
            if (isDaylight) {
                baseDualTheme.light = sanitizeCustomTheme({ ...legacyTheme }, legacyTheme.name || 'Theme Park Light', FALLBACK_AI_DUAL_THEME.light);
            } else {
                baseDualTheme.dark = sanitizeCustomTheme({ ...legacyTheme }, legacyTheme.name || 'Theme Park Dark', FALLBACK_AI_DUAL_THEME.dark);
            }
            return baseDualTheme;
        }

        if (isDaylight) {
            baseDualTheme.light = sanitizeCustomTheme({ ...theme }, theme.name || 'Theme Park Light', FALLBACK_AI_DUAL_THEME.light);
        } else {
            baseDualTheme.dark = sanitizeCustomTheme({ ...theme }, theme.name || 'Theme Park Dark', FALLBACK_AI_DUAL_THEME.dark);
        }

        return baseDualTheme;
    };

    const saveCustomDualTheme = (dualTheme: DualTheme) => {
        const sanitized = applyStoredAnimationIntensityToDualTheme(sanitizeCustomDualTheme(dualTheme));
        setCustomTheme(sanitized);
        setBgMode('custom');
        setStatusMsg({
            type: 'success',
            text: t('notifications.savedCustomTheme', { themeName: getSelectedDualTheme(sanitized, isDaylight).name }),
        });
        return sanitized;
    };

    const saveEditedAiDualTheme = (
        dualTheme: DualTheme,
        songOrKey?: SongResult | ThemeCacheSongKey | null,
    ) => {
        const sanitized = applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(dualTheme));
        setLegacyTheme(null);
        setAiTheme(sanitized);
        setBgMode('ai');
        void saveToCache('last_dual_theme', sanitized);
        const syncSong = songOrKey && typeof songOrKey === 'object' ? songOrKey : null;
        const songKey = syncSong ? getPlaybackSongKey(syncSong) : songOrKey;
        if (songKey != null) {
            void saveToCache(`dual_theme_${songKey}`, sanitized);
        }
        if (syncSong) {
            saveSyncedThemeWithoutBlocking(syncSong, sanitized, 'edited');
        }
        setStatusMsg({
            type: 'success',
            text: t('status.aiThemeUpdated', { themeName: getSelectedDualTheme(sanitized, isDaylight).name }),
        });
        return sanitized;
    };

    const applyCustomTheme = () => {
        if (!customTheme) {
            return;
        }

        setBgMode('custom');
        setStatusMsg({
            type: 'success',
            text: t('notifications.appliedCustomTheme', { themeName: getSelectedDualTheme(customTheme, isDaylight).name }),
        });
    };

    const handleCustomThemePreferenceChange = (enabled: boolean) => {
        if (!customTheme && enabled) {
            return;
        }

        applyPreferenceSwitchState(resolveCustomThemePreferenceChange(getPreferenceSwitchState(), enabled));
        if (enabled && customTheme) {
            setBgMode('custom');
        }

        setStatusMsg({
            type: 'info',
            text: t('notifications.' + (enabled ? 'customThemePreferredOn' : 'customThemePreferredOff')),
        });
    };

    const handleSongThemeAutoSwitchChange = (enabled: boolean) => {
        applyPreferenceSwitchState(resolveSongThemeAutoSwitchChange(getPreferenceSwitchState(), enabled));
        setStatusMsg({
            type: 'info',
            text: t('notifications.' + (enabled ? 'autoSwitchThemeOn' : 'autoSwitchThemeOff')),
        });
    };

    const handleSongThemeAutoGenerateChange = (enabled: boolean) => {
        applyPreferenceSwitchState(resolveSongThemeAutoGenerateChange(getPreferenceSwitchState(), enabled));
        setStatusMsg({
            type: 'info',
            text: t('notifications.' + (enabled ? 'autoGenerateThemeOn' : 'autoGenerateThemeOff')),
        });
    };

    const handleThemeGenerationSourceChange = (source: ThemeGenerationSource) => {
        setThemeGenerationSource(source);
        setStatusMsg({
            type: 'info',
            text: t(source === 'cover' ? 'notifications.themeSourceCover' : 'notifications.themeSourceAi'),
        });
    };

    const restoreThemeFromLastAppliedPointer = async () => {
        const pointer = readStoredLastAppliedThemePointer();

        if (pointer === 'custom' && customTheme) {
            setBgMode('custom');
            return 'restored' as const;
        }

        if (pointer === 'ai') {
            const lastDualTheme = await getLastDualTheme();
            if (lastDualTheme) {
                applyDualTheme(lastDualTheme, { respectCustomPreference: false });
                return 'fallback-dual' as const;
            }

            const lastLegacyTheme = await getLastLegacyTheme();
            if (lastLegacyTheme) {
                applyLegacyTheme(lastLegacyTheme, { respectCustomPreference: false });
                return 'legacy' as const;
            }
        }

        setAiTheme(null);
        setLegacyTheme(null);
        setBgMode('default');
        return 'restored' as const;
    };

    const restoreCachedThemeForSong = async (
        songOrId: ThemeCacheSongKey | SongResult,
        options?: { allowLastUsedFallback?: boolean; preserveCurrentOnMiss?: boolean }
    ) => {
        if (!songThemeAutoSwitchEnabled) {
            if (options?.allowLastUsedFallback) {
                return restoreThemeFromLastAppliedPointer();
            }
            return 'restored' as const;
        }

        const cachedTheme = typeof songOrId === 'object'
            ? await getCachedThemeStateForSong(songOrId)
            : await getCachedThemeState(songOrId);

        if (cachedTheme.kind === 'dual') {
            setCurrentSongHasLocalAiTheme(true);
            applyDualTheme(cachedTheme.theme, { respectCustomPreference: false });
            return 'dual' as const;
        }

        if (cachedTheme.kind === 'legacy') {
            setCurrentSongHasLocalAiTheme(true);
            applyLegacyTheme(cachedTheme.theme, { respectCustomPreference: false });
            return 'legacy' as const;
        }

        setCurrentSongHasLocalAiTheme(false);

        if (options?.allowLastUsedFallback) {
            const lastDualTheme = await getLastDualTheme();
            if (lastDualTheme) {
                applyDualTheme(lastDualTheme, { respectCustomPreference: false });
                return 'fallback-dual' as const;
            }

            const lastLegacyTheme = await getLastLegacyTheme();
            if (lastLegacyTheme) {
                applyLegacyTheme(lastLegacyTheme, { respectCustomPreference: false });
                return 'legacy' as const;
            }
        }

        if (options?.preserveCurrentOnMiss ?? true) {
            return 'none' as const;
        }

        applyThemeFallback();
        return 'none' as const;
    };

    // Cover-derived theme: the no-AI path. Shared by the "cover" generation source the user can
    // pick and by the fallback taken when the AI call fails for a missing API key.
    const applyCoverDerivedTheme = async (
        currentSong: SongResult | null,
        shouldApply: () => boolean,
        origin: 'chosen' | 'fallback',
    ): Promise<GenerateAIThemeResult> => {
        const coverColors = coverUrl ? await extractColors(coverUrl, 5) : [];
        const coverTheme = applyStoredAnimationIntensityToDualTheme(buildBuiltinDualTheme({ coverColors }));

        if (currentSong) {
            await saveToCache(`dual_theme_${getPlaybackSongKey(currentSong)}`, coverTheme);
            saveSyncedThemeWithoutBlocking(currentSong, coverTheme, 'fallback');
        }

        if (!shouldApply()) {
            return { status: 'generated', applied: false };
        }

        if (currentSong) {
            setCurrentSongHasLocalAiTheme(true);
        }
        applyDualTheme(coverTheme);
        const customPreferred = bgMode === 'custom' && customTheme;
        setStatusMsg(origin === 'fallback'
            ? {
                type: 'info',
                text: customPreferred
                    ? t('notifications.aiThemeGeneratedCustomPreferred')
                    : t('status.aiFallbackThemeUsed'),
            }
            : {
                type: 'success',
                text: customPreferred
                    ? t('notifications.aiThemeUpdatedCustomPreferred')
                    : t('status.coverThemeApplied', {
                        themeName: getSelectedDualTheme(coverTheme, isDaylight).name,
                    }),
            });

        return { status: 'generated', applied: true };
    };

    /**
     * 把云缓存取回的主题落到界面上。
     *
     * 与 `generateAITheme` 的区别：这里**没有生成**，主题是别人算好的，直接落盘 + 应用。
     * 所以它不看 AI 主题开关，也不需要 Key —— 这正是云缓存存在的意义。
     *
     * 落盘用与生成完全相同的那一套（本地缓存 + 跨设备同步），
     * 这样下一次换回这首歌时走的是普通缓存，不会再问云端。
     */
    const applyCloudTheme = async (song: SongResult, theme: DualTheme): Promise<void> => {
        const normalized = applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(theme));
        await saveToCache(`dual_theme_${getPlaybackSongKey(song)}`, normalized);
        saveSyncedThemeWithoutBlocking(song, normalized, 'auto');

        const latestSong = usePlaybackStore.getState().currentSong;
        const latestSongKey = latestSong ? getPlaybackSongKey(latestSong) : '__no_song__';
        // 取回来的路上已经换歌了：存进它自己的缓存就好，不要动现在这一首的画面。
        if (latestSongKey !== getPlaybackSongKey(song)) return;

        setCurrentSongHasLocalAiTheme(true);
        applyDualTheme(normalized);
        const selected = getSelectedDualTheme(normalized, isDaylight);
        setStatusMsg({
            type: 'success',
            text: t('status.cloudThemeApplied', { themeName: selected.name }),
        });
    };

    /**
     * 给当前这首歌定一个主题。
     *
     * 现在只有两个来源，按顺序试：
     *   1. **云缓存** —— 别人算过的同一份歌词，直接拿来用；
     *   2. **封面取色** —— 云端也没有这首歌，就从封面上取颜色。
     *
     * 没有第三条了：AI 生成那条路整个删掉了（见 services/aiText.ts）。所以这个函数
     * 不会失败 —— 最差也是封面主题，不需要任何 Key、不依赖任何外部模型。
     *
     * 名字与 `themeGenerationSongKeysRef` 这些留着旧的叫法，是因为它们描述的是
     * 「给这首歌定主题」这件事，而不是「去调模型」；调用点遍布整个应用，改名只会制造噪音。
     */
    const generateAITheme = async (
        lyrics: LyricData | null,
        currentSong: SongResult | null,
        options: GenerateAIThemeOptions = {},
    ): Promise<GenerateAIThemeResult> => {
        const source = options.source ?? 'manual';
        const songKey = currentSong ? getPlaybackSongKey(currentSong) : '__no_song__';
        // Read playback at completion time, even before React has rendered the next song.
        // A late result may populate its own cache, but must not update another song's UI.
        const shouldApply = () => {
            const latestSong = usePlaybackStore.getState().currentSong;
            const latestSongKey = latestSong ? getPlaybackSongKey(latestSong) : '__no_song__';
            return latestSongKey === songKey && (options.shouldApply?.() ?? true);
        };
        if (themeGenerationSongKeysRef.current.has(songKey)) {
            return { status: 'skipped', reason: 'in-flight' };
        }

        themeGenerationSongKeysRef.current.add(songKey);
        beginThemeGeneration();
        setStatusMsg({ type: 'info', text: t('status.generatingTheme') });
        try {
            // 用户明确选了「按封面」：直接从封面来，不必绕一趟云端。
            if (themeGenerationSource === 'cover') {
                return await applyCoverDerivedTheme(
                    currentSong,
                    shouldApply,
                    'chosen',
                );
            }

            const allText = lyrics?.lines.map(line => line.fullText).join('\n').trim() || '';
            const songTitle = currentSong?.name?.trim() || lyrics?.title?.trim() || '';
            const isPureMusic = Boolean(currentSong?.isPureMusic) || isPureMusicLyricText(allText);
            const promptText = (isPureMusic ? songTitle : allText) || allText;

            // 连歌词都没有（也没歌名）就走封面：纯音乐、还没解析出歌词的，都归这一档。
            if (!promptText) {
                return await applyCoverDerivedTheme(currentSong, shouldApply, 'fallback');
            }

            const cachedTheme = await readCloudThemeFromLyrics({ lyricSource: promptText, isPureMusic, songTitle });
            if (!cachedTheme) {
                // 云端没有这首 —— 这就是「最终结果」，不是错误。退回封面取色。
                return await applyCoverDerivedTheme(currentSong, shouldApply, 'fallback');
            }

            const normalizedDualTheme = applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(cachedTheme));
            if (currentSong) {
                await saveToCache(`dual_theme_${getPlaybackSongKey(currentSong)}`, normalizedDualTheme);
                saveSyncedThemeWithoutBlocking(currentSong, normalizedDualTheme, source === 'auto' ? 'auto' : 'manual');
            }

            if (!shouldApply()) {
                return { status: 'generated', applied: false };
            }

            if (currentSong) {
                setCurrentSongHasLocalAiTheme(true);
            }
            applyDualTheme(normalizedDualTheme);

            const selectedTheme = getSelectedDualTheme(normalizedDualTheme, isDaylight);
            setStatusMsg({
                type: 'success',
                text: bgMode === 'custom' && customTheme
                    ? t('notifications.aiThemeUpdatedCustomPreferred')
                    : t('status.cloudThemeApplied', { themeName: selectedTheme.name }),
            });

            return { status: 'generated', applied: true };
        } catch (error: unknown) {
            // 只可能是意料之外的事（存储写失败之类）：照样给一个封面主题，不让画面空着。
            console.error(error);
            if (isMissingAiApiKeyError(error)) {
                return await applyCoverDerivedTheme(
                    currentSong,
                    shouldApply,
                    'fallback',
                );
            }

            if (shouldApply()) {
                setStatusMsg({ type: 'error', text: t('status.themeGenerationFailed') });
            }
            return { status: 'failed' };
        } finally {
            themeGenerationSongKeysRef.current.delete(songKey);
            endThemeGeneration();
        }
    };

    const setThemeWithStoredIntensity = (nextTheme: Theme) => {
        if (isThemeAnimationIntensity(nextTheme.animationIntensity)) {
            saveStoredAnimationIntensity(nextTheme.animationIntensity);
        }
        setTheme(applyStoredAnimationIntensityToTheme(nextTheme));
    };

    // Every one of these is invoked from an event, an effect or async work - never read during
    // render for its identity - so a permanent identity is safe here and is what lets the five
    // build*Model memos in App.tsx hold. Before this they changed on every render of this hook,
    // which cascaded into playSong and from there into all four view models.
    const actions = useStableCallbacks({
        setTheme: setThemeWithStoredIntensity,
        setAiTheme,
        setBgMode,
        handleToggleDaylight,
        handleBgModeChange,
        handleResetTheme,
        applyDefaultTheme,
        applyDualTheme,
        applyLegacyTheme,
        applyThemeFallback,
        restoreCachedThemeForSong,
        generateAITheme,
        applyCloudTheme,
        getThemeParkSeedTheme,
        saveCustomDualTheme,
        saveEditedAiDualTheme,
        applyCustomTheme,
        handleCustomThemePreferenceChange,
        handleSongThemeAutoSwitchChange,
        handleSongThemeAutoGenerateChange,
        handleThemeGenerationSourceChange,
    });

    return {
        theme,
        songThemePair,
        aiTheme,
        customTheme,
        hasCustomTheme: Boolean(customTheme),
        themeSourceModel,
        isCustomThemePreferred,
        songThemeAutoSwitchEnabled,
        songThemeAutoGenerateEnabled,
        themeGenerationSource,
        bgMode,
        isGeneratingTheme,
        ...actions,
    };
}
