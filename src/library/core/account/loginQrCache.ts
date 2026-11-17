// src/library/core/account/loginQrCache.ts
// 单标签内复用「还没过期、还没被扫过」的二维码：用户关窗再看、切平台再切回、页面刷新时，
// 不必再打 login_qr_key + login_qr_create（两次上游调用 = 一次二维码生成）。
// 安全红线（D）：只允许 key / qrImage / ttlMs / lastState 四个字段，外加计时用的 createdAt。
// 严禁 cookie、token、musickey、X-QQ-Session 或任何凭据；与 providerStorage 的 cookie 通道完全隔离。
// 存储只走 sessionStorage（关标签即消失），命名空间独立，不碰 localStorage 的凭据主通道。
//
// 键必须区分「登录方式」：QQ 的 QQ 扫码与微信扫码是两张**内容不同**的码，只按平台做键会让
// 用户切换方式后看到上一种方式的码——对方扫了必然失败，而且我们无从察觉。

/**
 * 命名空间。v2 = **缓存键结构版本**（v1 只含 providerId，v2 追加 methodId）。
 * 结构再变时继续递增：旧版条目落在别的键下，自然读不到、等于丢弃，不会出现「新版读到旧结构」。
 */
export const LOGIN_QR_CACHE_NAMESPACE = 'folia.qr.v2';

/** 未声明有效期的平台用的保守默认值（酷狗 / 网易）。这是**保守假设**，不是上游承诺：宁可早取新码，也不复用快过期的。 */
export const LOGIN_QR_CACHE_DEFAULT_TTL_MS = 120_000;

/** 唯一允许落盘的字段。测试据此断言键集严格相等。 */
export const LOGIN_QR_CACHE_FIELDS = ['key', 'qrImage', 'ttlMs', 'createdAt', 'lastState'] as const;

export type LoginQrCacheEntry = {
    key: string;
    qrImage: string;
    ttlMs: number;
    /**
     * 首次创建这张码的时刻，**复用命中时不得刷新**：
     * 它和 ttlMs 一起决定过期点，一刷新就等于把 TTL 无限续期，缓存永远不会过期。
     */
    createdAt: number;
    lastState: string;
};

/**
 * 只需要这几个方法，测试可以直接给一个 Map 包出来的假存储。
 * 枚举相关（length / key）是可选的：浏览器 sessionStorage 天然具备，用来在终态清理时
 * 把该平台**所有登录方式**的残留码一起清掉；假存储不实现时退化为只清当前方式。
 */
export type LoginQrCacheStorage = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    readonly length?: number;
    key?(index: number): string | null;
};

/** 浏览器里没有 sessionStorage 时（SSR / 测试）当作没有缓存。 */
export const browserQrCacheStorage = (): LoginQrCacheStorage | null => {
    try {
        return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
        // 隐私模式等场景访问即抛：当作没有缓存，不影响登录。
        return null;
    }
};

/** 键里必须带 methodId：没有登录方式时用空串占位，保证单方式平台的键稳定。 */
export const loginQrCacheKey = (providerId: string, methodId?: string | null): string => (
    LOGIN_QR_CACHE_NAMESPACE + ':' + providerId + ':' + (methodId ?? '')
);

const isFiniteNonNegative = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0
);

/** 把一条记录收成白名单字段；缺字段或类型不对就不认。 */
const normalize = (raw: unknown): LoginQrCacheEntry | null => {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Record<string, unknown>;
    if (typeof value.key !== 'string' || value.key === '') return null;
    if (typeof value.qrImage !== 'string') return null;
    if (!isFiniteNonNegative(value.ttlMs)) return null;
    if (!isFiniteNonNegative(value.createdAt)) return null;
    if (typeof value.lastState !== 'string') return null;
    return { key: value.key, qrImage: value.qrImage, ttlMs: value.ttlMs, createdAt: value.createdAt, lastState: value.lastState };
};

/**
 * 读一张仍然可用的码。过期（含刚好到点）就不认，并把这条清掉，避免下次再读到。
 * 只用注入的 now，不读 Date.now，测试可推进。
 */
