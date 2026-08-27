import { MessageSquare, UserCircle2 } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AdminTab } from '../../types';

// Admin Header Props (provides the active tab and cross-workspace navigation actions)
interface AdminPageHeaderProps {
    tab: AdminTab;
    t: Translation;
    onOpenChat: () => void;
    onOpenProfile: () => void;
}

// Admin Page Header (labels the active panel and links to chat and profile pages)
export function AdminPageHeader({ tab, t, onOpenChat, onOpenProfile }: AdminPageHeaderProps) {
    // Active Panel Title (maps the selected dashboard tab to localized copy)
    const title = tab === 'staff'
        ? (t.accounts_mgmt || 'Accounts Management')
        : tab === 'docs'
            ? (t.docs_repo || 'Document Repository')
            : 'System Analytics & Health';

    return (
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="max-w-3xl text-[clamp(1.65rem,4vw,2.25rem)] font-black leading-[1.08] text-slate-900 dark:text-white uppercase tracking-tight transition-colors">{title}</h2>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <button onClick={onOpenChat} className="flex min-h-11 items-center gap-2 px-3 py-2 rounded-2xl bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/60 dark:border-white/20 text-slate-800 dark:text-white hover:border-amber-500/50 hover:bg-white/60 dark:hover:bg-white/20 transition-all shadow-sm font-bold text-sm" type="button">
                    <MessageSquare size={16} className="text-amber-500" />
                    <span className="hidden sm:inline">{t.switch_to_staff || 'Staff Chat'}</span>
                </button>
                <button onClick={onOpenProfile} className="flex min-h-11 items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/60 dark:border-white/20 text-slate-800 dark:text-white hover:border-amber-500/50 hover:bg-white/60 dark:hover:bg-white/20 transition-all shadow-sm font-bold text-sm" type="button">
                    <UserCircle2 size={18} className="text-amber-500" />
                    <span className="hidden sm:inline">{t.profile || 'Profile'}</span>
                </button>
            </div>
        </div>
    );
}
