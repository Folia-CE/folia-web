import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// test/unit/services/aiTextArchitecture.test.ts
//
// AI 主题生成已经整个删掉了（用户定，2026-10-26）：主题只从公共云缓存来，
// 见 src/services/aiText.ts。这个文件因此**反过来**守：确保那套东西不会被悄悄塞回来。
//
// 早先它读 src/ 下每个文件、禁止别处提到我们的 AI 路由 / 桥方法 / 服务地址 / Key 设置名。
// 现在那些名字一个都不该出现 —— 连 aiText.ts 自己也不该有，因为那里只剩一次云缓存 GET。
//
// 它不看模型名，也不看 'gemini' / 'openai' 这两个服务 id：主题公园里「复制提示词、
// 自己拿去跑、再把 JSON 贴回来」那条手动路是保留的（aiThemeTransfer），
// 它不调用任何服务、也不需要 Key，提一句模型名不构成能力。

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DOOR = 'src/services/aiText.ts';

const NAMES = {
    /** 我们的主题 / 分词路由。服务端还有实现，但窗口里不该再有人调它们。 */
    route: /\/api\/(?:generate-theme|segment-lyrics)/,
    /** 桌面桥里那几个让主进程替你调模型的方法。 */
    bridge: /\b(?:generateTheme|segmentLyrics|testAiConnection|listAiModels)\b/,
    /** 各家的接口地址。 */
    address: /generativelanguage\.googleapis\.com|api\.openai\.com|api\.deepseek\.com|api\.anthropic\.com|moonshot\.(?:cn|ai)|bigmodel\.cn|api\.z\.ai|dashscope|tencent(?:cloud)?maas|xiaomimimo/,
    /** 存 Key 的设置名。 */
    setting: /\b(?:GEMINI|OPENAI)_API_\w+|\b(?:VITE_)?AI_PROVIDER\b/i,
};
type Kind = keyof typeof NAMES;

const collectSourceFiles = async (relativeDir: string): Promise<string[]> => {
    const entries = await readdir(path.join(repoRoot, relativeDir), { withFileTypes: true });
    const files = await Promise.all(entries.map(async entry => {
        const relativePath = `${relativeDir}/${entry.name}`;
        if (entry.isDirectory()) return collectSourceFiles(relativePath);
        return /\.(ts|tsx)$/.test(entry.name) ? [relativePath] : [];
    }));
    return files.flat();
};

const kindsNamedIn = (source: string): Kind[] => (
    (Object.keys(NAMES) as Kind[]).filter(kind => NAMES[kind].test(source))
);

describe('AI generation stays gone from the window', () => {
    /**
     * 上游的墙面工具直接从桥里要主题（upstream 的写法，还没挪进 services/）。这份清单是
     * **迁移债**，不是许可：哪天它挪进来了，这几行就该删掉，测试会替我们盯着。
     */
    const KNOWN_UPSTREAM_BRIDGE_USERS: string[] = [
        'src/components/app/wall-tools/useAppWallToolsHost.ts',
        'src/components/wall/useWallToolsCommonActions.ts',
        'src/components/wall/wallToolsHost.ts',
    ];

    it('no source file names an AI route, bridge method, service address or key setting', async () => {
        const files = await collectSourceFiles('src');
        const sources = await Promise.all(files.map(file => readFile(path.join(repoRoot, file), 'utf8')));

        const violations = files.flatMap((file, index) => (
            kindsNamedIn(sources[index])
                .filter(kind => !(kind === 'bridge' && KNOWN_UPSTREAM_BRIDGE_USERS.includes(file)))
                .map(kind => `${file} names an AI ${kind}`)
        ));

        expect(violations).toEqual([]);
    }, 30_000);

    it('the theme source itself names none of them either', async () => {
        const door = await readFile(path.join(repoRoot, DOOR), 'utf8');

        // 这里曾经是 ['route', 'bridge', 'setting'] —— 那个文件当年是唯一的出口。
        // 现在它只问云缓存，一个都不该剩下。
        expect(kindsNamedIn(door)).toEqual([]);
    });

    it('the theme source only asks the cloud cache, and generates nothing', async () => {
        const door = await readFile(path.join(repoRoot, DOOR), 'utf8');

        expect(door).toContain('readAiCloudCacheTheme');
        // 没有生成入口：这几个名字曾经是这个文件的全部意义。
        expect(door).not.toContain('generateThemeFromLyrics');
        expect(door).not.toContain('generateObsThemeFromLyrics');
        expect(door).not.toContain('requestLyricSegmentation');
        expect(door).not.toMatch(/\bfetch\(/);
    });
});
