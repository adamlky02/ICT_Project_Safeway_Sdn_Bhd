import { Globe, Moon, ShieldCheck, Sun } from 'lucide-react';
import type { Language } from '../types';

// Page Controls Props (provides language and theme state for public pages)
interface PageControlsProps {
    lang: Language;
    isDarkMode: boolean;
    onLanguageToggle: () => void;
    onThemeToggle: () => void;
    onAdminSelect?: () => void;
    adminLabel?: string;
    variant?: 'landing' | 'login';
}

// Page Controls (renders reusable language and theme toggle buttons)
export function PageControls({
    lang,
    isDarkMode,
    onLanguageToggle,
    onThemeToggle,
    onAdminSelect,
    adminLabel = 'Administrator login',
    variant = 'landing',
}: PageControlsProps) {
    // Control Styling (adapts shared buttons to landing or login backgrounds)
    const isLogin = variant === 'login';
    const buttonClass = 'soft-button min-h-11 min-w-11 p-2.5 md:p-3 rounded-full text-slate-800 dark:text-white';

    return (
        <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 flex gap-2 sm:right-6 md:right-10 md:top-8 md:gap-3">
            {onAdminSelect && (
                <button
                    onClick={onAdminSelect}
                    className={`${buttonClass} flex items-center justify-center text-amber-600 dark:text-amber-400`}
                    title={adminLabel}
                    aria-label={adminLabel}
                    type="button"
                >
                    <ShieldCheck size={19} />
                </button>
            )}
            <button
                onClick={onLanguageToggle}
                className={`${buttonClass} flex items-center justify-center font-bold text-xs`}
                title="Change language"
                aria-label={`Change language. Current language: ${lang}`}
                type="button"
            >
                <Globe size={18} className={isLogin ? 'md:mr-1 text-orange-600 dark:text-orange-400' : 'md:mr-2 text-orange-600'} />
                <span className="hidden md:block">{lang}</span>
            </button>
            <button
                onClick={onThemeToggle}
                className={buttonClass}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDarkMode}
                type="button"
            >
                {isDarkMode
                    ? <Sun size={20} className={isLogin ? 'text-amber-500' : 'text-amber-400'} />
                    : <Moon size={20} className={isLogin ? 'text-slate-700' : 'text-slate-700'} />}
            </button>
        </div>
    );
}
