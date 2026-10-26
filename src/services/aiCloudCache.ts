// src/services/aiCloudCache.ts
// AI 云缓存：把「这段歌词已经有人生成过了」这件事存到服务器上。
//
// 移植自 folia-sonnet，按 folia-major 的主题链路裁掉了一半：
// folia-sonnet 那边一次请求同时产出「主题 + 动画决策」，所以它有两种 kind（stage / theme）
// 与候选词比对那一整套；folia-major 的 AI 只产主题，于是这里只留 `theme` 这一种。
//
// 缓存键是**歌词正文的 MD5**，不是歌名、不是播放源 —— 同一份歌词，谁先生成谁上传，
// 后面的人直接取答案，不再烧一次模型调用。
//
// 两条纪律：
//  1. **拉取不需要 Key。** 开关默认打开正是为了没填 Key 的人：他本来一个主题都
//     生成不出来，能命中别人的结果就是白赚。
//  2. **缓存永不阻塞功能。** 拉失败、推失败、返回的 JSON 不认识 —— 全部静默退回
//     「照常生成」，缓存只是加速器，不是依赖。

import { isFoliaCloudCacheEnabled, resolveCloudApiUrl } from './foliaCloud';
import md5 from 'blueimp-md5';

/** 提示词一改，缓存就换一批：老答案的格式未必还能用。 */
const CACHE_SCHEMA = 'v1';
const REQUEST_TIMEOUT_MS = 12_000;
/** 同一个键刚问过「没有」就别再问，省一次往返。 */
const MISS_TTL_MS = 5 * 60 * 1000;

/**
 * 缓存条目的 kind。
 *
 * ⚠️ 用 `stage` 而不是 `theme`：线上那台服务里已经存了六万多条数据，全部落在 `stage`
 * 下面（folia-sonnet 那次改造把「主题 + 动画决策」合成一次请求之后只剩这一种）。
 * 写成 `theme` 的话服务端永远答 `hit:false` —— 缓存看起来「接上了」，实际一条也命中不了。
 *
 * 那边的条目形状是 `{ theme, decision }`：主题在 `payload.theme`，动画决策在
 * `payload.decision`（folia-major 不用后者）。所以下面读写都按这个形状来：
 * 上传时把自己这份主题包进 `{ theme }`，拉取时从 `payload.theme` 取出来。
 *
 * 这条对既有数据是**可读可写**的：老客户端推的 `{theme, decision}` 我们照样读得出主题，
 * 我们推上去的 `{theme}` 老客户端也能读到它的主题那一半。
 */
export type AiCloudCacheKind = 'stage';

/** `/api/ai-cache/<kind>/<md5>`。 */
export const resolveAiCloudCacheUrl = (kind: AiCloudCacheKind, key: string): string => (
    resolveCloudApiUrl(`ai-cache/${encodeURIComponent(kind)}/${encodeURIComponent(key)}`)
);

/** 「云端现在有哪些歌」—— 首页「AI 主题」那一屏的歌名清单。 */
const resolveAiCloudSongsUrl = (): string => resolveCloudApiUrl('ai-cache/songs');

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const withTimeout = (): AbortSignal => {
    const controller = new AbortController();
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
        window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    }
    return controller.signal;
};

/**
 * 歌词文件的指纹。
 *
 * `policy` 用来把「同一份词、不同设置」隔开：主题的生成受语言、动画强度这些设置影响，
 * 它们变了就该重新问一次，否则会拿到前一个设置的答案。
 */
export const fingerprintLyricSource = (
    kind: AiCloudCacheKind,
    lyricSource: string,
    policy = '',
): string => md5(`${CACHE_SCHEMA}\n${kind}\n${policy}\n${String(lyricSource ?? '')}`);

/** 歌词正文自己的 MD5（不含 policy）。服务端拿它跟平台上的歌词对一遍。 */
export const fingerprintLyricText = (lyricText: string): string => md5(String(lyricText ?? ''));

const missCache = new Map<string, number>();

const missKey = (kind: AiCloudCacheKind, key: string) => `${kind}:${key}`;

const rememberMiss = (kind: AiCloudCacheKind, key: string): void => {
    missCache.set(missKey(kind, key), Date.now());
    if (missCache.size > 200) {
        // Cheap eviction: the oldest misses are the least likely to be asked.
        const oldest = [...missCache.entries()].sort((left, right) => left[1] - right[1])[0];
        if (oldest) missCache.delete(oldest[0]);
    }
};

const wasRecentMiss = (kind: AiCloudCacheKind, key: string): boolean => {
    const at = missCache.get(missKey(kind, key));
    if (!at) return false;
    if (Date.now() - at > MISS_TTL_MS) {
        missCache.delete(missKey(kind, key));
        return false;
    }
    return true;
};

/**
 * 刚推上去的那一键，本地别再当成「没有」。
 *
 * push 成功说明云端这个键**现在一定有了**，可 missCache 还记着「5 分钟前问过一次
 * 没有」。于是切走再切回来时 pull 会被这条 miss 直接挡掉：不发 GET、直接走去生成 ——
 * 白烧一次模型，而「已从云端拉取缓存」这句提示也永远说不出来。
 */
