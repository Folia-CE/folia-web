// Plain ESM module shared with the Vercel and Worker runtimes; resolved through allowJs.
import { buildSegmentationManualPrompt } from '../../shared/lyricSegmentationPrompt.mjs';

// src/services/lyricSegmentationAi.ts
//
// 歌词分词的**提示词**只在这里。
//
// 这个文件早先是「向模型分词」的入口：分批、校验返回、报进度，请求都经 ./aiText 出去。
// 那条路随 AI 生成能力一起删掉了（见 services/aiText.ts），剩下的是复制粘贴那一条 ——
// 提示词照旧取自三个服务端路径共用的同一个 shared 模块，所以「你自己跑」和
// 「以前让它替你跑」问出来的是同一份东西，已有存档、导出与手动修正都不受影响。

/** The full prompt a user copies into a model site, lyrics included. */
export const buildLyricSegmentationPrompt = (lines: string[]): string => (
    buildSegmentationManualPrompt(lines)
);
