import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft, Loader2, LockKeyhole, Sun, Moon, Globe } from 'lucide-react';
import { translations } from '../translations';

const LoginPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const role = state?.role || 'staff';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const STAFF_EMAIL_DOMAIN = 'safeway.com';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("userData", JSON.stringify(data));
                if (data.role === 'admin') navigate('/admin');
                else navigate('/chat');
            } else {
                setError(data.detail || "Login failed");
                setIsLoading(false);
            }
        } catch (err) {
            setError(lang === 'en' ? "Network error: Could not reach server." : "Ralat Rangkaian / 网络错误");
            setIsLoading(false);
        }
    };

    return (
        // INDUSTRIAL BACKGROUND: Adapts perfectly from Light Blueprint to Dark Carbon
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#f0f2f5] dark:bg-[#0a0a0a] relative overflow-hidden font-sans p-4 transition-colors duration-700">

            {/* Engineering Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 dark:opacity-100 pointer-events-none z-0 transition-opacity duration-700"></div>

            {/* Ambient Oil/Amber Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-400/20 dark:bg-amber-600/10 rounded-full blur-[120px] pointer-events-none transition-colors duration-700"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-orange-400/20 dark:bg-orange-600/10 rounded-full blur-[100px] pointer-events-none transition-colors duration-700"></div>

            {/* --- TOP RIGHT CONTROLS --- */}
            <div className="absolute top-4 right-4 md:top-8 md:right-10 z-50 flex gap-3">
                {/* Language Toggle */}
                <button
                    onClick={toggleLanguage}
                    className="p-2 md:p-3 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-2xl saturate-150 border border-slate-200 dark:border-white/10 shadow-sm text-slate-700 dark:text-slate-200 hover:scale-105 transition-all duration-500 flex items-center justify-center font-bold text-xs uppercase"
                    title="Change Language"
                >
                    <Globe size={18} className="md:mr-1 text-blue-600 dark:text-blue-500" />
                    <span className="hidden md:block">{lang}</span>
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 md:p-3 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-2xl saturate-150 border border-slate-200 dark:border-white/10 shadow-sm text-slate-700 dark:text-slate-200 hover:scale-105 transition-all duration-500"
                    title="Toggle Theme"
                >
                    {isDarkMode ? <Sun size={20} className="text-amber-500"/> : <Moon size={20} className="text-slate-700"/>}
                </button>
            </div>

            {/* --- LOADING POP-UP OVERLAY --- */}
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-slate-100/60 dark:bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-center transition-all duration-500">
                    <div className="bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 p-8 rounded-3xl shadow-2xl dark:shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col items-center max-w-sm w-full mx-4 text-center">
                        <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-wide uppercase">{t.auth_loading}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {t.auth_desc}
                            <br/><br/>
                            <span className="italic text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/20 font-bold uppercase tracking-widest">
                                {t.auth_warning}
                            </span>
                        </p>
                    </div>
                </div>
            )}

            {/* LOGIN CARD - Glassmorphic */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md z-10 relative transition-colors duration-500 animate-in fade-in slide-in-from-bottom-4">

                <button
                    onClick={() => navigate('/')}
                    disabled={isLoading}
                    className="flex items-center text-slate-500 dark:text-slate-400 mb-8 hover:text-amber-600 dark:hover:text-amber-500 transition-colors disabled:opacity-50 text-xs font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={16} className="mr-2" /> {t.login_back}
                </button>

                {/* Industrial Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
                        <LockKeyhole size={24} className="text-white dark:text-slate-900" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {role === 'admin' ? t.admin_role : t.staff_role} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{t.portal}</span>
                    </h2>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm font-medium">
                    {t.login_desc}
                </p>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-3">
                        <div className="bg-red-100 dark:bg-red-500/20 p-1 rounded-md shrink-0"><span className="text-red-600 dark:text-red-500">!</span></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.email_label}</label>
                        <input
                            type="email"
                            className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 shadow-inner"
                            placeholder={`${role}@${STAFF_EMAIL_DOMAIN}`}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.password_label}</label>
                        <input
                            type="password"
                            className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 tracking-[0.2em] shadow-inner"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white dark:text-slate-900 py-3.5 rounded-xl font-black tracking-widest uppercase text-sm hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale shadow-lg shadow-amber-500/20 mt-6 active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 className="animate-spin text-white dark:text-slate-900" size={18} /> : <LogIn size={18} className="text-white dark:text-slate-900" />}
                        {isLoading ? t.btn_loading : t.btn_login}
                    </button>
                </form>

                {/* Fake credentials hint formatted for the theme */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
                        {t.test_hint}<br/>
                        <span className="font-mono text-amber-600 dark:text-amber-500 mt-1.5 block text-xs">
                            {role}@{STAFF_EMAIL_DOMAIN} / {role === 'staff' ? 'staff123' : 'admin123'}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;