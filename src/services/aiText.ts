import { DualTheme } from "../types";
import { applyStoredAnimationIntensityToDualTheme } from "./themePreferences";
import { sanitizeDualTheme } from "./themeSanitizer";
import { getWebAiProvider, type WebAiProvider } from "./runtimeConfig";
import { isPureMusicLyricText } from "../utils/lyrics/pureMusic";
import {
  fingerprintLyricSource,
  listAiCloudCacheSongs,
  readAiCloudCacheTheme,
} from "./aiCloudCache";

/**
 * 云端存回来的主题一律当不可信输入：形状不对就当没命中。
 * ⚠️ 把「清洗」和「贴动画强度」分开看：前者决定这份数据能不能用，后者只是套一层本机偏好。
 * 早先这里把两步一起放在 try 里，结果是**本机偏好读不到就让整条缓存作废** ——
 * 明明是一份合法主题（`sanitizeDualTheme` 已经认了），却因为 localStorage 缺了个键
 * 被判成没命中，白丢一次免费命中。
 */
const validateCachedDualTheme = (value: unknown): DualTheme | null => {
  if (!value || typeof value !== 'object') return null;
  let sanitized: DualTheme;
  try {
    sanitized = sanitizeDualTheme(value);
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
 * 缓存键里那一段「设置」。
 *
 * ⚠️ 这一段**不能省**。云缓存里的条目是上游那套导演链路推上去的，它算键时把这段
 * `policy` 拼了进去；我们这边要是按空串算，同一个 `stage` 前缀下就是两个完全不同的
 * md5 —— 服务端那边有货，这边也永远算不出能命中的键。早先「云缓存用不了」就是这个：
 * 键的算法没对齐，命中率恒为 0。
 *
 * 字段顺序不能动：`JSON.stringify` 按插入顺序出串，顺序一变，md5 就变。
 * `hint` / `blocked` 对应上游的「用户提示」「屏蔽样式」，本仓库删掉 AI 生成之后没有
 * 这两样设置，所以恒为空 —— 上游用默认设置生成的那批条目正好能对上。
 */
const buildStagePolicy = (isPureMusic: boolean): string => JSON.stringify({
    pure: isPureMusic,
    hint: '',
    blocked: [],
});

/**
 * 「喂进去的那段歌词」—— 指纹与上游共用同一个结果。
 *
 * 纯音乐没有歌词，上游拿来算键的是**歌名**；普通歌曲是歌词行按换行拼起来再 trim。
 * 顺序和空白都得照做，差一个空格就是另一个键。
 */
export const resolveStageLyricSource = (input: {
    lines?: readonly { fullText?: string }[];
    isPureMusic?: boolean;
    songTitle?: string;
}): { lyricSource: string; isPureMusic: boolean } => {
    const lines = input.lines ?? [];
    const allText = lines
        .map((line) => line?.fullText ?? '')
        .join('\n')
        .trim();
    const isPureMusic = input.isPureMusic === true || lines.length === 0 || isPureMusicLyricText(allText);
    return {
        lyricSource: isPureMusic ? (input.songTitle ?? '').trim() : allText,
        isPureMusic,
    };
};

/**
 * 问一次云缓存：这份歌词有没有人算过主题。
 *
 * 这是主题唯一的来源，所以它**不看任何开关之外的东西** —— 不需要 Key、不看 AI 功能开没开，
 * 只看用户在设置里有没有把「云缓存」关掉（那是他自己选的，得尊重）。
 *
 * 没命中返回 null，调用方退回去用封面取色。
 */
/**
 * 歌名比对用的归一化：大小写、首尾空白、中间多余空格都不该影响「是不是同一首」。
 * 标点和括号**刻意不剥** —— 「(Live)」「(伴奏)」是不同版本，剥掉就会把别版的配色套上来。
 */
const normalizeSongTitle = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * 按歌名去云缓存里找一条。
 *
 * 为什么不只算指纹：云缓存里的键是**上游按它自己的口径**算的（歌词正文怎么拼、policy 里
 * 塞了什么，都是它那边的实现细节）。我们照抄一份算法，也只在那份算法一字不差时才对得上。
 * 「歌名 + 平台」则是两边都必然有的东西，服务端还专门给了 `?q=` 的搜索 —— 按它找，
 * 比猜键的算法稳得多。
 */
const readCloudThemeByTitle = async (
    songTitle: string,
    platform?: string,
): Promise<DualTheme | null> => {
    const page = await listAiCloudCacheSongs({ limit: 20, query: songTitle });
    const wanted = normalizeSongTitle(songTitle);
    const matches = page.songs.filter(entry => normalizeSongTitle(entry.songTitle) === wanted);
    if (!matches.length) return null;
    // 同一个歌名会有几个平台 / 几个歌词版本：优先本平台，其次命中数高的（更可能是对的那版）。
    const ordered = [...matches].sort((left, right) => {
        const leftSame = platform && left.platform === platform ? 1 : 0;
        const rightSame = platform && right.platform === platform ? 1 : 0;
        return rightSame - leftSame || (right.hits ?? 0) - (left.hits ?? 0);
    });
    for (const entry of ordered.slice(0, 3)) {
        const theme = await readAiCloudCacheTheme<DualTheme>({
            fingerprint: entry.key,
            validate: validateCachedDualTheme,
        });
        if (theme) return theme;
    }
    return null;
};

/**
 * 问一次云缓存：这首歌有没有人算过主题。
 *
 * 这是主题唯一的来源，所以它**不看任何开关之外的东西** —— 不需要 Key、不看 AI 功能开没开，
 * 只看用户在设置里有没有把「云缓存」关掉（那是他自己选的，得尊重）。
 *
 * 两条路，先歌名、后指纹：歌名那条不依赖上游的键算法，命中率更高；
 * 指纹那条留着兜底，万一哪天上游把算法公开对齐了，它也能命中。
 *
 * 没命中返回 null，调用方退回去用封面取色。
 */
export const readCloudThemeFromLyrics = async (input: {
    lyricSource: string;
    isPureMusic?: boolean;
    songTitle?: string;
    platform?: string;
}): Promise<DualTheme | null> => {
    const songTitle = (input.songTitle ?? '').trim();
    if (songTitle) {
        const byTitle = await readCloudThemeByTitle(songTitle, input.platform);
        if (byTitle) return byTitle;
    }

    const lyricSource = input.lyricSource;
    if (!lyricSource) return null;
    return readAiCloudCacheTheme<DualTheme>({
        fingerprint: fingerprintLyricSource(
            'stage',
            lyricSource,
            buildStagePolicy(input.isPureMusic === true),
        ),
        validate: validateCachedDualTheme,
    });
};

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

export const generateThemeFromLyrics = async (
  lyricsText: string,
  options?: { isPureMusic?: boolean; songTitle?: string }
): Promise<DualTheme> => {
  try {
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
  } catch (error) {
    console.error("Failed to generate theme via API:", error);
    throw error;
  }
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
