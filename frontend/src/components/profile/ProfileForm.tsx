import type { FormEvent } from 'react';
import { Check, Edit3 } from 'lucide-react';
import type { ProfileFormData, UserProfile } from '../../types';

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
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Account Details</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Email is read-only. Name and password can be changed.</p>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-6">
                {message && (
                    <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-green-700 dark:text-green-400 transition-colors">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-400 transition-colors">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Email</label>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-slate-700 dark:text-slate-300 transition-colors">
                        {profile.email}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Name</label>
                    {editing ? (
                        <input
                            value={form.full_name}
                            onChange={(event) => onFormChange({ ...form, full_name: event.target.value })}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="Your name"
                            required
                        />
                    ) : (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-slate-700 dark:text-slate-300 transition-colors">
                            {profile.full_name}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Password</label>
                    {editing ? (
                        <>
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
                            {passwordError && <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{passwordError}</p>}
                        </>
                    ) : (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 tracking-[0.3em] text-slate-700 dark:text-slate-300 transition-colors">
                            *****
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {editing ? (
                        <>
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
                        </>
                    ) : (
                        <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">
                            <Edit3 size={18} /> Edit Profile
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
