interface LoadingStateProps {
    label: string;
    compact?: boolean;
}

// Placeholders reserve space without presenting invented data as real values.
export function LoadingState({ label, compact = false }: LoadingStateProps) {
    return (
        <div role="status" aria-live="polite" className={`loading-state ${compact ? 'p-4' : 'content-panel rounded-2xl border p-6 sm:p-8'}`}>
            <p className="mb-5 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
            <div aria-hidden="true" className="space-y-4">
                <div className="skeleton h-5 w-2/5 rounded-lg" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-12 w-full rounded-xl" />
                {!compact && <div className="skeleton h-10 w-1/3 rounded-xl" />}
            </div>
        </div>
    );
}
