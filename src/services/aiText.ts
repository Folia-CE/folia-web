import { DualTheme } from "../types";
import { applyStoredAnimationIntensityToDualTheme } from "./themePreferences";
import { sanitizeDualTheme } from "./themeSanitizer";
import { getWebAiProvider, type WebAiProvider } from "./runtimeConfig";
import {
  fingerprintLyricSource,
  fingerprintLyricText,
  withAiCloudCache,
} from "./aiCloudCache";
export {
  AI_PROVIDER_PRESETS,
  inferAiProviderFromUrl,
  modelAlwaysThinks,
  resolveAiConnection,
  resolveAiProviderPreset,
  retiredModelHint,
} from '../../shared/ai/providerRegistry.mjs';

// src/services/aiText.ts

/**
 * The window's one way out to the AI text services (Gemini, OpenAI and OpenAI-compatible hosts).
 * The app asks them for three things: a theme made from a song's lyrics, a segmentation of lyric
 * lines into words, and the connection test of the settings form. This file is the only place in
 * src/ that knows how those asks leave the window: the desktop bridge (window.electron's
 * generateTheme, segmentLyrics and testAiConnection) and our own web routes (/api/generate-theme,
 * /api/generate-theme_openai, /api/segment-lyrics).
 *
 * The window never sends a request to a service itself. The only key it handles is the one typed
 * into the settings form, which it hands to the main process to store or to test. On the desktop
 * the main process sends the request, with the service and the key from the user's settings
 * (electron/aiTextClient.cjs, behind the IPC handlers in electron/main.cjs). On the web our
 * serverless routes send it, with the deployment's key (worker/, and api-ts/ built into api/;
 * segmentation in shared/lyricSegmentationService.mjs). Which service the web build uses is the
 * deployment's choice, read by ./runtimeConfig.
 *
 * It lives in src/services/ because the theme controller, the OBS overlay, the lyric segmentation
 * and the settings form all use it, and none of them owns it.
 *
 * The settings form also reads the provider registry through here (presets, sites, default and
 * retired models: shared/ai/providerRegistry.mjs), so no component imports shared/ai/ itself.
 */

/** Our web route for the theme ask, one per service. */
const THEME_ROUTES: Record<WebAiProvider, string> = {
  gemini: '/api/generate-theme',
  openai: '/api/generate-theme_openai',
};

/** Anything that is not a service of the table goes to Gemini's route. */
const themeRoute = (provider: WebAiProvider) => THEME_ROUTES[provider] ?? THEME_ROUTES.gemini;

/** Our web route for the segmentation ask. The route picks the service itself. */
const SEGMENTATION_ROUTE = '/api/segment-lyrics';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? '');
};

/** What our web theme routes answer when the deployment has no key; they say it for nothing else. */
const WEB_ROUTE_WITHOUT_KEY = 'Server configuration error';

export const isMissingAiApiKeyError = (error: unknown) => {
  const message = getErrorMessage(error);
  return message === WEB_ROUTE_WITHOUT_KEY
    || (/(?:openai_api_key|gemini_api_key|api key)/i.test(message)
      && /(?:not configured|missing|configure)/i.test(message));
};

/** 有没有桌面端那条「去主进程生成主题」的桥。有它就不走云缓存。 */
const hasDesktopThemeBridge = (): boolean => (
  typeof window !== 'undefined'
  && (window as any).electron
  && typeof (window as any).electron.generateTheme === 'function'
);

export const generateThemeFromLyrics = async (
  lyricsText: string,
  options?: { isPureMusic?: boolean; songTitle?: string }
): Promise<DualTheme> => {
  try {
    // 桌面端不走云缓存：主题由主进程生成，那台机器有自己的 Key，
    // 而且主进程那条路本来就会把结果落到本机缓存。硬要走一趟云端，
    // 等于给每次生成多加一次网络往返 —— 桌面端一个字节都不该发出去。
    if (hasDesktopThemeBridge()) {
      return generateThemeUncached(lyricsText, options);
    }

    // 云缓存：先问「这份歌词有没有人生成过」。
    //
    // 命中就直接用别人的答案 —— 这对**没填 Key 的人**是关键：他本来一个主题都生成不出来，
    // 能命中别人的结果就是白赚。缓存永不阻塞功能，所以下面所有失败都只是「没命中」。
    //
    // ⚠️ 指纹的输入必须与**服务端**算键的口径一致，否则永远命中不了：
    //   1. 调用方（useThemeController）传进来的 `lyricsText` 已经是
    //      `lines.map(fullText).join('\n').trim()`，且纯音乐时已换成歌名 —— 不要再加工一遍，
    //      这里原样拿去哈希就好；
    //   2. policy 用空串：folia-major 没有「屏蔽样式 / 偏好提示」这套设置，服务端那半边
    //      对老条目也是按纯歌词算的，两边才对得上（见 aiCloudCache.ts）。
    // `stage` 是线上那台服务实际存放主题的 kind（详见 aiCloudCache.ts 的说明）。
    const fingerprint = fingerprintLyricSource('stage', lyricsText);
    const { value: cached, source } = await withAiCloudCache<DualTheme>({
      kind: 'stage',
      fingerprint,
      generate: () => generateThemeUncached(lyricsText, options),
      validate: (value) => {
        if (!value || typeof value !== 'object') return null;
        try {
          return applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(value as DualTheme));
        } catch {
          return null;
        }
      },
      songTitle: options?.songTitle,
      lyricHash: fingerprintLyricText(lyricsText),
      isPureMusic: options?.isPureMusic,
    });
    if (source === 'cloud') {
      console.info('[Folia] AI 主题：已从云端缓存取回');
    }
    return cached;
  } catch (error) {
    console.error("Failed to generate theme via API:", error);
    throw error;
  }
};

