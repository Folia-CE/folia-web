import { DualTheme } from "../types";
import { applyStoredAnimationIntensityToDualTheme } from "./themePreferences";
import { sanitizeDualTheme } from "./themeSanitizer";
import { isPureMusicLyricText } from "../utils/lyrics/pureMusic";
import {
  fingerprintLyricSource,
  listAiCloudCacheSongs,
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
    pure: isPureMusic === true,
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
        .map((line) => String(line?.fullText ?? ''))
        .join('\n')
        .trim();
    const isPureMusic = input.isPureMusic === true || lines.length === 0 || isPureMusicLyricText(allText);
    return {
        lyricSource: isPureMusic ? String(input.songTitle ?? '').trim() : allText,
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
const normalizeSongTitle = (value: string): string => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

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
    const songTitle = String(input.songTitle ?? '').trim();
    if (songTitle) {
        const byTitle = await readCloudThemeByTitle(songTitle, input.platform);
        if (byTitle) return byTitle;
    }

    const lyricSource = String(input.lyricSource ?? '');
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
