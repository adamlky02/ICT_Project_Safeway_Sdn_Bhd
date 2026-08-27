import { Activity, FileText, Globe, LogOut, Moon, Sun, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AdminTab, Language } from '../../types';

// Admin Navigation Props (provides active state, display settings, and navigation actions)
interface AdminNavigationProps {
    tab: AdminTab;
    lang: Language;
    t: Translation;
    isDarkMode: boolean;
    isHovered: boolean;
    onTabChange: (tab: AdminTab) => void;
    onLanguageToggle: () => void;
    onThemeToggle: () => void;
    onLogout: () => void;
    onHoverChange: (isHovered: boolean) => void;
}

// Navigation Item (pairs each dashboard tab with its icon and localized label)
interface NavigationItem {
    id: AdminTab;
    icon: LucideIcon;
    label: string;
}

// Admin Navigation (renders responsive dashboard headers, sidebars, and tab bars)
export function AdminNavigation({
    tab,
    lang,
    t,
    isDarkMode,
    isHovered,
    onTabChange,
    onLanguageToggle,
    onThemeToggle,
    onLogout,
    onHoverChange,
}: AdminNavigationProps) {
    // Dashboard Tabs (defines the ordered analytics, account, and document destinations)
    const items: NavigationItem[] = [
        { id: 'analytics', icon: Activity, label: t.tab_analytics || 'Health' },
        { id: 'staff', icon: Users, label: t.tab_accounts || 'Accounts' },
        { id: 'docs', icon: FileText, label: t.tab_docs || 'Docs' },
    ];

    return (
        <>
            {/* Mobile Header (shows dashboard branding and display controls on small screens) */}
            <div className="lg:hidden bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-3 sm:px-5 py-2.5 flex justify-between items-center fixed top-0 left-0 right-0 z-20 transition-colors min-h-16">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <img src={isDarkMode ? '/safewaylogo.png' : '/safewaylogoblack.png'} alt="Logo" className="w-10 h-10 object-contain shrink-0 drop-shadow-sm" />
                    <span className="truncate font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 uppercase tracking-tight text-base sm:text-lg">Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onLanguageToggle} className="min-h-11 min-w-11 p-2 rounded-full bg-slate-100 dark:bg-white/5 text-blue-600 dark:text-blue-400 transition-colors uppercase text-[10px] font-bold" type="button">
                        <Globe size={16} />
                    </button>
                    <button onClick={onThemeToggle} className="min-h-11 min-w-11 p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors" type="button">
                        {isDarkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} />}
                    </button>
                </div>
            </div>

            {/* Desktop Sidebar (expands on hover to reveal tab and utility labels) */}
            <div
                onMouseEnter={() => onHoverChange(true)}
                onMouseLeave={() => onHoverChange(false)}
                className={`hidden lg:flex bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl text-slate-700 dark:text-slate-300 flex-col z-40 transition-all duration-300 ease-out border-r border-slate-200 dark:border-slate-800 shrink-0 ${isHovered ? 'w-64' : 'w-20'}`}
            >
                <div className={`flex items-center mb-8 h-20 mt-2 transition-all duration-300 overflow-hidden ${isHovered ? 'px-6' : 'justify-center px-0'}`}>
                    <img src={isDarkMode ? '/safewaylogo.png' : '/safewaylogoblack.png'} alt="Logo" className="w-17 h-17 object-contain shrink-0 drop-shadow-md transition-transform duration-500 hover:scale-105" />
                    <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                        <h1 className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 uppercase tracking-tight">{t.admin_dashboard || 'Admin'}</h1>
                    </div>
                </div>

                {/* Desktop Tabs (switches the central dashboard panel) */}
                <div className="space-y-1.5 flex-1 px-3 overflow-hidden">
                    {items.map(({ id, icon: Icon, label }) => (
                        <button key={id} onClick={() => onTabChange(id)} className={`w-full flex items-center py-3 rounded-2xl transition-all overflow-hidden ${tab === id ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20 font-bold' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'} ${isHovered ? 'px-4' : 'justify-center'}`} type="button">
                            <Icon size={22} className="shrink-0" />
                            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{label}</span></div>
                        </button>
                    ))}
                </div>

                {/* Desktop Utilities (changes language or theme and ends the session) */}
                <div className="mt-auto mb-6 px-3 space-y-1.5 pt-4 border-t border-slate-300/50 dark:border-white/10">
                    <button onClick={onLanguageToggle} className={`w-full flex items-center py-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-medium text-slate-600 dark:text-slate-400 ${isHovered ? 'px-4' : 'justify-center'}`} type="button">
                        <Globe size={22} className="text-blue-500 shrink-0" />
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'} uppercase`}><span>{lang}</span></div>
                    </button>
                    <button onClick={onThemeToggle} className={`w-full flex items-center py-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-medium text-slate-600 dark:text-slate-400 ${isHovered ? 'px-4' : 'justify-center'}`} type="button">
                        {isDarkMode ? <Sun size={22} className="text-amber-500 shrink-0" /> : <Moon size={22} className="shrink-0" />}
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{t.theme_mode || 'Theme'}</span></div>
                    </button>
                    <button onClick={onLogout} className={`w-full flex items-center py-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-all font-medium ${isHovered ? 'px-4' : 'justify-center'}`} type="button">
                        <LogOut size={22} className="shrink-0" />
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{t.logout || 'Logout'}</span></div>
                    </button>
                </div>
            </div>

            {/* Mobile Tab Bar (keeps primary dashboard sections reachable on small screens) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl saturate-150 border-t border-slate-200 dark:border-white/5 flex justify-around items-stretch z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] transition-colors min-h-16">
                {items.map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => onTabChange(id)} className={`flex min-h-16 flex-col items-center justify-center w-full px-1 py-2 transition-colors ${tab === id ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} type="button">
                        <Icon size={20} className={tab === id ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''} />
                        <span className="max-w-full truncate text-[9px] font-bold mt-1 tracking-wide uppercase">{label}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
