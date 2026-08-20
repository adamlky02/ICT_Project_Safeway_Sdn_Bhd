import { useState } from 'react';
import { translations, type Translation } from '../translations';
import type { Language } from '../types';

const languageOrder: Language[] = ['en', 'ms', 'zh'];

function isLanguage(value: string | null): value is Language {
    return value !== null && languageOrder.includes(value as Language);
}

export interface LanguageControls {
    lang: Language;
    t: Translation;
    toggleLanguage: () => void;
}

export function useLanguage(): LanguageControls {
    const [lang, setLang] = useState<Language>(() => {
        const storedLanguage = localStorage.getItem('language');
        return isLanguage(storedLanguage) ? storedLanguage : 'en';
    });

    const toggleLanguage = () => {
        const currentIndex = languageOrder.indexOf(lang);
        const nextLang = languageOrder[(currentIndex + 1) % languageOrder.length];
        setLang(nextLang);
        localStorage.setItem('language', nextLang);
    };

    return { lang, t: translations[lang], toggleLanguage };
}
