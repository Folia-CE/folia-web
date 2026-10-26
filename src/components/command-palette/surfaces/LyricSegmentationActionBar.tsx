import React from 'react';
import { Copy, FileText, RotateCcw } from 'lucide-react';
import type { LyricSegmentationAction } from '../lyricSegmentationQuery';

// src/components/command-palette/surfaces/LyricSegmentationActionBar.tsx
// Status line and actions for the segmentation surface.
//
// The per-line preview is what the user came to look at, so everything here is sized to get out of
// its way: four equally wide labelled buttons and a permanently open textarea took roughly half the
// panel and left eleven lyric lines visible out of forty-five. Only the AI action keeps its label —
// it is the one people come for and the one that has to show progress — while the rest are icon
// buttons with tooltips.
//
// There is no import control at all: pasting a segmentation into the palette's own input imports
// it, so the box the user is already typing in does that job. See lyricSegmentationSurface.

type LyricSegmentationActionBarProps = {
    isDaylight: boolean;
    t: (key: string, fallback?: string) => string;
    statusText: string;
    isImporting: boolean;
    hasRecord: boolean;
    /** Flag being typed in the palette input; its button is highlighted so the two line up. */
    pendingAction: LyricSegmentationAction | null;
    onCopyPrompt: () => void;
    onCopyCurrent: () => void;
    onReset: () => void;
};

type IconButtonProps = {
    isDaylight: boolean;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    children: React.ReactNode;
};

const IconButton: React.FC<IconButtonProps> = ({ isDaylight, label, onClick, disabled, active, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
            active
                ? (isDaylight ? 'bg-black/[0.12]' : 'bg-white/[0.20]')
                : (isDaylight ? 'bg-black/[0.06] hover:bg-black/[0.10]' : 'bg-white/[0.10] hover:bg-white/[0.16]')
        }`}
    >
        {children}
    </button>
);

const LyricSegmentationActionBar: React.FC<LyricSegmentationActionBarProps> = ({
    isDaylight,
    t,
    statusText,
    isImporting,
    hasRecord,
    pendingAction,
    onCopyPrompt,
    onCopyCurrent,
    onReset,
}) => {
    const busy = isImporting;

    return (
        <div className="flex shrink-0 items-center gap-1.5">
            <span className="mr-auto truncate text-[11px] font-semibold opacity-70">{statusText}</span>

            <IconButton isDaylight={isDaylight} disabled={busy} onClick={onCopyPrompt}
                active={pendingAction === 'copy-prompt'}
                label={t('lyricSegmentation.copyPrompt', 'Copy prompt')}>
                <FileText size={13} />
            </IconButton>
            <IconButton isDaylight={isDaylight} disabled={busy} onClick={onCopyCurrent}
                active={pendingAction === 'copy-seg'}
                label={t('lyricSegmentation.copyCurrent', 'Copy current')}>
                <Copy size={13} />
            </IconButton>
            <IconButton isDaylight={isDaylight} disabled={!hasRecord || busy} onClick={onReset}
                label={t('lyricSegmentation.reset', 'Restore default')}>
                <RotateCcw size={13} />
            </IconButton>
        </div>
    );
};

export default LyricSegmentationActionBar;

