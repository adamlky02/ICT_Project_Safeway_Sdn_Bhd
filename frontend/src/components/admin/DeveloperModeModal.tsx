import { useState, type FormEvent } from 'react';
import { Code2, Loader2, LockKeyhole } from 'lucide-react';
import { m } from 'motion/react';
import { API_URL, authenticatedFetch, readJson } from '../../api/client';
import type { Translation } from '../../translations';
import type { ApiErrorBody, DeveloperUnlockResponse } from '../../types';
import { fadeScale, modalBackdrop } from '../motion/presets';
import { inputStyle, primaryButtonStyle } from './styles';

interface DeveloperModeModalProps {
    t: Translation;
    onClose: () => void;
    onUnlocked: (token: string) => void;
}

// Developer Mode Modal (requires a fresh password check before sensitive tools are available)
export function DeveloperModeModal({ t, onClose, onUnlocked }: DeveloperModeModalProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setIsUnlocking(true);
        try {
            const response = await authenticatedFetch(`${API_URL}/api/developer/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await readJson<DeveloperUnlockResponse & ApiErrorBody>(response);
            if (!response.ok) throw new Error(data.detail || t.developer_unlock_failed || 'Unable to unlock Developer Mode.');
            setPassword('');
            onUnlocked(data.developer_token);
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Unable to unlock Developer Mode.');
        } finally {
            setIsUnlocking(false);
        }
    };

    return (
        <m.div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" variants={modalBackdrop} initial="hidden" animate="visible" exit="exit">
            <m.div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-violet-200/60 bg-white/95 p-6 shadow-2xl dark:border-violet-500/20 dark:bg-[#0a0a0a]/95 sm:p-8" variants={fadeScale}>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-amber-400 to-orange-500" />
                <div className="mb-5 flex items-center gap-4">
                    <div className="rounded-2xl bg-violet-100 p-3 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                        <Code2 size={25} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{t.developer_mode || 'Developer Mode'}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.developer_unlock_description || 'Confirm your password to access protected system controls.'}</p>
                    </div>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <label className="block space-y-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.password_label || 'Password'}
                        <div className="relative">
                            <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <input
                                autoFocus
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className={`${inputStyle} pl-10`}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                disabled={isUnlocking}
                                required
                            />
                        </div>
                    </label>

                    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isUnlocking} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                            {t.cancel || 'Cancel'}
                        </button>
                        <button type="submit" disabled={isUnlocking} className={`${primaryButtonStyle} px-4`}>
                            {isUnlocking ? <Loader2 className="animate-spin" size={17} /> : <LockKeyhole size={17} />}
                            {t.developer_unlock || 'Unlock'}
                        </button>
                    </div>
                </form>
            </m.div>
        </m.div>
    );
}
