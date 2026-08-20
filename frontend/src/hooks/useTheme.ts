import { useEffect, useState } from 'react';

type ThemeStorage = 'local' | 'session';

interface UseThemeOptions {
    storage?: ThemeStorage;
    syncLocalStorage?: boolean;
    broadcastChanges?: boolean;
}

export interface ThemeControls {
    isDarkMode: boolean;
    setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    toggleTheme: () => void;
}

export function useTheme({
    storage = 'session',
    syncLocalStorage = false,
    broadcastChanges = false,
}: UseThemeOptions = {}): ThemeControls {
    const selectedStorage = storage === 'local' ? localStorage : sessionStorage;
    const [isDarkMode, setIsDarkMode] = useState(() => selectedStorage.getItem('theme') === 'dark');

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
