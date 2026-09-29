import type { RefObject } from 'react';
import { ChevronDown, Globe, History, LogOut, Moon, Plus, Home, Sun, User, UserCircle2 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { Translation } from '../../translations';
import type { Language, UserProfile } from '../../types';
import { FloatingNavigationDock } from '../navigation/FloatingNavigationDock';

interface ChatHeaderProps {
    lang: Language;
    t: Translation;
    isDarkMode: boolean;
    profile: UserProfile | null;
    showDashboardHome: boolean;
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
    showDashboardHome,
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
    const iconButtonClass = 'flex min-h-10 min-w-7 items-center justify-center rounded-full sm:min-w-10 text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-amber-400';

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
                                className={`${iconButtonClass} gap-2 px-0.5 sm:px-2 lg:px-3`}
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

                        {showDashboardHome && (
                            <button
                                onClick={onAdminDashboard}
                                className={`${iconButtonClass} gap-2 px-0.5 sm:px-2 lg:px-3`}
                                title={t.admin_dash_btn}
                                aria-label={`${t.chat_home}: ${t.admin_dash_btn}`}
                                type="button"
                            >
                                <Home size={17} />
                                <span className="hidden text-xs font-bold lg:inline">{t.chat_home}</span>
                            </button>
                        )}

                        <div
                            className="relative"
                            ref={profileButtonRef}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape' && dropdownOpen) {
                                    onDropdownToggle();
                                    profileButtonRef.current?.querySelector('button')?.focus();
                                }
                            }}
                            onBlur={(event) => {
                                if (dropdownOpen && !event.currentTarget.contains(event.relatedTarget)) {
                                    onDropdownToggle();
                                }
                            }}
                        >
                            <button
                                className="flex min-h-10 min-w-7 items-center justify-center gap-1 rounded-full px-1 sm:min-w-10 text-slate-700 transition-colors hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-300 dark:hover:bg-white/10 sm:px-2.5 xl:gap-2 xl:px-3"
                                onClick={onDropdownToggle}
                                type="button"
                                aria-expanded={dropdownOpen}
                                aria-controls={dropdownOpen ? 'chat-account-panel' : undefined}
                                aria-label={dropdownOpen ? 'Close account menu' : 'Open account menu'}
                            >
                                <User size={17} className="text-amber-600 dark:text-amber-400" />
                                <span className="hidden max-w-32 truncate text-xs font-bold xl:block">{profile?.full_name || t.staff_account || 'Staff'}</span>
                                <ChevronDown size={14} className={`hidden transition-transform duration-300 sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <m.div
                                        id="chat-account-panel"
                                        className="absolute right-0 z-50 mt-2 w-[min(17rem,calc(100vw-1rem))] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#15171c] dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <div className="flex items-center gap-3 px-3 py-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" aria-hidden="true">
                                                <User size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                                                    {profile?.full_name || t.staff_account || 'Safeway Staff'}
                                                </div>
                                                <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={profile?.email}>
                                                    {profile?.email || 'Loading...'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mx-2 mb-1 border-t border-slate-100 dark:border-white/10" />
                                        <button onClick={onProfile} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 dark:text-slate-200 dark:hover:bg-white/5" type="button">
                                            <UserCircle2 size={17} className="text-slate-400" /> {t.profile}
                                        </button>
                                        <button onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-500/10" type="button">
                                            <LogOut size={17} /> {t.chat_sign_out}
                                        </button>
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
