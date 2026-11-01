import { useId, useState, type FormEvent } from 'react';
import { Code2, Loader2, LockKeyhole } from 'lucide-react';
import { m } from 'motion/react';
import { API_URL, readJson } from '../../api/client';
import { authenticatedFetch } from '../session';
import type { Translation } from '../../translations';
import type { ApiErrorBody } from '../../types';
import type { DeveloperUnlockResponse } from '../types';
import { fadeScale, modalBackdrop } from '../../components/motion/presets';
import { inputStyle, primaryButtonStyle } from '../../components/admin/styles';

// Developer Unlock Controls (connects the password dialog to dismissal and authorized dashboard actions)
interface DeveloperModeModalProps {
    t: Translation;
    onClose: () => void;
    onUnlocked: (token: string) => void;
}

// Developer Mode Modal (requires a fresh password check before sensitive tools are available)
export function DeveloperModeModal({ t, onClose, onUnlocked }: DeveloperModeModalProps) {
    // Unlock State (keeps the password, validation feedback, and request progress within the dialog)
    const passwordId = useId();
    const titleId = useId();
    const descriptionId = useId();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Password Confirmation (exchanges a valid password for a developer token and clears the input on success)
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
            <m.div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="glass-panel developer-dialog relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border p-6 sm:p-8" variants={fadeScale}>
                <div className="mb-6 grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                        <Code2 size={25} />
                    </div>
                    <div className="min-w-0">
                        <h3 id={titleId} className="text-xl font-semibold leading-7 text-slate-900 dark:text-white">{t.developer_mode || 'Developer Mode'}</h3>
                        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t.developer_unlock_description || 'Confirm your password to access protected system controls.'}</p>
                    </div>
                </div>

                {/* Unlock Form (collects the current password and blocks duplicate requests while verification runs) */}
                <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor={passwordId} className="block text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">{t.password_label || 'Password'}</label>
                        <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <input
                                id={passwordId}
                                autoFocus
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className={`${inputStyle} h-12 pl-11 font-normal tracking-normal`}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                disabled={isUnlocking}
                                required
                            />
                        </div>
                    </div>

                    {/* Unlock Error (displays credential or network failures before another attempt) */}
                    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isUnlocking} className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                            {t.cancel || 'Cancel'}
                        </button>
                        <button type="submit" disabled={isUnlocking} className={`${primaryButtonStyle} h-12 px-4`}>
                            {isUnlocking ? <Loader2 className="animate-spin" size={17} /> : <LockKeyhole size={17} />}
                            {t.developer_unlock || 'Unlock'}
                        </button>
                    </div>
                </form>
            </m.div>
        </m.div>
    );
}
