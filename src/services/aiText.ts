import { DualTheme } from "../types";
import { applyStoredAnimationIntensityToDualTheme } from "./themePreferences";
import { sanitizeDualTheme } from "./themeSanitizer";
import { getWebAiProvider, type WebAiProvider } from "./runtimeConfig";
import {
  fingerprintLyricSource,
  fingerprintLyricText,
  readAiCloudCacheTheme,
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

/**
 * 云端存回来的主题一律当不可信输入：形状不对就当没命中。
 *
 * 两条路（换歌时的只读拉取、生成时的读穿）共用这一个闸门，
 * 免得一处严一处松 —— 服务端一条脏数据就能把播放页搞崩。
 *
 * ⚠️ 把「清洗」和「贴动画强度」分开看：前者决定这份数据能不能用，后者只是套一层本机偏好。
 * 早先这里把两步一起放在 try 里，结果是**本机偏好读不到就让整条缓存作废** ——
 * 明明是一份合法主题（`sanitizeDualTheme` 已经认了），却因为 localStorage 缺了个键
 * 被判成没命中，白丢一次免费命中，还要多烧一次模型调用。清洗过的就是能用的，
 * 强度贴不上就用清洗后的原样。
 */
const validateCachedDualTheme = (value: unknown): DualTheme | null => {
  if (!value || typeof value !== 'object') return null;
  let sanitized: DualTheme;
  try {
    sanitized = sanitizeDualTheme(value as DualTheme);
  } catch {
    return null;
  }
  try {
    return applyStoredAnimationIntensityToDualTheme(sanitized);
  } catch {
    return sanitized;
  }
};

/**
 * 换歌时先问一次云缓存，**不看 AI 主题功能开没开**。
 *
 * 为什么必须独立于开关：拉取是纯读，不需要 Key，也不花一次模型调用。
 * 把它挂在「生成」那一步后面（也就是只写在 generateThemeFromLyrics 里），
 * 结果是 AI 主题功能一关就再也查不到缓存 —— 而这恰恰最需要它：
 * 没开 AI、没填 Key 的人，本来一个主题都拿不到，缓存是他们唯一的机会。
 *
 * 没命中返回 null，调用方照旧走各自的逻辑（不生成、或走本地缓存）。
 */
export const readCloudThemeFromLyrics = async (
  lyricsText: string,
): Promise<DualTheme | null> => {
  if (!lyricsText) return null;
  return readAiCloudCacheTheme<DualTheme>({
    fingerprint: fingerprintLyricSource('stage', lyricsText),
    validate: validateCachedDualTheme,
  });
};

export const generateThemeFromLyrics = async (
  lyricsText: string,
  options?: { isPureMusic?: boolean; songTitle?: string }
): Promise<DualTheme> => {
  try {
    // 云缓存：先问「这份歌词有没有人生成过」。
    //
    // 命中就直接用别人的答案 —— 这对**没填 Key 的人**是关键：他本来一个主题都生成不出来，
    // 能命中别人的结果就是白赚。缓存永不阻塞功能，所以下面所有失败都只是「没命中」。
    //
    // 桌面端现在也走这一趟：早先这里跳过云缓存（理由是「主进程有自己的 Key，
    // 不该多一次往返」），但那样等于让桌面端永远吃不到公共缓存 —— 一份别人的答案
    // 白放着不取，反而要多花一次模型调用。一次 GET 换一次可能的免费命中，划算。
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
      validate: validateCachedDualTheme,
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
