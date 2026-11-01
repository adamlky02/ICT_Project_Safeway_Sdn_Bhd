import type { FormEvent } from 'react';
import { Check, Edit3, LoaderCircle } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { ProfileFormData, UserProfile } from '../../types';
import type { Translation } from '../../translations';
import { FeedbackBanner } from '../feedback/FeedbackBanner';
import { fadeUp } from '../motion/presets';

// Profile Form Props (provides account data, edit state, validation, and form actions)
interface ProfileFormProps {
    t: Translation;
    profile: UserProfile;
    form: ProfileFormData;
    editing: boolean;
    saving: boolean;
    message: string;
    error: string;
    passwordError: string;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onFormChange: (form: ProfileFormData) => void;
    onEdit: () => void;
    onCancel: () => void;
    onClearPasswordError: () => void;
}

// Profile Form (switches account details between read-only and editable modes)
export function ProfileForm({
    t,
    profile,
    form,
    editing,
    saving,
    message,
    error,
    passwordError,
    onSubmit,
    onFormChange,
    onEdit,
    onCancel,
    onClearPasswordError,
}: ProfileFormProps) {
    return (
        <m.div
            className="content-panel bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            layout
        >
            {/* Form Header (explains which account details can be changed) */}
            <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">{t.profile_details}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.profile_description}</p>
            </div>

            <form aria-busy={saving} onSubmit={onSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {message && <FeedbackBanner message={message} />}
                {error && <FeedbackBanner tone="error" message={error} />}

                {/* Read-only Email (displays the account identifier without editing controls) */}
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{t.email}</label>
                    <div className="break-all rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-slate-700 dark:text-slate-300 transition-colors">
                        {profile.email}
                    </div>
                </div>

                {/* Editable Name (switches between a text input and the saved display value) */}
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{t.name_label}</label>
                    <AnimatePresence mode="wait" initial={false}>
                        {editing ? (
                            <m.div key="name-edit" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                                <input
                                    value={form.full_name}
                                    disabled={saving} onChange={(event) => onFormChange({ ...form, full_name: event.target.value })}
                                    className="soft-field w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                                    placeholder={t.your_name}
                                    required
                                />
                            </m.div>
                        ) : (
                            <m.div key="name-read" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-slate-700 dark:text-slate-300 transition-colors">
                                {profile.full_name}
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Editable Password (collects and validates an optional new password twice) */}
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{t.password}</label>
                    <AnimatePresence mode="wait" initial={false}>
                        {editing ? (
                            <m.div key="password-edit" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                                <input
                                    type="password"
                                    value={form.password}
                                    disabled={saving} onChange={(event) => {
                                        onFormChange({ ...form, password: event.target.value });
                                        onClearPasswordError();
                                    }}
                                    className="soft-field w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 mb-3 transition-colors"
                                    placeholder={t.new_password}
                                />
                                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{t.confirm_password}</label>
                                <input
                                    type="password"
                                    aria-invalid={Boolean(passwordError)}
                                    value={form.confirmPassword}
                                    disabled={saving} onChange={(event) => {
                                        onFormChange({ ...form, confirmPassword: event.target.value });
                                        onClearPasswordError();
                                    }}
                                    className={`soft-field w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors ${
                                        passwordError
                                            ? 'border-red-300 dark:border-red-500 focus:ring-red-500'
                                            : 'border-slate-300 dark:border-slate-600 focus:ring-orange-500'
                                    }`}
                                    placeholder={t.confirm_new_password}
                                />
                                {/* Credential Change Confirmation (an existing factor is also required when the account has MFA enabled). */}
                                {form.password && <div className="mt-4 space-y-3">
                                    <label className="block text-sm font-semibold">{t.current_password}<input type="password" autoComplete="current-password" required value={form.currentPassword || ''} disabled={saving} onChange={(event) => onFormChange({ ...form, currentPassword: event.target.value })} className="soft-field mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-900" /></label>
                                    <label className="block text-sm font-semibold">{t.mfa_optional_factor}<input autoComplete="one-time-code" maxLength={40} value={form.mfaCode || ''} disabled={saving} onChange={(event) => onFormChange({ ...form, mfaCode: event.target.value })} className="soft-field mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-900" /></label>
                                </div>}
                                <AnimatePresence>
                                    {passwordError && (
                                        <m.p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                            {passwordError}
                                        </m.p>
                                    )}
                                </AnimatePresence>
                            </m.div>
                        ) : (
                            <m.div key="password-read" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 tracking-[0.3em] text-slate-700 dark:text-slate-300 transition-colors">
                                *****
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Form Actions (switches between edit, save, and cancel controls) */}
                <AnimatePresence mode="wait" initial={false}>
                    {editing ? (
                        <m.div key="edit-actions" className="flex flex-col sm:flex-row gap-3 pt-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                            <button
                                type="submit"
                                disabled={saving || Boolean(form.password && form.password !== form.confirmPassword)}
                                className="accent-button inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? <LoaderCircle className="animate-spin" size={18} /> : <Check size={18} />} {saving ? t.saving : t.save_changes}
                            </button>
                            <button type="button" disabled={saving} onClick={onCancel} className="soft-button inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                {t.cancel}
                            </button>
                        </m.div>
                    ) : (
                        <m.div key="read-actions" className="flex pt-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                            <button type="button" onClick={onEdit} className="accent-button inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">
                                <Edit3 size={18} /> {t.edit_profile}
                            </button>
                        </m.div>
                    )}
                </AnimatePresence>
            </form>
        </m.div>
    );
}
