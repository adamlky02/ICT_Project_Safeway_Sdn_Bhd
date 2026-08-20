import { MessageSquare, UserCircle2 } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AdminTab } from '../../types';

interface AdminPageHeaderProps {
    tab: AdminTab;
    t: Translation;
    onOpenChat: () => void;
    onOpenProfile: () => void;
}

export function AdminPageHeader({ tab, t, onOpenChat, onOpenProfile }: AdminPageHeaderProps) {
    const title = tab === 'staff'
        ? (t.accounts_mgmt || 'Accounts Management')
        : tab === 'docs'
            ? (t.docs_repo || 'Document Repository')
            : 'System Analytics & Health';

    return (
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight transition-colors">{title}</h2>
            <div className="flex items-center gap-2">
                <button onClick={onOpenChat} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/60 dark:border-white/20 text-slate-800 dark:text-white hover:border-amber-500/50 hover:bg-white/60 dark:hover:bg-white/20 transition-all shadow-sm font-bold text-sm" type="button">
                    <MessageSquare size={16} className="text-amber-500" />
                    <span className="hidden sm:inline">{t.switch_to_staff || 'Staff Chat'}</span>
                </button>
                <button onClick={onOpenProfile} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/60 dark:border-white/20 text-slate-800 dark:text-white hover:border-amber-500/50 hover:bg-white/60 dark:hover:bg-white/20 transition-all shadow-sm font-bold text-sm" type="button">
                    <UserCircle2 size={18} className="text-amber-500" />
                    <span className="hidden sm:inline">{t.profile || 'Profile'}</span>
                </button>
            </div>
        </div>
    );
}
