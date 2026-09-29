import { useState } from 'react';
import { translations, type Translation } from '../translations';
import type { Language } from '../types';

// Language Cycle (defines the order used by the language toggle)
const languageOrder: Language[] = ['en', 'ms', 'zh'];

// Language Validation (checks whether a stored value is a supported language)
function isLanguage(value: string | null): value is Language {
    return value !== null && languageOrder.includes(value as Language);
}

// Language Controls Contract (describes values returned to pages using this hook)
export interface LanguageControls {
    lang: Language;
    t: Translation;
    toggleLanguage: () => void;
}

// Language Hook (restores, translates, cycles, and persists the selected language)
export function useLanguage(): LanguageControls {
    const [lang, setLang] = useState<Language>(() => {
        const storedLanguage = localStorage.getItem('language');
        return isLanguage(storedLanguage) ? storedLanguage : 'en';
    });

    // Language Toggle (advances to the next supported language and saves it)
    const toggleLanguage = () => {
        const currentIndex = languageOrder.indexOf(lang);
        const nextLang = languageOrder[(currentIndex + 1) % languageOrder.length];
        setLang(nextLang);
        localStorage.setItem('language', nextLang);
    };

    return { lang, t: translations[lang], toggleLanguage };
}