export const readCachedLoginQr = (
    storage: LoginQrCacheStorage | null,
    providerId: string,
    methodId: string | null | undefined,
    now: number,
): LoginQrCacheEntry | null => {
    if (!storage) return null;
    const storageKey = loginQrCacheKey(providerId, methodId);
    let parsed: unknown;
    try {
        const text = storage.getItem(storageKey);
        if (!text) return null;
        parsed = JSON.parse(text);
    } catch {
        try { storage.removeItem(storageKey); } catch { /* 忽略 */ }
        return null;
    }
    const entry = normalize(parsed);
    if (!entry) {
        try { storage.removeItem(storageKey); } catch { /* 忽略 */ }
        return null;
    }
    if (now - entry.createdAt >= entry.ttlMs) {
        try { storage.removeItem(storageKey); } catch { /* 忽略 */ }
        return null;
    }
    // 只复用「还没被扫过」的码（本模块头部的契约）。扫码之后上游已经把这张码消费掉，
    // 再把它展示给用户，对方扫了永远等不到确认——静默失败，比报错难查得多。
    // 用白名单而不是只排除 'scanned'：将来上游多出新的中间态时，默认是不复用。
    if (entry.lastState !== 'waiting') {
        try { storage.removeItem(storageKey); } catch { /* 忽略 */ }
        return null;
    }
    return entry;
};

/** 写一张新码（只写白名单字段）。 */
export const writeCachedLoginQr = (
    storage: LoginQrCacheStorage | null,
    providerId: string,
    methodId: string | null | undefined,
    entry: { key: string; qrImage: string; ttlMs: number; lastState: string },
    now: number,
): void => {
    if (!storage) return;
    const payload: LoginQrCacheEntry = {
        key: entry.key,
        qrImage: entry.qrImage,
        ttlMs: entry.ttlMs,
        createdAt: now,
        lastState: entry.lastState,
    };
    try {
        storage.setItem(loginQrCacheKey(providerId, methodId), JSON.stringify(payload));
    } catch {
        // 配额满 / 隐私模式：缓存写不进去只是少了复用，不影响登录本身。
    }
};

/** 更新已缓存码的状态（waiting / scanned），让下次复用时知道它被扫过没有。 */
export const touchCachedLoginQrState = (
    storage: LoginQrCacheStorage | null,
    providerId: string,
    methodId: string | null | undefined,
    now: number,
    lastState: string,
): void => {
    const current = readCachedLoginQr(storage, providerId, methodId, now);
    if (!current) return;
    // 回传 current.createdAt：状态更新不得续期。
    writeCachedLoginQr(storage, providerId, methodId, { ...current, lastState }, current.createdAt);
};

/** 该平台的前缀：用来枚举 / 清理它下面所有登录方式的条目。 */
const providerPrefix = (providerId: string): string => LOGIN_QR_CACHE_NAMESPACE + ':' + providerId + ':';

/**
 * 清掉该平台**所有登录方式**的缓存（终态用：已确认 / 已过期 / 失败）。
 * 选「全清」而不是「只清当前方式」：切换登录方式后旧方式的那张码已经作废，
 * 留着只会占空间并可能在切回去时被误用；一次性清干净比省一次遍历更安全。
 * 存储不支持枚举时退化为只清当前方式（不会因此出错）。
 */
export const clearCachedLoginQr = (
    storage: LoginQrCacheStorage | null,
    providerId: string,
    methodId?: string | null,
): void => {
    if (!storage) return;
    const prefix = providerPrefix(providerId);
    const canEnumerate = typeof storage.key === 'function' && typeof storage.length === 'number';
    if (!canEnumerate) {
        try { storage.removeItem(loginQrCacheKey(providerId, methodId)); } catch { /* 忽略 */ }
        return;
    }
    const doomed: string[] = [];
    for (let index = 0; index < (storage.length ?? 0); index += 1) {
        const key = storage.key?.(index) ?? null;
        if (key !== null && key.startsWith(prefix)) doomed.push(key);
    }
    for (const key of doomed) {
        try { storage.removeItem(key); } catch { /* 忽略 */ }
    }
};
