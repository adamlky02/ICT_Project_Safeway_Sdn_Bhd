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
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                {/* Back Navigation (returns to the previously visited page) */}
                <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition" type="button">
                    <ArrowLeft size={18} /> <span className="hidden md:inline">Back</span>
                </button>
                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold">
                    <UserCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
                    My Profile
                </div>
                {/* Account Controls (switches theme or ends the current session) */}
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={onThemeToggle}
                        className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        type="button"
                    >
                        {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
                    </button>
                    <button onClick={onLogout} className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition" type="button">
                        <LogOut size={18} /> <span className="hidden md:inline">Logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
