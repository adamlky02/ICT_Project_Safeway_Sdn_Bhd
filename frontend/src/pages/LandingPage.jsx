import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, ChevronRight, Sun, Moon, Globe } from 'lucide-react';
import { translations } from '../translations';

const LandingPage = () => {
    const navigate = useNavigate();

    // --- LANGUAGE LOGIC ---
    const [lang, setLang] = useState(() => localStorage.getItem('language') || 'en');
    const t = translations[lang];

    const toggleLanguage = () => {
        const nextLang = lang === 'en' ? 'ms' : lang === 'ms' ? 'zh' : 'en';
        setLang(nextLang);
        localStorage.setItem('language', nextLang);
    };

    // --- DARK MODE LOGIC ---
    // CORRECT (Always forces Light Mode on initial load, but respects it if navigating between pages in the same session)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // If they just landed on the site, sessionStorage will be empty, force light mode.
        // We use sessionStorage instead of localStorage so it resets when the tab closes!
        const sessionTheme = sessionStorage.getItem('theme');
        return sessionTheme === 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            sessionStorage.setItem('theme', 'dark'); // Save to session, not local
        } else {
            root.classList.remove('dark');
            sessionStorage.setItem('theme', 'light'); // Save to session, not local
        }
    }, [isDarkMode]);

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const handleSelectRole = (role) => {
        navigate('/login', { state: { role } });
    };

    return (
        // BACKGROUND: Use h-[100dvh] to lock it to exactly 1 screen height on mobile
        <div className="h-[100dvh] flex items-center justify-center bg-[#f0f2f5] dark:bg-[#050505] relative overflow-hidden font-sans p-4 md:p-8 transition-colors duration-700">

            {/* --- ENGINEERING BACKGROUND ELEMENTS --- */}
            {/* Grid overlay visible in both modes with adjusted opacity */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-40 dark:opacity-60"></div>

            {/* Ambient Oil/Amber Glows (Visible in both modes) */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

            {/* --- LIQUID BACKGROUND ORBS --- */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-amber-400/30 dark:bg-amber-600/20 blur-[100px] md:blur-[140px] mix-blend-multiply dark:mix-blend-screen transition-all duration-1000"></div>
                <div className="absolute top-[20%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-orange-400/30 dark:bg-orange-600/20 blur-[100px] md:blur-[140px] mix-blend-multiply dark:mix-blend-screen transition-all duration-1000 delay-300"></div>
                <div className="absolute -bottom-[20%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-300/30 dark:bg-blue-900/20 blur-[100px] md:blur-[140px] mix-blend-multiply dark:mix-blend-screen transition-all duration-1000 delay-500"></div>
            </div>

            {/* --- TOP RIGHT CONTROLS --- */}
            <div className="absolute top-4 right-4 md:top-8 md:right-10 z-50 flex gap-3">
                {/* Language Toggle */}
                <button
                    onClick={toggleLanguage}
                    className="p-2 md:p-3 rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-2xl saturate-150 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-slate-700 dark:text-slate-200 hover:scale-105 transition-all duration-500 flex items-center justify-center font-bold text-xs uppercase"
                    title="Change Language"
                >
                    <Globe size={18} className="md:mr-2 text-blue-500" />
                    <span className="hidden md:block">{lang}</span>
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 md:p-3 rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-2xl saturate-150 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-slate-700 dark:text-slate-200 hover:scale-105 transition-all duration-500"
                >
                    {isDarkMode ? <Sun size={20} className="text-amber-400"/> : <Moon size={20} className="text-slate-700"/>}
                </button>
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-5xl mt-8 md:mt-16">

                {/* Header Section */}
                <div className="text-center mb-10 md:mb-16 flex flex-col items-center">

                    {/* Floating Logo with Liquid Halo */}
                    <div className="relative group mb-4 md:mb-8 flex justify-center items-center">
                        <div className="absolute inset-0 bg-gradient-to-r  rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 scale-90"></div>
                        <img
                            src={isDarkMode ? "/safewaylogo.png" : "/safewaylogoblack.png"}
                            alt="Safeway Logo"
                            className="relative w-68 h-68 md:w-70 md:h-70 object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl"
                        />
                    </div>

                    {/* Modern Apple-style Typography - Translated */}
                    <h1 className="text-3xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-2 md:mb-4 tracking-tight transition-colors duration-500">
                        {lang === 'zh' ? t.landing_title.slice(0, 7) : t.landing_title.split(' ')[0]}
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 ml-2">
                            {lang === 'zh' ? t.landing_title.slice(7) : t.landing_title.split(' ').slice(1).join(' ')}
                        </span>
                    </h1>

                    <p className="text-slate-600 dark:text-slate-400 text-[10px] md:text-base font-semibold tracking-widest uppercase transition-colors duration-500">
                        {t.landing_subtitle}
                    </p>
                </div>

                {/* --- LIQUID GLASS CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 w-full max-w-4xl px-4 md:px-0">

                    {/* Admin Card */}
                    <button
                        onClick={() => handleSelectRole('admin')}
                        className="group p-5 md:p-10 text-left flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 relative overflow-hidden transition-all duration-500 hover:-translate-y-2
                        bg-white/40 dark:bg-white/5
                        backdrop-blur-3xl saturate-150
                        border border-white/60 dark:border-white/10
                        shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                        hover:shadow-[0_16px_48px_rgba(245,158,11,0.15)] dark:hover:shadow-[0_16px_48px_rgba(245,158,11,0.1)]
                        rounded-3xl md:rounded-[2.5rem]"
                    >
                        <div className="absolute inset-0 rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>

                        {/* Liquid Icon Wrapper */}
                        <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center md:mb-8 relative z-10 transition-transform duration-500 group-hover:scale-110
                            bg-gradient-to-br from-white/80 to-white/20 dark:from-white/10 dark:to-transparent
                            backdrop-blur-xl border border-white/60 dark:border-white/10
                            shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]
                            rounded-2xl md:rounded-[1.25rem]"
                        >
                            <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-amber-600 dark:text-amber-500 drop-shadow-sm" />
                        </div>

                        {/* Card Text Content - Translated */}
                        <div className="flex flex-col flex-1 relative z-10 w-full">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white mb-1 md:mb-3 tracking-tight flex items-center w-full justify-between transition-colors">
                                {t.admin_role}
                                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-slate-400 dark:text-slate-500 group-hover:text-amber-500 transition-all transform group-hover:translate-x-1 shrink-0" />
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-snug md:leading-relaxed font-medium transition-colors">
                                {t.admin_desc}
                            </p>
                        </div>
                    </button>

                    {/* Staff Card */}
                    <button
                        onClick={() => handleSelectRole('staff')}
                        className="group p-5 md:p-10 text-left flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 relative overflow-hidden transition-all duration-500 hover:-translate-y-2
                        bg-white/40 dark:bg-white/5
                        backdrop-blur-3xl saturate-150
                        border border-white/60 dark:border-white/10
                        shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                        hover:shadow-[0_16px_48px_rgba(234,88,12,0.15)] dark:hover:shadow-[0_16px_48px_rgba(234,88,12,0.1)]
                        rounded-3xl md:rounded-[2.5rem]"
                    >
                        <div className="absolute inset-0 rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>

                        {/* Liquid Icon Wrapper */}
                        <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center md:mb-8 relative z-10 transition-transform duration-500 group-hover:scale-110
                            bg-gradient-to-br from-white/80 to-white/20 dark:from-white/10 dark:to-transparent
                            backdrop-blur-xl border border-white/60 dark:border-white/10
                            shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]
                            rounded-2xl md:rounded-[1.25rem]"
                        >
                            <Users className="w-7 h-7 md:w-8 md:h-8 text-orange-600 dark:text-orange-500 drop-shadow-sm" />
                        </div>

                        {/* Card Text Content - Translated */}
                        <div className="flex flex-col flex-1 relative z-10 w-full">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white mb-1 md:mb-3 tracking-tight flex items-center w-full justify-between transition-colors">
                                {t.staff_role}
                                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-slate-400 dark:text-slate-500 group-hover:text-orange-500 transition-all transform group-hover:translate-x-1 shrink-0" />
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-snug md:leading-relaxed font-medium transition-colors">
                                {t.staff_desc}
                            </p>
                        </div>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default LandingPage;