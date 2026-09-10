import type { RefObject } from 'react';
import { ChevronDown, Globe, History, LogOut, Moon, Plus, ShieldCheck, Sun, User, UserCircle2 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { Translation } from '../../translations';
import type { Language, UserProfile, UserRole } from '../../types';
import { FloatingNavigationDock } from '../navigation/FloatingNavigationDock';

interface ChatHeaderProps {
    lang: Language;
    t: Translation;
    isDarkMode: boolean;
    profile: UserProfile | null;
    userRole: UserRole;
    dropdownOpen: boolean;
    profileButtonRef: RefObject<HTMLDivElement>;
    onLanguageToggle: () => void;
    onThemeToggle: () => void;
    onDropdownToggle: () => void;
    onProfile: () => void;
    onAdminDashboard: () => void;
    onLogout: () => void;
    onToggleSidebar?: () => void;
    onNewChat?: () => void;
}

// Chat Header (keeps conversation and account controls visible in the shared Safeway dock)
export function ChatHeader({
    lang,
    t,
    isDarkMode,
    profile,
    userRole,
    dropdownOpen,
    profileButtonRef,
    onLanguageToggle,
    onThemeToggle,
    onDropdownToggle,
    onProfile,
    onAdminDashboard,
    onLogout,
    onToggleSidebar,
    onNewChat,
}: ChatHeaderProps) {
    const iconButtonClass = 'flex min-h-10 min-w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-amber-400';

    return (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-50 flex h-20 justify-center">
            <FloatingNavigationDock
                isDarkMode={isDarkMode}
                ariaLabel="Chat navigation"
                className="w-[calc(100vw-1rem)] lg:w-[min(60rem,calc(100vw-2rem))]"
            >
                <div className="grid h-full grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-center px-2 sm:px-3">
                    {/* Conversation Controls (opens history, starts a chat, and changes language) */}
                    <div className="flex min-w-0 items-center justify-end gap-0.5 pr-1 sm:gap-1 sm:pr-2">
                        {onToggleSidebar && (
                            <button
                                onClick={onToggleSidebar}
                                className={`${iconButtonClass} gap-2 px-2 lg:px-3`}
                                title="Chat History"
                                aria-label="Open chat history"
                                type="button"
                            >
                                <History size={17} />
                                <span className="hidden text-xs font-bold lg:inline">History</span>
                            </button>
                        )}
                        {onNewChat && (
                            <button
                                onClick={onNewChat}
                                className="hidden min-h-10 items-center justify-center gap-2 rounded-full px-3 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400 dark:hover:bg-amber-500/10 sm:flex"
                                title="New Chat"
                                type="button"
                            >
                                <Plus size={16} />
                                <span className="hidden lg:inline">New Chat</span>
                            </button>
                        )}
                        <button
                            onClick={onLanguageToggle}
                            className={iconButtonClass}
                            title="Change Language"
                            aria-label={`Change language. Current language: ${lang}`}
                            type="button"
                        >
                            <Globe size={17} className="text-blue-500" />
                            <span className="sr-only">{lang}</span>
                        </button>
                    </div>

                    <div aria-hidden="true" />

                    {/* Display & Account Controls (changes theme and opens the account menu) */}
                    <div className="flex min-w-0 items-center justify-start gap-0.5 pl-1 sm:gap-1 sm:pl-2">
                        <button
                            onClick={onThemeToggle}
                            className={iconButtonClass}
                            title="Toggle Theme"
                            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                            type="button"
                        >
                            {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
                        </button>

                        <div className="relative" ref={profileButtonRef}>
                            <button
                                className="flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2 text-slate-700 transition-colors hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-300 dark:hover:bg-white/10 sm:px-2.5 xl:gap-2 xl:px-3"
                                onClick={onDropdownToggle}
                                type="button"
                                aria-expanded={dropdownOpen}
                                aria-haspopup="menu"
                                aria-label="Open account menu"
                            >
                                <User size={17} className="text-amber-600 dark:text-amber-400" />
                                <span className="hidden max-w-32 truncate text-xs font-bold xl:block">{profile?.full_name || t.staff_account || 'Staff'}</span>
                                <ChevronDown size={14} className={`hidden transition-transform duration-300 sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <m.div
                                        className="absolute right-0 z-50 mt-3 flex w-[min(16rem,calc(100vw-1rem))] origin-top-right flex-col items-center rounded-3xl border-[0.5px] border-slate-300/55 bg-white/82 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#090a0d]/84 dark:shadow-[0_26px_70px_rgba(0,0,0,0.38)] sm:p-6"
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                        transition={{ duration: 0.2 }}
                                        role="menu"
                                    >
                                        <div className="mt-2 text-lg font-black tracking-tight text-slate-800 dark:text-white">
                                            {profile?.full_name || t.staff_account || 'Safeway Staff'}
                                        </div>
                                        <div className="mb-6 w-full truncate text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                                            {profile?.email || 'Loading...'}
                                        </div>
                                        <div className="mb-4 w-full border-t-[0.5px] border-slate-300/60 dark:border-white/10" />
                                        <div className="flex w-full flex-col gap-2">
                                            <button onClick={onProfile} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/55 py-3 text-sm font-bold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-100 hover:text-amber-700 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/20 dark:hover:text-amber-400" type="button" role="menuitem">
                                                <UserCircle2 size={16} /> {t.profile || 'My Profile'}
                                            </button>
                                            {userRole === 'admin' && (
                                                <button onClick={onAdminDashboard} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/55 py-3 text-sm font-bold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:text-blue-700 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/20 dark:hover:text-blue-400" type="button" role="menuitem">
                                                    <ShieldCheck size={16} /> {t.admin_dash_btn || 'Admin Dashboard'}
                                                </button>
                                            )}
                                            <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/55 py-3 text-sm font-bold text-slate-700 transition-all hover:border-red-300 hover:bg-red-100 hover:text-red-700 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-red-500/30 dark:hover:bg-red-500/20 dark:hover:text-red-400" type="button" role="menuitem">
                                                <LogOut size={16} /> {t.disconnect || 'Logout'}
                                            </button>
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </FloatingNavigationDock>
        </header>
    );
}
