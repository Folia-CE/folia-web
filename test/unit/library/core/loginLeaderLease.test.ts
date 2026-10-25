// test/unit/library/core/loginLeaderLease.test.ts
// 跨标签租约：这模块同时承担「Leader 选举」与「single-flight」两项职责（A-41 第⑤条）。
// 顺序测试证明语义正确；交错测试证明「与写入先后无关」——旧方案（单键+回读）正是在交错下失效的。
import { describe, expect, it } from 'vitest';
import {
    LOGIN_LEADER_LEASE_MS,
    LOGIN_LEADER_CANDIDATE_PREFIX,
    currentLeaderId,
    holdsLeaderLease,
    leaderCandidateKey,
    publishLeaderCandidate,
    releaseLeaderLease,
    type LoginLeaderLockStorage,
} from '@/library/core/account/loginLeaderLease';

const NOW = 1_700_000_000_000;

/** 生产用 localStorage 支持枚举；不能枚举时模块会退化为单标签放行，那条分支也要测。 */
const createLockStorage = (enumerable = true) => {
    const data = new Map<string, string>();
    const base = {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => { data.set(key, value); },
        removeItem: (key: string) => { data.delete(key); },
    };
    if (!enumerable) return { storage: base as LoginLeaderLockStorage, raw: data };
    // 注意：length 必须是最终对象字面量上的 getter。
    // 若把它放进被展开的临时对象（{...{ get length() {} }}），展开会立即求值 getter，
    // length 会凝固成创建时的 0，候选表永远读不到东西。
    const storage: LoginLeaderLockStorage = {
        ...base,
        get length() { return data.size; },
        key: (index: number) => [...data.keys()][index] ?? null,
    };
    return { storage, raw: data };
};

