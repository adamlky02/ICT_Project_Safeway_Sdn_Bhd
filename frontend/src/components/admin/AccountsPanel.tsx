import type { FormEvent } from 'react';
import { Pencil, Search, ShieldCheck, Trash2, User, UserPlus } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AccountForm, AdminUser } from '../../types';
import { cardStyle, inputStyle, primaryButtonStyle } from './styles';

interface AccountsPanelProps {
    form: AccountForm;
    searchTerm: string;
    adminUsers: AdminUser[];
    staffUsers: AdminUser[];
    t: Translation;
    onFormChange: (form: AccountForm) => void;
    onSearchChange: (searchTerm: string) => void;
    onAddUser: (event: FormEvent<HTMLFormElement>) => void;
    onEditUser: (user: AdminUser) => void;
    onDeleteUser: (id: string) => void;
}

interface UserRowProps {
    user: AdminUser;
    isStaffTable: boolean;
    onEdit: (user: AdminUser) => void;
    onDelete: (id: string) => void;
}

function UserRow({ user, isStaffTable, onEdit, onDelete }: UserRowProps) {
    return (
        <div className="p-3 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-1.5 rounded-lg shrink-0 ${isStaffTable ? 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-500/20'}`}>
                    {isStaffTable ? <User size={16} /> : <ShieldCheck size={16} />}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate tracking-tight">{user.full_name}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-500 truncate">{user.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(user)} className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:bg-white/5 rounded-lg transition-colors" type="button"><Pencil size={15} /></button>
                <button onClick={() => onDelete(user.id)} className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:bg-white/5 rounded-lg transition-colors" type="button"><Trash2 size={15} /></button>
            </div>
        </div>
    );
}

export function AccountsPanel({
    form,
    searchTerm,
    adminUsers,
    staffUsers,
    t,
    onFormChange,
    onSearchChange,
    onAddUser,
    onEditUser,
    onDeleteUser,
}: AccountsPanelProps) {
    const renderUserList = (users: AdminUser[], isStaffTable: boolean) => (
        users.length === 0
            ? <div className="p-10 text-center text-slate-400 italic text-sm">{t.no_matches}</div>
            : users.map((user) => (
                <UserRow key={user.id} user={user} isStaffTable={isStaffTable} onEdit={onEditUser} onDelete={onDeleteUser} />
            ))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                <div className="space-y-1.5 w-full sm:w-72">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.search_dir || 'Search Directory'}</label>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={14} />
                        <input type="text" placeholder={t.search_placeholder} className={`${inputStyle} pl-9`} value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} />
                    </div>
                </div>
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] hidden sm:block pb-2">{t.id_manager}</div>
            </div>

            <section className={`${cardStyle} p-5`}>
                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                <form onSubmit={onAddUser} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end relative z-10">
                    <div className="sm:col-span-5 flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">{t.emp_name}</label>
                        <div className="flex gap-2">
                            <input className={inputStyle} value={form.first_name} onChange={(event) => onFormChange({ ...form, first_name: event.target.value })} required placeholder={t.first_name || 'First'} />
                            <input className={inputStyle} value={form.last_name} onChange={(event) => onFormChange({ ...form, last_name: event.target.value })} required placeholder={t.last_name || 'Last'} />
                        </div>
                    </div>

                    <div className="sm:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">
                            {t.email} <span className="text-[9px] lowercase opacity-70">{t.email_prefix}</span>
                        </label>
                        <div className="flex border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:border-amber-500 transition-all shadow-inner backdrop-blur-sm">
                            <input className="flex-1 bg-transparent p-2.5 text-sm dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-500" value={form.username} onChange={(event) => onFormChange({ ...form, username: event.target.value })} required placeholder="john.d" />
                            <span className="bg-slate-200/50 dark:bg-white/5 px-3 flex items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-white/10">@safeway.com</span>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <button className={primaryButtonStyle} type="submit"><UserPlus size={16} /> {t.generate_acc}</button>
                    </div>
                    <div className="sm:col-span-12 text-[10px] text-slate-500 dark:text-slate-400 italic ml-1 mt-1 font-medium">{t.acc_notice}</div>
                </form>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${cardStyle} flex flex-col h-[380px]`}>
                    <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3.5 flex justify-between items-center text-slate-900 shrink-0 font-black text-xs uppercase tracking-widest relative z-10 border-b border-white/20">
                        <div className="flex items-center gap-2"><ShieldCheck size={14} /> {t.admins}</div>
                        <span className="bg-slate-900/10 px-2.5 py-0.5 rounded-full">{adminUsers.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">{renderUserList(adminUsers, false)}</div>
                </div>

                <div className={`${cardStyle} flex flex-col h-[380px]`}>
                    <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                    <div className="bg-slate-200/50 dark:bg-slate-800/80 p-3.5 flex justify-between items-center text-slate-800 dark:text-white shrink-0 font-black text-xs uppercase tracking-widest border-b border-slate-300 dark:border-slate-700 relative z-10">
                        <div className="flex items-center gap-2"><User size={14} /> {t.internal_staff}</div>
                        <span className="bg-white/40 dark:bg-white/10 px-2.5 py-0.5 rounded-full">{staffUsers.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">{renderUserList(staffUsers, true)}</div>
                </div>
            </div>
        </div>
    );
}
