import { useEffect, useState } from 'react';

// Theme Options (define persistence and cross-component synchronization behavior)
type ThemeStorage = 'local' | 'session';

interface UseThemeOptions {
    storage?: ThemeStorage;
    syncLocalStorage?: boolean;
    broadcastChanges?: boolean;
}

// Theme Controls Contract (describes state and actions returned by the theme hook)
export interface ThemeControls {
    isDarkMode: boolean;
    setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    toggleTheme: () => void;
}

// Theme Hook (restores, applies, persists, and optionally broadcasts theme changes)
export function useTheme({
    storage = 'session',
    syncLocalStorage = false,
    broadcastChanges = false,
}: UseThemeOptions = {}): ThemeControls {
    const selectedStorage = storage === 'local' ? localStorage : sessionStorage;
    const [isDarkMode, setIsDarkMode] = useState(() => selectedStorage.getItem('theme') === 'dark');

    // Theme Synchronization (updates the document class and requested storage targets)
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        selectedStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

        if (syncLocalStorage) {
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        }

        if (broadcastChanges) {
            window.dispatchEvent(new Event('themeChanged'));
        }
    }, [broadcastChanges, isDarkMode, selectedStorage, syncLocalStorage]);

    return {
        isDarkMode,
        setIsDarkMode,
        toggleTheme: () => setIsDarkMode((current) => !current),
    };
}
