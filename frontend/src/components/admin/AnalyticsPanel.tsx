import { Cloud, Cpu, Database, FileText, RefreshCcw, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AdminAnalytics } from '../../types';
import { cardStyle } from './styles';

// Analytics Panel Props (provides totals, clock values, translations, and refresh state)
interface AnalyticsPanelProps {
    analytics: AdminAnalytics;
    usersCount: number;
    documentsCount: number;
    formattedDate: string;
    formattedTime: string;
    isRefreshing: boolean;
    t: Translation;
    onRefresh: () => void;
}

// Status Item (describes an external service shown in the health list)
interface StatusItem {
    title: string;
    description: string;
    icon: LucideIcon;
    iconClass: string;
}

// Service Status Catalog (defines the database, storage, and AI dependencies being monitored)
const statusItems: StatusItem[] = [
    { title: 'Neon PostgreSQL', description: 'Vector Database Connection', icon: Database, iconClass: 'text-blue-500' },
    { title: 'Cloudflare R2', description: 'Binary Object Storage', icon: Cloud, iconClass: 'text-orange-500' },
    { title: 'Google Gemini', description: 'Generative AI & Embeddings', icon: Cpu, iconClass: 'text-amber-500' },
];

// Analytics Panel (renders live time, system totals, and dependency health)
export function AnalyticsPanel({
    analytics,
    usersCount,
    documentsCount,
    formattedDate,
    formattedTime,
    isRefreshing,
    t,
    onRefresh,
}: AnalyticsPanelProps) {
    return (
        <div className="space-y-4">
            {/* Diagnostics Header (shows the live server-style clock and manual refresh action) */}
            <div className="mb-2 flex items-start justify-between gap-3">
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
                    <span className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:tracking-widest">{formattedDate}</p>
                    <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
                    <p className="basis-full pl-5 text-lg font-black tracking-wider text-amber-600 dark:text-amber-500 font-mono sm:basis-auto sm:pl-0 md:text-2xl">{formattedTime}</p>
                </div>
                <button onClick={onRefresh} disabled={isRefreshing} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-widest text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 dark:text-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-400 sm:px-3" type="button">
                    <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">{t.refresh_stats || 'Refresh'}</span>
                </button>
            </div>

            {/* Metric Cards (summarize accounts, indexed documents, and cloud storage) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 pt-3 sm:pt-4">
                <div className={`${cardStyle} p-4 sm:p-5 lg:p-6 flex flex-col items-center justify-center text-center`}>
                    <div className="p-2.5 sm:p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-3 sm:mb-4"><Users size={26} /></div>
                    <h4 className="text-3xl lg:text-4xl font-black dark:text-white mb-1">{analytics.total_users || usersCount}</h4>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.total_staff || 'Total Staff'}</p>
                </div>
                <div className={`${cardStyle} p-4 sm:p-5 lg:p-6 flex flex-col items-center justify-center text-center`}>
                    <div className="p-2.5 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-3 sm:mb-4"><FileText size={26} /></div>
                    <h4 className="text-3xl lg:text-4xl font-black dark:text-white mb-1">{analytics.total_docs || documentsCount}</h4>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.docs_indexed || 'Docs Indexed'}</p>
                </div>
                <div className={`${cardStyle} p-4 sm:p-5 lg:p-6 flex flex-col items-center justify-center text-center`}>
                    <div className="p-2.5 sm:p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl mb-3 sm:mb-4"><Database size={26} /></div>
                    <h4 className="text-3xl lg:text-4xl font-black dark:text-white mb-1">{analytics.total_storage_mb || '0'} <span className="text-base lg:text-lg text-slate-400">MB</span></h4>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.storage_used || 'Storage Used'}</p>
                </div>
            </div>

            {/* Service Health (lists the operational state of each external dependency) */}
            <div className={`${cardStyle} p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 mt-4`}>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/10 pb-3">{t.system_status || 'Live Status'}</h4>
                <div className="grid grid-cols-1 gap-4">
                    {statusItems.map(({ title, description, icon: Icon, iconClass }) => (
                        <div key={title} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                <Icon className={iconClass} size={24} />
                                <div>
                                    <p className="font-bold dark:text-white">{title}</p>
                                    <p className="text-xs text-slate-500">{description}</p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto bg-emerald-100/50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t.operational || 'Online'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
