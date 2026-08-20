import type { RefObject } from 'react';
import { ChevronDown, Globe, LogOut, Moon, ShieldCheck, Sun, User, UserCircle2 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { Translation } from '../../translations';
import type { Language, UserProfile, UserRole } from '../../types';

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
}

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
}: ChatHeaderProps) {
    return (
        <header className="h-14 md:h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shadow-sm z-20 shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-2 md:gap-3">
                <img
                    src={isDarkMode ? '/safewaylogo.png' : '/safewaylogoblack.png'}
                    alt="Logo"
                    className="w-18 h-18 md:w-20 md:h-20 object-contain dark:mix-blend-screen mix-blend-multiply shrink-0 hidden sm:block drop-shadow-sm transition-transform duration-500 hover:scale-105"
                />
                <h1 className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 tracking-tight">Safeway Assistant</h1>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
                <button
                    onClick={onLanguageToggle}
                    className="p-2 md:p-2.5 rounded-full bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all duration-300 flex items-center justify-center font-bold text-xs uppercase"
                    title="Change Language"
                    type="button"
                >
                    <Globe size={18} className="md:mr-1 text-blue-500" />
                    <span className="hidden md:block">{lang}</span>
                </button>

                <button
                    onClick={onThemeToggle}
                    className="p-2 md:p-2.5 rounded-full bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:scale-105 transition-all duration-300"
                    title="Toggle Theme"
                    type="button"
                >
                    {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
                </button>

                <div className="relative" ref={profileButtonRef}>
                    <button
                        className="flex items-center gap-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/10 px-3 py-2 md:py-2.5 rounded-xl focus:outline-none transition-all duration-300 hover:shadow-md"
                        onClick={onDropdownToggle}
                        type="button"
                    >
                        <User size={18} className="text-amber-600 dark:text-amber-500" />
                        <span className="text-sm font-bold hidden md:block tracking-wide">{profile?.full_name || t.staff_account || 'Staff'}</span>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {dropdownOpen && (
                            <m.div
                                className="absolute right-0 mt-3 w-64 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl saturate-150 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 p-6 flex flex-col items-center origin-top-right"
                                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="text-lg font-black text-slate-800 dark:text-white mt-2 tracking-tight">
                                    {profile?.full_name || t.staff_account || 'Safeway Staff'}
                                </div>
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6 truncate w-full text-center">
                                    {profile?.email || 'Loading...'}
                                </div>
                                <div className="w-full border-t border-slate-200/60 dark:border-white/5 mb-4" />
                                <div className="w-full flex flex-col gap-2">
                                    <button onClick={onProfile} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-amber-100 hover:text-amber-700 hover:border-amber-300 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 dark:hover:border-amber-500/30 transition-all active:scale-[0.98]" type="button">
                                        <UserCircle2 size={16} /> {t.profile || 'My Profile'}
                                    </button>
                                    {userRole === 'admin' && (
                                        <button onClick={onAdminDashboard} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 dark:hover:border-blue-500/30 transition-all active:scale-[0.98]" type="button">
                                            <ShieldCheck size={16} /> {t.admin_dash_btn || 'Admin Dashboard'}
                                        </button>
                                    )}
                                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-red-100 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-500/20 dark:hover:text-red-400 dark:hover:border-red-500/30 transition-all active:scale-[0.98]" type="button">
                                        <LogOut size={16} /> {t.disconnect || 'Logout'}
                                    </button>
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