describe('loginLeaderLease · 确定性裁决', () => {
    it('stands up a candidate and reports itself as leader when alone', () => {
        const { storage } = createLockStorage();
        expect(publishLeaderCandidate(storage, 'inst-aaa', NOW)).toBe(true);
        expect(holdsLeaderLease(storage, 'inst-aaa', NOW)).toBe(true);
        expect(currentLeaderId(storage, NOW)).toBe('inst-aaa');
    });

    it('picks the lexicographically smallest live id, regardless of who published first', () => {
        // 交错的核心：两种写入顺序必须得到同一个 leader。
        for (const order of [['inst-bbb', 'inst-aaa'], ['inst-aaa', 'inst-bbb']]) {
            const { storage } = createLockStorage();
            for (const id of order) publishLeaderCandidate(storage, id, NOW);
            expect(currentLeaderId(storage, NOW)).toBe('inst-aaa');
            expect(holdsLeaderLease(storage, 'inst-aaa', NOW)).toBe(true);
            expect(holdsLeaderLease(storage, 'inst-bbb', NOW)).toBe(false);
        }
    });

    it('reaches the same verdict for every publication order (deterministic, no interleaving needed)', () => {
        // 旧方案（单键+回读）在交错下会双赢，所以必须模拟交错才能抓到。
        // 新方案的裁决是「对最终候选集合的确定性函数」：只要集合相同，写入顺序无关。
        // 因此这里用「全排列」直接证明目标性质——比模拟某一种交错更强。
        const ids = ['inst-bbb', 'inst-aaa', 'inst-ccc'];
        const permutations = (input: string[]): string[][] => (
            input.length <= 1 ? [input] : input.flatMap((head, index) => (
                permutations([...input.slice(0, index), ...input.slice(index + 1)]).map(tail => [head, ...tail])
            ))
        );
        const verdicts = new Set<string | null>();
        for (const order of permutations(ids)) {
            const { storage } = createLockStorage();
            for (const id of order) publishLeaderCandidate(storage, id, NOW);
            const leaders = ids.filter(id => holdsLeaderLease(storage, id, NOW));
            expect(leaders).toHaveLength(1);
            verdicts.add(leaders[0]);
        }
        expect(verdicts).toEqual(new Set(['inst-aaa']));
    });

    it('never lets two instances both believe they are leader', () => {
        const { storage } = createLockStorage();
        publishLeaderCandidate(storage, 'inst-aaa', NOW);
        publishLeaderCandidate(storage, 'inst-bbb', NOW);
        publishLeaderCandidate(storage, 'inst-ccc', NOW);
        const leaders = ['inst-aaa', 'inst-bbb', 'inst-ccc'].filter(id => holdsLeaderLease(storage, id, NOW));
        // 旧方案（单键+回读）在交错下会得到 2 个以上；这里必须恰好 1 个。
        expect(leaders).toEqual(['inst-aaa']);
    });

    it('lets a follower take over once the leader stops renewing (lease expiry, no unload needed)', () => {
        const { storage } = createLockStorage();
        publishLeaderCandidate(storage, 'inst-aaa', NOW);
        publishLeaderCandidate(storage, 'inst-bbb', NOW);
        expect(holdsLeaderLease(storage, 'inst-bbb', NOW)).toBe(false);
        // aaa 被强杀：不调 release、不触发 beforeunload，只是心跳停了（不再续租）。
        // bbb 作为 follower 仍在续租，所以它的候选活得比 aaa 久。
        publishLeaderCandidate(storage, 'inst-bbb', NOW + LOGIN_LEADER_LEASE_MS - 1_000);
        const afterLeaderExpiry = NOW + LOGIN_LEADER_LEASE_MS + 1;
        expect(holdsLeaderLease(storage, 'inst-bbb', afterLeaderExpiry)).toBe(true);
        expect(currentLeaderId(storage, afterLeaderExpiry)).toBe('inst-bbb');
    });

    it('does not surrender to a smaller id that arrives later (first starter wins)', () => {
        const { storage } = createLockStorage();
        // FCFS：先到者成为唯一通道。后到者即使 ID 更小也必须让位 ——
        // 若按 ID 排序，后到的 B 会抢走 leadership 并再取一次码，单次登录打出两次上游请求。
        publishLeaderCandidate(storage, 'inst-mmm', NOW);
        expect(holdsLeaderLease(storage, 'inst-mmm', NOW)).toBe(true);
        publishLeaderCandidate(storage, 'inst-aaa', NOW + 10);
        expect(holdsLeaderLease(storage, 'inst-mmm', NOW + 10)).toBe(true);
        expect(holdsLeaderLease(storage, 'inst-aaa', NOW + 10)).toBe(false);
    });

    it('keeps the first arrival time across renewals, so heartbeats cannot make a late tab win', () => {
        const { storage } = createLockStorage();
        publishLeaderCandidate(storage, 'inst-mmm', NOW);
        publishLeaderCandidate(storage, 'inst-aaa', NOW + 10);
        // 后到者续租：它的 createdAt 仍是 NOW+10，不会因为续租变得更早。
        publishLeaderCandidate(storage, 'inst-aaa', NOW + 1_000);
        expect(holdsLeaderLease(storage, 'inst-mmm', NOW + 1_000)).toBe(true);
        expect(holdsLeaderLease(storage, 'inst-aaa', NOW + 1_000)).toBe(false);
    });

    it('keeps only its own candidate on release and ignores an expired one', () => {
        const { storage, raw } = createLockStorage();
        publishLeaderCandidate(storage, 'inst-aaa', NOW);
        publishLeaderCandidate(storage, 'inst-bbb', NOW);
        releaseLeaderLease(storage, 'inst-bbb');
        expect(raw.has(leaderCandidateKey('inst-bbb'))).toBe(false);
        expect(raw.has(leaderCandidateKey('inst-aaa'))).toBe(true);
        // 过期候选在读的时候顺手清掉，不会永久占着裁决表。
        const afterExpiry = NOW + LOGIN_LEADER_LEASE_MS + 1;
        expect(currentLeaderId(storage, afterExpiry)).toBeNull();
        expect(raw.size).toBe(0);
    });

    it('stores no account identifiers: key carries only the instance id, value is a number', () => {
        const { storage, raw } = createLockStorage();
        publishLeaderCandidate(storage, 'inst-aaa', NOW);
        const [key, value] = [...raw.entries()][0];
        expect(key).toBe(LOGIN_LEADER_CANDIDATE_PREFIX + 'inst-aaa');
        // 值是 createdAt:expiresAt 两个数字，不含任何账号标识。
        const [createdAt, expiresAt] = value.split(':');
        expect(Number.isFinite(Number(createdAt))).toBe(true);
        expect(Number.isFinite(Number(expiresAt))).toBe(true);
        expect(key + ':' + value).not.toMatch(/(uin|nickname|phone|token|session|authorization)/i);
    });

    it('degrades to single-tab semantics when the storage cannot enumerate', () => {
        const { storage } = createLockStorage(false);
        publishLeaderCandidate(storage, 'inst-aaa', NOW);
        publishLeaderCandidate(storage, 'inst-bbb', NOW);
        // 不能枚举 → 无法裁决 → 退化为「不做跨标签协调」，而不是留一个假互斥。
        expect(currentLeaderId(storage, NOW)).toBeNull();
        expect(holdsLeaderLease(storage, 'inst-bbb', NOW)).toBe(true);
    });
});
