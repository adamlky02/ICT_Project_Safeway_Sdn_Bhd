import { m } from 'motion/react';
import { Activity, Bot, Code2, FileText, Globe, LockKeyhole, LogOut, Moon, Sun, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AdminTab, Language } from '../../types';
import { FloatingNavigationDock } from '../navigation/FloatingNavigationDock';

interface AdminNavigationProps {
    tab: AdminTab;
    lang: Language;
    t: Translation;
    isDarkMode: boolean;
    isDeveloper: boolean;
    developerModeUnlocked: boolean;
    onTabChange: (tab: AdminTab) => void;
    onLanguageToggle: () => void;
    onThemeToggle: () => void;
    onLogout: () => void;
    onDeveloperModeRequest: () => void;
}

interface NavigationItem {
    id: AdminTab;
    icon: LucideIcon;
    label: string;
}

// Admin Navigation (keeps administration controls visible around the Safeway brand)
export function AdminNavigation({
    tab,
    lang,
    t,
    isDarkMode,
    isDeveloper,
    developerModeUnlocked,
    onTabChange,
    onLanguageToggle,
    onThemeToggle,
    onLogout,
    onDeveloperModeRequest,
}: AdminNavigationProps) {
    const items: NavigationItem[] = [
        { id: 'analytics', icon: Activity, label: t.tab_analytics || 'Analytics' },
        { id: 'staff', icon: Users, label: t.tab_accounts || 'Accounts' },
        { id: 'docs', icon: FileText, label: t.tab_docs || 'Documents' },
        ...(isDeveloper && developerModeUnlocked
            ? [{ id: 'ai' as const, icon: Bot, label: t.tab_ai || 'AI Model' }]
            : []),
    ];
    const leftItems = items.slice(0, 2);
    const rightItems = items.slice(2);
    const utilityButtonClass = 'relative flex size-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white';

    const renderDesktopTab = ({ id, icon: Icon, label }: NavigationItem) => (
        <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`relative flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${tab === id ? 'text-slate-950 dark:text-white' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
        >
            {tab === id && (
                <m.span
                    layoutId="admin-active-tab"
                    className="absolute inset-0 rounded-full border border-amber-500/30 bg-amber-50/70 shadow-[0_8px_24px_rgba(180,83,9,0.07)] dark:border-amber-400/20 dark:bg-white/[0.07] dark:shadow-[0_10px_28px_rgba(0,0,0,0.16)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
            )}
            <Icon size={15} className={`relative z-10 shrink-0 ${tab === id ? 'text-amber-500 dark:text-amber-400' : ''}`} />
            <span className="relative z-10 truncate">{label}</span>
            {tab === id && <span className="absolute -bottom-1 size-1 rounded-full bg-amber-400 shadow-[0_0_9px_rgba(251,191,36,0.75)]" />}
        </button>
    );

    const renderDeveloperButton = () => (
        isDeveloper ? (
            <button
                onClick={onDeveloperModeRequest}
                className={`${utilityButtonClass} ${developerModeUnlocked ? 'bg-violet-50/70 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300' : ''}`}
                type="button"
                aria-label={developerModeUnlocked ? (t.developer_mode_unlocked || 'Developer Mode unlocked') : (t.developer_mode_locked || 'Unlock Developer Mode')}
                title={developerModeUnlocked ? (t.developer_mode_unlocked || 'Developer Mode unlocked') : (t.developer_mode_locked || 'Unlock Developer Mode')}
            >
                {developerModeUnlocked ? <Code2 size={17} /> : <LockKeyhole size={17} />}
            </button>
        ) : null
    );

    return (
        <>
            <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex h-24 justify-center">
                <FloatingNavigationDock
                    isDarkMode={isDarkMode}
                    ariaLabel="Administrator navigation"
                >
                    {/* Desktop Controls (places primary destinations around the centered brand mark) */}
                    <div className="hidden h-full grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-center px-4 lg:grid">
                        <div className="flex min-w-0 items-center justify-end gap-1 pr-3">
                            {leftItems.map(renderDesktopTab)}
                        </div>
                        <div aria-hidden="true" />
                        <div className="flex min-w-0 items-center justify-between gap-2 pl-3">
                            <div className="flex min-w-0 items-center gap-1">
                                {rightItems.map(renderDesktopTab)}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 border-l-[0.5px] border-slate-300/50 pl-2 dark:border-white/10">
                                {renderDeveloperButton()}
                                <button onClick={onLanguageToggle} className={utilityButtonClass} type="button" aria-label={`Change language. Current language: ${lang}`} title={`Language: ${lang.toUpperCase()}`}>
                                    <Globe size={17} />
                                    <span className="absolute -bottom-0.5 text-[7px] font-black uppercase text-amber-500">{lang}</span>
                                </button>
                                <button onClick={onThemeToggle} className={utilityButtonClass} type="button" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={t.theme_mode || 'Change theme'}>
                                    {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
                                </button>
                                <button onClick={onLogout} className={`${utilityButtonClass} hover:bg-red-50/70 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400`} type="button" aria-label={t.logout || 'Logout'} title={t.logout || 'Logout'}>
                                    <LogOut size={17} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Touch Controls (balances utilities around the logo when hover is unavailable) */}
                    <div className="grid h-full grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-center px-2 lg:hidden">
                        <div className="flex items-center justify-end gap-0.5 pr-1">
                            {renderDeveloperButton()}
                            <button onClick={onLanguageToggle} className={utilityButtonClass} type="button" aria-label={`Change language. Current language: ${lang}`}>
                                <Globe size={17} />
                            </button>
                        </div>
                        <div aria-hidden="true" />
                        <div className="flex items-center justify-start gap-0.5 pl-1">
                            <button onClick={onThemeToggle} className={utilityButtonClass} type="button" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                                {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
                            </button>
                            <button onClick={onLogout} className={`${utilityButtonClass} hover:text-red-600 dark:hover:text-red-400`} type="button" aria-label={t.logout || 'Logout'}>
                                <LogOut size={17} />
                            </button>
                        </div>
                    </div>
                </FloatingNavigationDock>
            </div>

            {/* Mobile Tab Island (keeps primary administration destinations within reach) */}
            <m.nav
                className="fixed inset-x-3 bottom-3 z-50 flex min-h-[4.25rem] items-stretch justify-around rounded-[1.45rem] border-[0.5px] border-slate-300/45 bg-white/62 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_16px_45px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#090a0d]/68 dark:shadow-[0_18px_50px_rgba(0,0,0,0.26)] lg:hidden"
                initial={{ y: 82, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Administrator sections"
            >
                {items.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => onTabChange(id)}
                        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1 py-2 transition-colors ${tab === id ? 'text-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-500'}`}
                        type="button"
                        aria-current={tab === id ? 'page' : undefined}
                    >
                        {tab === id && <m.span layoutId="admin-mobile-active-tab" className="absolute inset-0 rounded-2xl border border-amber-500/25 bg-amber-50/65 dark:border-amber-400/15 dark:bg-white/[0.07]" />}
                        <Icon size={19} className={`relative z-10 ${tab === id ? 'text-amber-500 dark:text-amber-400' : ''}`} />
                        <span className="relative z-10 mt-1 max-w-full truncate text-[8px] font-black uppercase tracking-[0.08em]">{label}</span>
                    </button>
                ))}
            </m.nav>
        </>
    );
}