const forgetMiss = (kind: AiCloudCacheKind, key: string): void => {
    missCache.delete(missKey(kind, key));
};

export type AiCloudCachePull =
    | { status: 'hit'; payload: unknown; matched: 'exact' }
    | { status: 'miss' }
    | { status: 'unavailable' };

/**
 * 歌名清单里的一行（按歌名去重：同一首歌的几个歌词版本合起来算一首）。
 */
export type AiCloudCacheSongEntry = {
    songTitle: string;
    platform: string;
    key: string;
    updatedAt: string;
    hits: number;
    /** 这个歌名下存了几个歌词版本。 */
    versions: number;
};

export type AiCloudCacheSongPage = {
    /** 云端一共有多少首（去重后）—— 客户端拿它先把屏幕铺满。 */
    total: number;
    limit: number;
    offset: number;
    songs: AiCloudCacheSongEntry[];
};

/**
 * 拉一段歌名。失败一律返回空页 —— 缓存的纪律是永不阻塞功能，
 * 这一屏只是「看看云端有什么」，拉不到就当没有。
 */
export const listAiCloudCacheSongs = async (
    { limit = 60, offset = 0, query = '' }: { limit?: number; offset?: number; query?: string } = {},
): Promise<AiCloudCacheSongPage> => {
    const empty: AiCloudCacheSongPage = { total: 0, limit, offset, songs: [] };
    if (!isFoliaCloudCacheEnabled()) return empty;
    const search = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
    });
    const trimmedQuery = String(query ?? '').trim();
    if (trimmedQuery) search.set('q', trimmedQuery);
    try {
        const response = await fetch(`${resolveAiCloudSongsUrl()}?${search.toString()}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: withTimeout(),
        });
        if (!response.ok) return empty;
        const data = await response.json().catch(() => null) as {
            ok?: unknown; total?: unknown; limit?: unknown; offset?: unknown; songs?: unknown;
        } | null;
        const list = Array.isArray(data?.songs) ? data?.songs : [];
        const songs: AiCloudCacheSongEntry[] = [];
        list.forEach((entry: unknown) => {
            if (!isPlainObject(entry)) return;
            const songTitle = String(entry.songTitle ?? '').trim().slice(0, 200);
            if (!songTitle) return;
            songs.push({
                songTitle,
                platform: String(entry.platform ?? '').trim().slice(0, 64),
                key: String(entry.key ?? '').trim().toLowerCase(),
                updatedAt: String(entry.updatedAt ?? ''),
                hits: Number(entry.hits ?? 0) || 0,
                versions: Number(entry.versions ?? 1) || 1,
            });
        });
        return {
            total: Number(data?.total ?? songs.length) || 0,
            limit: Number(data?.limit ?? limit) || limit,
            offset: Number(data?.offset ?? offset) || offset,
            songs,
        };
    } catch {
        return empty;
    }
};

/**
 * 把服务端的条目 payload 取出「主题那一半」。
 *
 * 线上的条目是 `{ theme, decision }`；也兼容直接就是主题对象的情况（早期数据、
 * 或别人手工写的）。取不出来就返回 null，当作没命中。
 */
const themeFromPayload = (payload: unknown): unknown => {
    if (!isPlainObject(payload)) return null;
    if ('theme' in payload) {
        const theme = payload.theme;
        return isPlainObject(theme) ? theme : null;
    }
    // 没有 theme 这一层：它自己就是主题（有 light / dark 之一即可认）。
    return ('light' in payload || 'dark' in payload) ? payload : null;
};

/**
 * 一次 GET，把原始 payload 交回调用方（校验是调用方的事）。
 */
export const fetchEntry = async (kind: AiCloudCacheKind, key: string): Promise<unknown> => {
    try {
        const response = await fetch(resolveAiCloudCacheUrl(kind, key), {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: withTimeout(),
        });
        if (!response.ok) return null;
        const data = await response.json().catch(() => null) as { hit?: unknown; entry?: unknown } | null;
        const entry = data?.entry;
        if (data?.hit !== true || !isPlainObject(entry) || !('payload' in entry)) return null;
        return themeFromPayload(entry.payload);
    } catch {
        return null;
    }
};

export interface AiCloudCachePushMeta {
    songTitle?: string;
    /** 这首歌来自哪个音乐平台（netease / qq / kugou …）。 */
    platform?: string;
    /** 歌词正文的 MD5（不含 policy）。 */
    lyricHash?: string;
    /** 纯音乐：喂给模型的（也参与指纹的）是歌名而不是歌词正文。 */
    isPureMusic?: boolean;
    /** 生成用的模型名，只作为诊断信息。 */
    provider?: string;
    model?: string;
}

/**
 * 拉一次。
 *
 * folia-major 只生成主题、没有「按歌名挑候选」那套歌词比对，所以这里读**精确键**：
 * 键是「歌词 + policy」的 MD5，同一份歌词的人算出来的一定相同。
 *
 * 出错一律当「没命中」，调用方照常生成。
 */
export const pullAiCloudCache = async (
    kind: AiCloudCacheKind,
    key: string,
): Promise<AiCloudCachePull> => {
    if (!isFoliaCloudCacheEnabled()) return { status: 'unavailable' };
    if (!/^[a-f0-9]{32}$/.test(key)) return { status: 'unavailable' };
    if (wasRecentMiss(kind, key)) return { status: 'miss' };

    try {
        const response = await fetch(resolveAiCloudCacheUrl(kind, key), {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: withTimeout(),
        });
        if (response.ok) {
            const data = await response.json().catch(() => null) as { hit?: unknown; entry?: unknown } | null;
            const entry = data?.entry;
            if (data?.hit === true && isPlainObject(entry) && 'payload' in entry) {
                const theme = themeFromPayload(entry.payload);
                if (theme) return { status: 'hit', payload: theme, matched: 'exact' };
            }
        }
    } catch {
        // 缓存只是加速器：拉不到就当没有。
    }

    rememberMiss(kind, key);
    return { status: 'miss' };
};

/** 推一次。失败就当没发生过，绝不打断已经生成好的结果。 */
export const pushAiCloudCache = async (
    kind: AiCloudCacheKind,
    key: string,
    payload: unknown,
    meta: AiCloudCachePushMeta = {},
): Promise<boolean> => {
    if (!isFoliaCloudCacheEnabled()) return false;
    if (!/^[a-f0-9]{32}$/.test(key)) return false;

    // 按服务端的形状包一层：`{ theme }`。不包成 `{ theme: ..., decision: ... }` 是因为
    // folia-major 出不了动画决策，硬塞一个空的 `decision` 会把别人推上来的完整条目
    // 抹成半截 —— 只写自己有的那一半。
    const framed = isPlainObject(payload) && ('light' in payload || 'dark' in payload)
        ? { theme: payload }
        : payload;

    try {
        const response = await fetch(resolveAiCloudCacheUrl(kind, key), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                payload: framed,
                songTitle: meta.songTitle ?? '',
                provider: meta.provider ?? '',
                model: meta.model ?? '',
                platform: meta.platform ?? '',
                lyricHash: meta.lyricHash ?? '',
                isPureMusic: meta.isPureMusic === true,
            }),
            signal: withTimeout(),
        });
        if (response.ok) forgetMiss(kind, key);
        return response.ok;
    } catch {
        return false;
    }
};

export type AiCloudCacheSource = 'cloud' | 'ai';

/**
 * 只查一次云缓存，**不触发生成**。
 *
 * 这是给「换歌时先看看有没有现成的」用的，与 `withAiCloudCache` 的区别就一条：
 * 没命中就返回 null，不会去叫模型。所以它可以在**任何**状态下被调用 ——
 * AI 主题功能关着、没填 Key、甚至根本没打算生成，都可以先来查一下。
 *
 * 这与「拉取不需要 Key」那条纪律是一件事：拉取是纯读，它不该被生成开关挡在外面。
 *
 * `validate` 同样是调用方的闸门：缓存里的一律当不可信输入。
 */
export const readAiCloudCacheTheme = async <T>(options: {
    fingerprint: string;
    validate: (value: unknown) => T | null;
    kind?: AiCloudCacheKind;
}): Promise<T | null> => {
    const pulled = await pullAiCloudCache(options.kind ?? 'stage', options.fingerprint);
    if (pulled.status !== 'hit') return null;
    try {
        return options.validate(pulled.payload);
    } catch {
        return null;
    }
};

/**
 * 唯一该被功能代码调用的那个入口：先问缓存，没有再生成，生成完回传。
 *
 * `validate` 是调用方自己的闸门 —— 缓存里的东西**一律当不可信输入**处理，
 * 形状不对就跟没命中一样。少了这一步，服务端一条脏数据就能把播放页搞崩。
 */
export const withAiCloudCache = async <T>(options: {
    kind: AiCloudCacheKind;
    fingerprint: string;
    generate: () => Promise<T>;
    validate: (value: unknown) => T | null;
    songTitle?: string;
    platform?: string;
    lyricHash?: string;
    isPureMusic?: boolean;
    provider?: string;
    model?: string;
}): Promise<{ value: T; source: AiCloudCacheSource }> => {
    const { kind, fingerprint, generate, validate } = options;

    const pulled = await pullAiCloudCache(kind, fingerprint);
    if (pulled.status === 'hit') {
        const validated = validate(pulled.payload);
        if (validated) {
            // 命中就不再回传：内容与云端那份一样，重复 PUT 只是白费一次往返。
            return { value: validated, source: 'cloud' };
        }
    }

    const value = await generate();
    void pushAiCloudCache(kind, fingerprint, value, {
        songTitle: options.songTitle,
        platform: options.platform,
        lyricHash: options.lyricHash,
        isPureMusic: options.isPureMusic,
        provider: options.provider,
        model: options.model,
    }).catch(() => false);
    return { value, source: 'ai' };
};
