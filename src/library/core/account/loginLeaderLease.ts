// src/library/core/account/loginLeaderLease.ts
// 跨标签的「谁去取二维码」租约。**同一把锁同时承担两件事**：
//   1) Leader 选举：同一时刻只有一个标签持有租约；
//   2) single-flight：只有持有租约的标签才允许发起 login_qr_key + login_qr_create。
// 两套锁并存是最容易犯的错——并发时各自都"拿到自己的锁"，于是各生成一张码，指标回到 2。
//
// ── 为什么不用「单键 + 最后写入者胜 + 回读校验」 ────────────────────────────
// 那个方案在真并发下不成立：A 读(null) → B 读(null) → A 写 → B 写 → A 回读(若早于 B 写则读到自己)
// → 双方都以为自己拿到。回读只能发现「我写完后立刻被覆盖」，发现不了「我读的间隙里别人也在读」。
//
// ── 改用「候选键 + 确定性排序」（Lamport bakery 的简化版） ────────────────
// 每个实例只写**自己**的候选键 folia.login.cand.v1:<instanceId> = expiresAt；
// leader 的定义是「所有未过期候选里 instanceId 字典序最小的那个」——一个**确定性的全局裁决**，
// 与写入先后无关，因此不需要原子 CAS，只要「写入对所有标签可见」就成立。
// 两个标签同时进来时，无论谁先写，双方枚举到的都是同一个集合、选出同一个最小 ID：只有一方是 leader。
// 残余窗口：自己写完之后、对方还没写进来的那几毫秒 → 先等一个**静默期**再裁决；
// 心跳期间每次都重新裁决，发现别人 ID 更小就**立刻让位**（step down）。
//
// 释放只能靠**租约到期**，不依赖 beforeunload（被强杀不会触发）。
// 安全：候选键里只有 instanceId 与到期时刻，**禁止** uin / nickname / 手机号 / token。
// 介质：localStorage（跨标签可见）；sessionStorage 是每标签独立的，用它做锁等于没锁。

/** 候选键前缀：每个实例一条。 */
export const LOGIN_LEADER_CANDIDATE_PREFIX = 'folia.login.cand.v1:';

/** 租约时长：候选超过这个时间没续期就视为失效。 */
export const LOGIN_LEADER_LEASE_MS = 5_000;

/** 心跳间隔：必须显著小于租约时长。 */
export const LOGIN_LEADER_HEARTBEAT_MS = 1_500;

/** 静默期：写好自己的候选之后等这么久再裁决，让并发写入落定。 */
export const LOGIN_LEADER_SETTLE_MS = 120;

/** follower 重试间隔。 */
export const LOGIN_LEADER_RETRY_MS = 300;

/** 放弃等待上限：约两个租约周期，绝不无限等。 */
export const LOGIN_LEADER_MAX_WAIT_MS = LOGIN_LEADER_LEASE_MS * 2;

/**
 * 存储接口。**必须能枚举**（length + key(i)）才能做确定性裁决；
 * 不能枚举时退化为「不跨标签协调」（单标签语义），绝不退回有缺陷的单键方案。
 */
export type LoginLeaderLockStorage = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    readonly length?: number;
    key?(index: number): string | null;
};

/** 浏览器里没有 localStorage 时（SSR / 测试）当作「拿不到锁介质」→ 单标签直接放行。 */
export const browserLeaderLockStorage = (): LoginLeaderLockStorage | null => {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
};

/** 随机实例 ID：只用于区分标签，不含账号信息。 */
export const createLoginInstanceId = (): string => (
    'inst-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36)
);

// 页面级单例：**每次页面加载生成一次**，页面内重复创建会话复用同一个 ID。
// 若按「每次创建会话」生成，同一标签内关窗再开就会自己跟自己抢锁（旧候选还没过期）。
let pageInstanceId: string | null = null;
export const pageLoginInstanceId = (): string => {
    pageInstanceId ??= createLoginInstanceId();
    return pageInstanceId;
};

export const leaderCandidateKey = (instanceId: string): string => LOGIN_LEADER_CANDIDATE_PREFIX + instanceId;

/** 能否枚举：不能枚举就无法做确定性裁决。 */
const canEnumerate = (storage: LoginLeaderLockStorage): boolean => (
    typeof storage.key === 'function' && typeof storage.length === 'number'
);

/**
 * 这套存储能不能做跨标签协调。**所有降级分支都必须先问它**。
 *
 * 纪律：凡「有 A 能力就走 A、没有就降级」的路径，降级必须同时覆盖**判定、等待、清理**三处。
 * 只覆盖判定会表现为「功能正确但白等一段时间」——代码读起来完全正常，但测试和用户都能感觉到。
 */
export const canCoordinate = (storage: LoginLeaderLockStorage | null): boolean => (
    storage !== null && canEnumerate(storage)
);

/** 列出所有候选键（只读）。 */
const candidateKeys = (storage: LoginLeaderLockStorage): string[] => {
    if (!canEnumerate(storage)) return [];
    const keys: string[] = [];
    for (let index = 0; index < (storage.length ?? 0); index += 1) {
        const key = storage.key?.(index) ?? null;
        if (key !== null && key.startsWith(LOGIN_LEADER_CANDIDATE_PREFIX)) keys.push(key);
    }
    return keys;
};

