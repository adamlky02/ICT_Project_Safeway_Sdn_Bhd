import { CircleAlert, CircleCheck } from 'lucide-react';

interface FeedbackBannerProps {
    message: string;
    tone?: 'success' | 'error';
    actionLabel?: string;
    onAction?: () => void;
    busy?: boolean;
}

export function FeedbackBanner({ message, tone = 'success', actionLabel, onAction, busy }: FeedbackBannerProps) {
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`feedback-banner flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-red-300/60 bg-red-50 text-red-800 dark:border-red-400/25 dark:bg-red-950/30 dark:text-red-200' : 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
            {tone === 'error' ? <CircleAlert size={18} className="shrink-0" aria-hidden="true" /> : <CircleCheck size={18} className="shrink-0" aria-hidden="true" />}
            <p className="min-w-0 flex-1">{message}</p>
            {onAction && <button type="button" disabled={busy} onClick={onAction} className="min-h-10 rounded-lg px-3 font-semibold underline underline-offset-4 disabled:opacity-50">{actionLabel}</button>}
        </div>
    );
}
