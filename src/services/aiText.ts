import { DualTheme } from "../types";
import { applyStoredAnimationIntensityToDualTheme } from "./themePreferences";
import { sanitizeDualTheme } from "./themeSanitizer";
import {
  fingerprintLyricSource,
  readAiCloudCacheTheme,
} from "./aiCloudCache";

// src/services/aiText.ts
//
// 主题**只从云缓存来**。
//
// 这里早先是「窗口通向各家 AI 服务的唯一出口」（生成主题、切词、测试连接三条路，
// 桌面走主进程、网页走我们自己的 serverless 路由）。现在生成这条路整个删掉了：
// 不再有任何 AI Key、不再有任何一次模型调用，主题只从公共云缓存里取别人的结果。
//
// 换来的是三件事都成立了：
//   · 不需要任何 Key —— 部署和用户都不用再配一个；
//   · 不会因为模型抽风 / 额度用尽 / 网关超时而失败，只可能「云端没有这首」；
//   · 一次主题的代价从一次模型调用降成一次 GET。
//
// 代价是没有「这首没人生成过」时的新答案 —— 那种情况由调用方退回封面取色主题
// （见 useThemeController 的 generateAITheme）。

/**
 * 云端存回来的主题一律当不可信输入：形状不对就当没命中。
 *
 * ⚠️ 把「清洗」和「贴动画强度」分开看：前者决定这份数据能不能用，后者只是套一层本机偏好。
 * 早先这里把两步一起放在 try 里，结果是**本机偏好读不到就让整条缓存作废** ——
 * 明明是一份合法主题（`sanitizeDualTheme` 已经认了），却因为 localStorage 缺了个键
 * 被判成没命中，白丢一次免费命中。
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
 * 问一次云缓存：这份歌词有没有人算过主题。
 *
 * 这是主题唯一的来源，所以它**不看任何开关之外的东西** —— 不需要 Key、不看 AI 功能开没开，
 * 只看用户在设置里有没有把「云缓存」关掉（那是他自己选的，得尊重）。
 *
 * 没命中返回 null，调用方退回去用封面取色。
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