/** 本实例的候选是否还活着。 */
/**
 * 候选值格式：`createdAt:expiresAt`（两个数字，冒号分隔）。
 * 兼容旧格式（只有一个 expiresAt）：把 createdAt 当作「最晚到达」，让老数据自然让位给新写入者，
 * 避免升级瞬间一条脏数据长期霸占 leadership。
 */
type LeaderCandidate = { createdAt: number; expiresAt: number };

const readCandidate = (storage: LoginLeaderLockStorage, instanceId: string): LeaderCandidate | null => {
    try {
        const raw = storage.getItem(leaderCandidateKey(instanceId));
        if (!raw) return null;
        const [left, right] = raw.split(':');
        if (right === undefined) {
            const expiresAt = Number(left);
            if (!Number.isFinite(expiresAt)) return null;
            return { createdAt: Number.POSITIVE_INFINITY, expiresAt };
        }
        const createdAt = Number(left);
        const expiresAt = Number(right);
        if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) return null;
        return { createdAt, expiresAt };
    } catch {
        return null;
    }
};

const ownCandidateAlive = (storage: LoginLeaderLockStorage, instanceId: string, now: number): boolean => {
    const candidate = readCandidate(storage, instanceId);
    return candidate !== null && candidate.expiresAt > now;
};

/**
 * 当前全局 leader：**先到先得（FCFS）**。
 *
 * 排序键 = [createdAt 升序, instanceId 字典序]。为什么不是单纯比 ID：
 * 若按 ID 排序，「A 先到并已取码、B 后到但 ID 更小」时 B 会抢走 leadership 再取一次码 ——
 * 单次登录就会打出两次上游请求（撤销不退配额，429 风险照算）。
 * FCFS 的语义才是 single-flight：第一个开始的成为唯一通道，后到者必须等它结束或租约到期。
 * ID 排序只保留一个作用：**同一毫秒并发**时打破平局，保证仍只有一个 leader。
 *
 * 这个裁决**不需要原子广播**：每个实例写入自己的 createdAt，任何时刻读到的集合对所有标签一致，
 * 排序结果因此也一致。「谁先写」这个事实存在数据里，不依赖读取顺序。
 * 顺手清掉已过期的候选键（避免无限积累）。不能枚举 → null。
 */
export const currentLeaderId = (storage: LoginLeaderLockStorage | null, now: number): string | null => {
    if (!storage) return null;
    if (!canEnumerate(storage)) return null;
    let leader: { instanceId: string; createdAt: number } | null = null;
    const expired: string[] = [];
    for (const key of candidateKeys(storage)) {
        const instanceId = key.slice(LOGIN_LEADER_CANDIDATE_PREFIX.length);
        const candidate = readCandidate(storage, instanceId);
        if (candidate === null || candidate.expiresAt <= now) {
            expired.push(key);
            continue;
        }
        // FCFS：createdAt 更早者优先；同一毫秒才用 ID 打破平局。
        const wins = leader === null
            || candidate.createdAt < leader.createdAt
            || (candidate.createdAt === leader.createdAt && instanceId < leader.instanceId);
        if (wins) leader = { instanceId, createdAt: candidate.createdAt };
    }
    for (const key of expired) {
        try { storage.removeItem(key); } catch { /* 忽略 */ }
    }
    return leader === null ? null : leader.instanceId;
};

/**
 * 写下 / 续期自己的候选。**不判断谁是 leader**——判断交给 currentLeaderId。
 * 返回 false 表示写不进去（配额 / 隐私模式），调用方按「稍后重试」处理。
 */
export const publishLeaderCandidate = (
    storage: LoginLeaderLockStorage | null,
    instanceId: string,
    now: number,
): boolean => {
    if (!storage) return true;
    // 续租必须保留**首次**到达时刻：否则每次心跳都把自己的 createdAt 刷新成「刚到的」，
    // 先到者会一路变得更「年轻」，FCFS 就退化成「谁最后心跳谁是 leader」——那正是双 leader 的来源。
    const createdAt = readCandidate(storage, instanceId)?.createdAt ?? now;
    try {
        storage.setItem(
            leaderCandidateKey(instanceId),
            String(createdAt) + ':' + String(now + LOGIN_LEADER_LEASE_MS),
        );
        return true;
    } catch {
        return false;
    }
};

/** 我现在是不是 leader（自己候选活着，且是未过期候选里最小的 ID）。 */
export const holdsLeaderLease = (
    storage: LoginLeaderLockStorage | null,
    instanceId: string,
    now: number,
): boolean => {
    // 没有锁介质 / 不能枚举：单标签语义，直接放行（不影响登录）。
    if (!storage) return true;
    if (!canEnumerate(storage)) return true;
    if (!ownCandidateAlive(storage, instanceId, now)) return false;
    return currentLeaderId(storage, now) === instanceId;
};

/** 主动让出：删掉自己的候选（正常停止时）。被强杀时走不到这里，由租约到期兜底。 */
export const releaseLeaderLease = (
    storage: LoginLeaderLockStorage | null,
    instanceId: string,
): void => {
    if (!storage) return;
    try { storage.removeItem(leaderCandidateKey(instanceId)); } catch { /* 忽略 */ }
};
