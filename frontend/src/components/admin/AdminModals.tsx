import type { FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { m } from 'motion/react';
import type { Translation } from '../../translations';
import type { AdminUser, EditAccountForm, GeneratedCredentials, UserRole } from '../../types';
import { fadeScale, modalBackdrop } from '../motion/presets';
import { inputStyle, primaryButtonStyle } from './styles';

// Edit User Modal Props (provides account form state, role changes, and dialog actions)
interface EditUserModalProps {
    user: AdminUser;
    form: EditAccountForm;
    t: Translation;
    onFormChange: (form: EditAccountForm) => void;
    onRoleToggle: (checked: boolean) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

// Edit User Modal (edits account identity, password, and administrator privileges)
export function EditUserModal({ user: _user, form, t, onFormChange, onRoleToggle, onClose, onSubmit }: EditUserModalProps) {
    return (
        <m.div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" variants={modalBackdrop} initial="hidden" animate="visible" exit="exit">
            <m.div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl saturate-150 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-white/10 p-8 max-h-[90vh] overflow-y-auto relative" variants={fadeScale}>
                <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none" />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight relative z-10">{t.modify_acc}</h3>
                <form onSubmit={onSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.emp_name}</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <input className={inputStyle} value={form.first_name} onChange={(event) => onFormChange({ ...form, first_name: event.target.value })} required placeholder={t.first_name} />
                            <input className={inputStyle} value={form.last_name} onChange={(event) => onFormChange({ ...form, last_name: event.target.value })} required placeholder={t.last_name} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.email}</h4>
                        <input className={inputStyle} value={form.username} onChange={(event) => onFormChange({ ...form, username: event.target.value })} required placeholder="john.d" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.security || 'Security'}</h4>
                        <input type="password" placeholder={t.new_pass_placeholder} className={inputStyle} value={form.password} onChange={(event) => onFormChange({ ...form, password: event.target.value })} />
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner backdrop-blur-sm">
                        <input id="promote" type="checkbox" checked={form.role === 'admin'} onChange={(event) => onRoleToggle(event.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-500 bg-transparent" />
                        <div><label htmlFor="promote" className="font-bold text-sm dark:text-white">{t.admin_privileges}</label></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-white/5">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">{t.cancel}</button>
                        <button type="submit" className={`${primaryButtonStyle} w-auto px-8 py-2.5`}>{t.save_changes}</button>
                    </div>
                </form>
            </m.div>
        </m.div>
    );
}

// Credentials Modal Props (provides a new account's temporary login and close action)
interface CredentialsModalProps {
    credentials: GeneratedCredentials;
    t: Translation;
    onClose: () => void;
}

// Credentials Modal (displays and copies newly generated account credentials)
export function CredentialsModal({ credentials, t, onClose }: CredentialsModalProps) {
    // Credential Copy (writes the temporary login details to the system clipboard)
    const copyCredentials = async () => {
        await navigator.clipboard.writeText(`Safeway Access\nEmail: ${credentials.email}\nPass: ${credentials.password}`);
        alert(`${t.copy}!`);
    };

    return (
        <m.div className="fixed inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" variants={modalBackdrop} initial="hidden" animate="visible" exit="exit">
            <m.div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl saturate-150 rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full text-center border border-white/50 dark:border-white/10 relative" variants={fadeScale}>
                <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none" />
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 mx-auto rounded-full flex items-center justify-center mb-6 border border-emerald-200 dark:border-emerald-500/20 shadow-inner relative z-10"><ShieldCheck size={40} /></div>
                <h3 className="text-2xl font-black dark:text-white mb-2 uppercase tracking-tight relative z-10">{t.acc_ready}</h3>
                <div className="bg-slate-50/50 dark:bg-black/20 p-5 rounded-2xl border border-slate-200 dark:border-white/10 mb-6 space-y-3 shadow-inner backdrop-blur-sm relative z-10">
                    <div className="text-left"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.email}</p><p className="font-mono font-bold text-slate-800 dark:text-white text-sm">{credentials.email}</p></div>
                    <div className="text-left"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Password</p><p className="font-mono text-amber-600 dark:text-amber-500 font-bold text-lg break-all">{credentials.password}</p></div>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button onClick={() => void copyCredentials()} className="flex-1 bg-slate-100 dark:bg-white/5 p-3 rounded-xl font-bold text-sm text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors" type="button">{t.copy}</button>
                    <button onClick={onClose} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-3 rounded-xl font-bold text-sm transition-colors hover:scale-[0.98]" type="button">{t.done}</button>
                </div>
            </m.div>
        </m.div>
    );
}

// Role Confirmation Props (provides the pending access level and confirmation action)
interface RoleConfirmModalProps {
    pendingRole: UserRole | null;
    t: Translation;
    onChoice: (confirmed: boolean) => void;
}

// Role Confirmation Modal (requires explicit approval before changing account privileges)
export function RoleConfirmModal({ pendingRole, t, onChoice }: RoleConfirmModalProps) {
    return (
        <m.div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50" variants={modalBackdrop} initial="hidden" animate="visible" exit="exit">
            <m.div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl saturate-150 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border border-white/50 dark:border-white/10 relative" variants={fadeScale}>
                <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight relative z-10">{t.change_role}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 font-medium relative z-10">{t.switch_access} <span className="font-bold text-amber-600 dark:text-amber-500 uppercase">{pendingRole}</span>?</p>
                <div className="grid grid-cols-2 gap-3 relative z-10">
                    <button onClick={() => onChoice(false)} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" type="button">{t.cancel}</button>
                    <button onClick={() => onChoice(true)} className={`${primaryButtonStyle} p-3`} type="button">{t.confirm}</button>
                </div>
            </m.div>
        </m.div>
    );
}
