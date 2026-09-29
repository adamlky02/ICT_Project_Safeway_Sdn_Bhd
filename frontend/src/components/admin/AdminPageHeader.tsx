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
            : tab === 'ai'
                ? (t.ai_settings || 'AI Model Settings')
                : 'System Analytics & Health';

    const context = tab === 'staff'
        ? (t.tab_accounts || 'Accounts')
        : tab === 'docs'
            ? (t.tab_docs || 'Documents')
            : tab === 'ai'
                ? (t.tab_ai || 'AI Model')
                : (t.tab_analytics || 'Analytics');

    return (
        <div className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <div className="mb-3 flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500 sm:text-[10px]">
                    <span className="text-amber-600 dark:text-amber-400">Safeway Sdn. Bhd.</span>
                    <span className="h-px w-8 bg-slate-300 dark:bg-white/15 sm:w-14" />
                    <span>{context}</span>
                </div>
                <h2 className="max-w-4xl text-[clamp(1.9rem,4vw,3.5rem)] font-black uppercase leading-[0.96] tracking-[-0.045em] text-slate-950 transition-colors dark:text-white">{title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <button onClick={onOpenChat} className="flex min-h-11 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-2 text-sm font-bold text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:shadow-[0_14px_34px_rgba(0,0,0,0.3)] dark:hover:bg-white/10" type="button">
                    <MessageSquare size={16} className="text-amber-500" />
                    <span className="hidden sm:inline">{t.switch_to_staff || 'Staff Chat'}</span>
                </button>
                <button onClick={onOpenProfile} className="flex min-h-11 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-2 text-sm font-bold text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:shadow-[0_14px_34px_rgba(0,0,0,0.3)] dark:hover:bg-white/10 sm:px-4" type="button">
                    <UserCircle2 size={18} className="text-amber-500" />
                    <span className="hidden sm:inline">{t.profile || 'Profile'}</span>
                </button>
            </div>
        </div>
    );
}
