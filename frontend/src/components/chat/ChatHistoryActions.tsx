import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Download, Edit2, MoreHorizontal, Trash2 } from 'lucide-react';

interface Props {
    label: string;
    summary?: ReactNode;
    compact?: boolean;
    disabled?: boolean;
    onDownload: () => void;
    onDelete: () => void;
    onRename?: () => void;
}

export function ChatHistoryActions({ label, summary, compact, disabled, onDownload, onDelete, onRename }: Props) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const closeOutside = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => document.removeEventListener('pointerdown', closeOutside);
    }, [open]);

    const run = (action: () => void) => {
        setOpen(false);
        action();
    };
    const actionClass = 'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-slate-700';

    return <div ref={containerRef} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
            buttonRef.current?.focus();
        }
    }}>
        <div className="flex min-w-0 items-center justify-between gap-2">
            {summary}
            <button ref={buttonRef} type="button" aria-label={label} title={label}
                aria-expanded={open && !disabled} aria-controls={open && !disabled ? panelId : undefined}
                disabled={disabled} onClick={() => setOpen((current) => !current)}
                className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700">
                <MoreHorizontal className="h-4 w-4" />{!compact && 'Actions'}
            </button>
        </div>
        {open && !disabled && <div id={panelId} role="group" aria-label={label}
            className="mt-1 rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-200">
            {onRename && <button type="button" className={actionClass} onClick={() => run(onRename)}><Edit2 className="h-3.5 w-3.5" />Rename</button>}
            <button type="button" className={actionClass} onClick={() => run(onDownload)}><Download className="h-3.5 w-3.5" />Download TXT</button>
            <button type="button" className={`${actionClass} text-red-600 dark:text-red-400`} onClick={() => run(onDelete)}><Trash2 className="h-3.5 w-3.5" />Delete</button>
        </div>}
    </div>;
}
