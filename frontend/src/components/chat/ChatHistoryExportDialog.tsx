import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Download, X } from 'lucide-react';
import { downloadSessionHistory } from '../../api/chatHistory';
import type { ChatSessionSummary } from '../../types';

interface Props {
    session: ChatSessionSummary;
    onClose: () => void;
}

export function ChatHistoryExportDialog({ session, onClose }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const [range, setRange] = useState('all');
    const [rounds, setRounds] = useState('10');
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const count = Number(rounds);
    const valid = range === 'all' || (Number.isInteger(count) && count >= 1 && count <= 10000);

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);

    const handleDownload = async (event: FormEvent) => {
        event.preventDefault();
        if (!valid || downloading) return;
        setDownloading(true);
        setError('');
        try {
            await downloadSessionHistory(session.id, range === 'all' ? undefined : count);
            onClose();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Download failed. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={onClose}
            className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl backdrop:bg-black/50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id={titleId} className="text-lg font-semibold">Download chat history</h2>
                <button type="button" onClick={onClose} aria-label="Close download dialog" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 break-words text-sm text-slate-500 dark:text-slate-400">{session.title}</p>
            <form onSubmit={handleDownload} className="space-y-4">
                <fieldset disabled={downloading} className="space-y-3">
                    <legend className="mb-2 text-sm font-medium">Download range</legend>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="export-range" value="all" checked={range === 'all'} onChange={() => setRange('all')} />
                        Entire conversation
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="export-range" value="recent" checked={range === 'recent'} onChange={() => setRange('recent')} />
                        Most recent question-and-answer rounds
                    </label>
                    {range === 'recent' && <label className="block text-sm">
                        Number of rounds
                        <input type="number" min="1" max="10000" step="1" required value={rounds} onChange={(event) => setRounds(event.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600" />
                    </label>}
                </fieldset>
                <p className="text-xs text-slate-500 dark:text-slate-400">TXT file with saved messages and source titles. One round includes a question and its AI reply. If fewer rounds are available, all are included.</p>
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button type="submit" disabled={downloading || !valid} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                    <Download className="h-4 w-4" />{downloading ? 'Preparing download...' : 'Download TXT'}
                </button>
            </form>
        </dialog>
    );
}
