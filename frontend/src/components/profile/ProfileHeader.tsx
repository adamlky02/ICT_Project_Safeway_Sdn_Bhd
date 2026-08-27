import { ArrowLeft, LogOut, Moon, Sun, UserCircle2 } from 'lucide-react';

// Profile Header Props (provides navigation, theme, and logout actions)
interface ProfileHeaderProps {
    isDarkMode: boolean;
    onBack: () => void;
    onThemeToggle: () => void;
    onLogout: () => void;
}

// Profile Header (renders account-page navigation and session controls)
export function ProfileHeader({ isDarkMode, onBack, onThemeToggle, onLogout }: ProfileHeaderProps) {
    return (
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
                {/* Back Navigation (returns to the previously visited page) */}
                <button onClick={onBack} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition" type="button">
                    <ArrowLeft size={18} /> <span className="hidden md:inline">Back</span>
                </button>
                <div className="flex min-w-0 items-center gap-2 text-sm sm:text-base text-slate-800 dark:text-white font-semibold">
                    <UserCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
                    My Profile
                </div>
                {/* Account Controls (switches theme or ends the current session) */}
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={onThemeToggle}
                        className="min-h-11 min-w-11 p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        type="button"
                    >
                        {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
                    </button>
                    <button onClick={onLogout} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-300 dark:hover:bg-red-500/10 transition" type="button">
                        <LogOut size={18} /> <span className="hidden md:inline">Logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
