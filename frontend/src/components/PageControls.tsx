import { Globe, Moon, Sun } from 'lucide-react';
import type { Language } from '../types';

interface PageControlsProps {
    lang: Language;
    isDarkMode: boolean;
    onLanguageToggle: () => void;
    onThemeToggle: () => void;
    variant?: 'landing' | 'login';
}

export function PageControls({
    lang,
    isDarkMode,
    onLanguageToggle,
    onThemeToggle,
    variant = 'landing',
}: PageControlsProps) {
    const isLogin = variant === 'login';
    const buttonClass = isLogin
        ? 'p-2 md:p-3 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-2xl saturate-150 border border-slate-200 dark:border-white/10 shadow-sm text-slate-700 dark:text-slate-200 hover:scale-105 transition-all duration-500'
        : 'p-2 md:p-3 rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-2xl saturate-150 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-slate-700 dark:text-slate-200 hover:scale-105 transition-all duration-500';

    return (
        <div className="absolute top-4 right-4 md:top-8 md:right-10 z-50 flex gap-3">
            <button
                onClick={onLanguageToggle}
                className={`${buttonClass} flex items-center justify-center font-bold text-xs uppercase`}
                title="Change Language"
                type="button"
            >
                <Globe size={18} className={isLogin ? 'md:mr-1 text-blue-600 dark:text-blue-500' : 'md:mr-2 text-blue-500'} />
                <span className="hidden md:block">{lang}</span>
            </button>
            <button
                onClick={onThemeToggle}
                className={buttonClass}
                title={isLogin ? 'Toggle Theme' : undefined}
                type="button"
            >
                {isDarkMode
                    ? <Sun size={20} className={isLogin ? 'text-amber-500' : 'text-amber-400'} />
                    : <Moon size={20} className={isLogin ? 'text-slate-700' : 'text-slate-700'} />}
            </button>
        </div>
    );
}