/** 真正去要一次主题（缓存没有时才会走到这里）。 */
const generateThemeUncached = async (
  lyricsText: string,
  options?: { isPureMusic?: boolean; songTitle?: string }
): Promise<DualTheme> => {
  // Check if running in Electron environment
  if ((window as any).electron && typeof (window as any).electron.generateTheme === 'function') {
    const dualTheme = await (window as any).electron.generateTheme(lyricsText, options);
    return sanitizeDualTheme(dualTheme);
  }

  const response = await fetch(themeRoute(getWebAiProvider()), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lyricsText, ...options }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate theme');
  }

  const dualTheme = await response.json();
  return applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(dualTheme as DualTheme));
};

// The AI connection the web OBS overlay (Dynamic AI mode) generates a theme with. The overlay runs
// in a separate browser context, so it takes an explicit provider instead of reading anything from
// the app; the provider is selected by Docker runtime config or the Vite build fallback.
export interface ObsAiConfig {
  provider: WebAiProvider;
}

// OBS-overlay variant of generateThemeFromLyrics: keyless (the endpoint uses its own server env
// key), abortable, and with no Electron branch since the overlay is web-only. Used per song by the
// overlay; the caller falls back to the builtin theme if it rejects.
export const generateObsThemeFromLyrics = async (
  lyricsText: string,
  options: { isPureMusic?: boolean; songTitle?: string } | undefined,
  aiConfig: ObsAiConfig,
  signal?: AbortSignal,
): Promise<DualTheme> => {
  const response = await fetch(themeRoute(aiConfig.provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lyricsText, ...(options ?? {}) }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || 'Failed to generate theme');
  }

  const dualTheme = await response.json();
  return applyStoredAnimationIntensityToDualTheme(sanitizeDualTheme(dualTheme as DualTheme));
};

type SegmentationBridge = {
  segmentLyrics?: (lines: string[]) => Promise<string[][]>;
};

const getSegmentationBridge = (): SegmentationBridge | null => {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { electron?: SegmentationBridge }).electron;
  return bridge && typeof bridge.segmentLyrics === 'function' ? bridge : null;
};

/** Whether an AI segmentation request can be made at all from this build. */
export const isLyricSegmentationAiAvailable = (): boolean => (
  typeof window !== 'undefined' && (Boolean(getSegmentationBridge()) || typeof fetch === 'function')
);

/**
 * One segmentation request: the desktop build goes through IPC so it can use the model the user
 * configured in settings, and the web build posts to the deployment's own route because its
 * credentials live server-side. Resolves to the rows as they were answered; checking them against
 * the lines is the caller's. `signal` only reaches the web path; ipcRenderer.invoke cannot be
 * cancelled.
 */
export const requestLyricSegmentation = async (lines: string[], signal?: AbortSignal): Promise<unknown> => {
  const bridge = getSegmentationBridge();
  if (bridge?.segmentLyrics) {
    return bridge.segmentLyrics(lines);
  }

  const response = await fetch(SEGMENTATION_ROUTE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Failed to segment lyrics');
  }

  return (payload as { lines?: unknown }).lines;
};

/** Whether model discovery can run here; saved credentials stay in the desktop main process. */
export const canListAiModels = (): boolean => Boolean(window.electron?.listAiModels);

/** Loads the current connection's models without exposing its saved key to the renderer. */
export const fetchAiModels = (payload: AiConnectionTestPayload): Promise<AiModelListResult> => (
  window.electron?.listAiModels
    ? window.electron.listAiModels(payload)
    : Promise.resolve({ ok: false, errorKind: 'config' })
);

/** Whether the connection test can run here. It is desktop only: there is no web route for it. */
export const canRunAiConnectionTest = (): boolean => Boolean(window.electron?.testAiConnection);

/**
 * Hands the unsaved values of the settings form to the main process, which sends one "hello" with
 * them and answers with what came back. Only where canRunAiConnectionTest() says yes.
 */
export const runAiConnectionTest = (payload: AiConnectionTestPayload): Promise<AiConnectionTestResult> => (
  window.electron!.testAiConnection(payload)
);
