import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LyricData, StatusMessage, Theme } from '../../../types';
import type { LyricSegmentationRecord, LyricSegmentationSource } from '../../../types/lyricSegmentation';
import {
    SegmentationImportError,
    buildSegmentationExportText,
    countAppliedSegmentationLines,
    parseSegmentationImport,
} from '../../../utils/lyrics/lyricSegmentationRecord';
import { buildLyricSegmentationPrompt } from '../../../services/lyricSegmentationAi';
import { copyText } from '../../../utils/system/clipboard';
import LyricSegmentationActionBar from './LyricSegmentationActionBar';
import { registerLyricSegmentationHandle } from './lyricSegmentationSurface';
import type { LyricSegmentationAction } from '../lyricSegmentationQuery';
import LyricSegmentationLineList from './LyricSegmentationLineList';

// src/components/command-palette/surfaces/LyricSegmentationSurfaceView.tsx
//
// 歌词分词编辑器：一条是「复制提示词，自己拿去跑，再把结果贴回来」，一条是回到默认分词。
//
// 第三条 —— 让这个应用自己去调模型分词 —— 已经删掉了（整个 AI 生成能力都去掉了，
// 见 services/aiText.ts）。留下的是这条不依赖任何 Key 的路：提示词照旧由这里拼，
// 结果照旧由 parseSegmentationImport 校验并写进分词存档，所以分词存档、
// 歌词导出的按词切分、以及手动修正都照常工作。
//
// Height is CSS-resolved throughout: the palette body is a fixed box and nothing here measures it.

type LyricSegmentationSurfaceViewProps = {
    isDaylight: boolean;
    theme: Theme;
    t: (key: string, fallback?: string) => string;
    lyrics: LyricData | null;
    setStatusMsg: React.Dispatch<React.SetStateAction<StatusMessage | null>>;
    record: LyricSegmentationRecord | null;
    onSave: (lines: Record<string, string[]>, source: LyricSegmentationSource) => Promise<void>;
    onReset: () => Promise<void>;
    /** The flag the user is part-way through typing, so the matching button can be highlighted. */
    pendingAction?: LyricSegmentationAction | null;
    refocusInput?: () => void;
};

/** Lines the prompt is built from. Blank lines are skipped so they cannot shift the row mapping. */
const readSegmentableLines = (lyrics: LyricData) => lyrics.lines.filter(line => Boolean(line.fullText));

const LyricSegmentationSurfaceView: React.FC<LyricSegmentationSurfaceViewProps> = ({
    isDaylight,
    theme,
    t,
    lyrics,
    setStatusMsg,
    record,
    onSave,
    onReset,
    pendingAction,
}) => {
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // An import must not write a record after the surface is gone or the song changed.
    //
    // The setup line is load-bearing, not decoration. The app renders under React.StrictMode
    // (src/bootstrap.tsx), so in dev every effect runs mount → cleanup → mount on the same
    // instance. Without re-arming here the cleanup's `false` stuck for the component's whole life,
    // which silently disabled the guard below: a result arriving from a dead surface still saved.
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const segmentableLines = useMemo(() => (lyrics ? readSegmentableLines(lyrics) : []), [lyrics]);
    const appliedCount = countAppliedSegmentationLines(lyrics, record);

    const copy = async (text: string, successKey: string, fallback: string) => {
        try {
            await copyText(text);
            setStatusMsg({ type: 'success', text: t(successKey, fallback) });
        } catch {
            setError(t('lyricSegmentation.copyFailed', 'Could not write to the clipboard'));
        }
    };

    const runImport = async (text: string) => {
        if (!lyrics) return;
        setError(null);
        setIsImporting(true);
        try {
            const { lines } = parseSegmentationImport(text, lyrics);
            await onSave(lines, 'manual');
        } catch (importError) {
            if (!isMountedRef.current) return;
            setError(importError instanceof SegmentationImportError
                ? t(
                    `lyricSegmentation.importError.${importError.message}`,
                    importError.row ? `Line ${importError.row} does not match the lyrics` : 'Could not read that segmentation',
                ).replace('{{row}}', String(importError.row ?? ''))
                : String(importError));
        } finally {
            if (isMountedRef.current) setIsImporting(false);
        }
    };

    // One implementation behind both the buttons here and the palette input's flags/paste. Kept in
    // a ref-free effect so a re-render never leaves a stale closure registered.
    const copyPrompt = () => copy(
        buildLyricSegmentationPrompt(segmentableLines.map(line => line.fullText)),
        'lyricSegmentation.promptCopied',
        'Prompt and lyrics copied',
    );
    const copySegmentation = () => (lyrics ? copy(
        buildSegmentationExportText(lyrics),
        'lyricSegmentation.currentCopied',
        'Current segmentation copied',
    ) : undefined);

    const handleRef = useRef({ copyPrompt, copySegmentation, importText: runImport });
    handleRef.current = { copyPrompt, copySegmentation, importText: runImport };

    useEffect(() => registerLyricSegmentationHandle({
        // 这三个动作内部自带 try/catch，promise 不会带着未处理的 rejection 逃出去；协议要求 void。
        copyPrompt: () => { void handleRef.current.copyPrompt(); },
        copySegmentation: () => { void handleRef.current.copySegmentation(); },
        importText: text => { void handleRef.current.importText(text); },
    }), []);

    const handleReset = () => {
        setError(null);
        void onReset();
    };

    // 没有歌词就没有可切的东西：仍然渲染（提示词为空串），但把状态说清楚。
    const statusText = error
        ? error
        : `${appliedCount} / ${segmentableLines.length}`;

    return (
        <div className="flex h-full min-h-0 flex-col">
            {lyrics && (
                <LyricSegmentationLineList
                    lyrics={lyrics}
                    record={record}
                    accentColor={theme.accentColor}
                    isDaylight={isDaylight}
                />
            )}
            <LyricSegmentationActionBar
                isDaylight={isDaylight}
                t={t}
                statusText={statusText}
                isImporting={isImporting}
                hasRecord={Boolean(record)}
                pendingAction={pendingAction ?? null}
                onCopyPrompt={() => { void copyPrompt(); }}
                onCopyCurrent={() => { void copySegmentation(); }}
                onReset={handleReset}
            />
        </div>
    );
};

export default LyricSegmentationSurfaceView;

