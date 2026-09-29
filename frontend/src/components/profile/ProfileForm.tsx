import type { FormEvent } from 'react';
import { Check, Edit3 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { ProfileFormData, UserProfile } from '../../types';
import { fadeUp } from '../motion/presets';

// Profile Form Props (provides account data, edit state, validation, and form actions)
interface ProfileFormProps {
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
            className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            layout
        >
            {/* Form Header (explains which account details can be changed) */}
            <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Account Details</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Email is read-only. Name and password can be changed.</p>
            </div>

            <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* Submission Feedback (shows animated success or API error messages) */}
                <AnimatePresence initial={false}>
                    {message && (
                        <m.div
                            className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-green-700 dark:text-green-400 transition-colors"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                        >
                            {message}
                        </m.div>
                    )}
                    {error && (
                        <m.div
                            className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-400 transition-colors"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                        >
                            {error}
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Read-only Email (displays the account identifier without editing controls) */}
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Email</label>
                    <div className="break-all rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-slate-700 dark:text-slate-300 transition-colors">
                        {profile.email}
                    </div>
                </div>

                {/* Editable Name (switches between a text input and the saved display value) */}
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Name</label>
                    <AnimatePresence mode="wait" initial={false}>
                        {editing ? (
                            <m.div key="name-edit" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                                <input
                                    value={form.full_name}
                                    onChange={(event) => onFormChange({ ...form, full_name: event.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    placeholder="Your name"
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
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Password</label>
                    <AnimatePresence mode="wait" initial={false}>
                        {editing ? (
                            <m.div key="password-edit" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(event) => {
                                        onFormChange({ ...form, password: event.target.value });
                                        onClearPasswordError();
                                    }}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-3 transition-colors"
                                    placeholder="Enter new password"
                                />
                                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={(event) => {
                                        onFormChange({ ...form, confirmPassword: event.target.value });
                                        onClearPasswordError();
                                    }}
                                    className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors ${
                                        passwordError
                                            ? 'border-red-300 dark:border-red-500 focus:ring-red-500'
                                            : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
                                    }`}
                                    placeholder="Confirm new password"
                                />
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
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                            >
                                <Check size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button type="button" onClick={onCancel} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                Cancel
                            </button>
                        </m.div>
                    ) : (
                        <m.div key="read-actions" className="flex pt-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                            <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">
                                <Edit3 size={18} /> Edit Profile
                            </button>
                        </m.div>
                    )}
                </AnimatePresence>
            </form>
        </m.div>
    );
}
