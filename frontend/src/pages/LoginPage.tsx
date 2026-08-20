import { useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, LockKeyhole, LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_URL, readJson, STAFF_EMAIL_DOMAIN, storeUser } from '../api/client';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { PageControls } from '../components/PageControls';
import { LoginLoadingOverlay } from '../components/login/LoginLoadingOverlay';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type { ApiErrorBody, StoredUser, UserRole } from '../types';

interface LoginLocationState {
    role?: UserRole;
}

const LoginPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const role = (location.state as LoginLocationState | null)?.role ?? 'staff';
    const { lang, t, toggleLanguage } = useLanguage();
    const { isDarkMode, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role }),
            });

            if (response.ok) {
                const user = await readJson<StoredUser>(response);
                storeUser(user);
                navigate(user.role === 'admin' ? '/admin' : '/chat');
                return;
            }

            const responseError = await readJson<ApiErrorBody>(response);
            setError(responseError.detail || 'Login failed');
        } catch {
            setError(lang === 'en' ? 'Network error: Could not reach server.' : 'Ralat Rangkaian / 网络错误');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#f0f2f5] dark:bg-[#0a0a0a] relative overflow-hidden font-sans p-4 transition-colors duration-700">
            <EngineeringBackground variant="login" />
            <PageControls
                lang={lang}
                isDarkMode={isDarkMode}
                onLanguageToggle={toggleLanguage}
                onThemeToggle={toggleTheme}
                variant="login"
            />

            {isLoading && (
                <LoginLoadingOverlay
                    title={t.auth_loading}
                    description={t.auth_desc}
                    warning={t.auth_warning}
                />
            )}

            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md z-10 relative transition-colors duration-500 animate-in fade-in slide-in-from-bottom-4">
                <button
                    onClick={() => navigate('/')}
                    disabled={isLoading}
                    className="flex items-center text-slate-500 dark:text-slate-400 mb-8 hover:text-amber-600 dark:hover:text-amber-500 transition-colors disabled:opacity-50 text-xs font-bold uppercase tracking-widest"
                    type="button"
                >
                    <ArrowLeft size={16} className="mr-2" /> {t.login_back}
                </button>

                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
                        <LockKeyhole size={24} className="text-white dark:text-slate-900" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {role === 'admin' ? t.admin_role : t.staff_role}{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{t.portal}</span>
                    </h2>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm font-medium">{t.login_desc}</p>

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-3">
                        <div className="bg-red-100 dark:bg-red-500/20 p-1 rounded-md shrink-0">
                            <span className="text-red-600 dark:text-red-500">!</span>
                        </div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.email_label}</label>
                        <input
                            type="email"
                            className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 shadow-inner"
                            placeholder={`${role}@${STAFF_EMAIL_DOMAIN}`}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.password_label}</label>
                        <input
                            type="password"
                            className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 tracking-[0.2em] shadow-inner"
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white dark:text-slate-900 py-3.5 rounded-xl font-black tracking-widest uppercase text-sm hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale shadow-lg shadow-amber-500/20 mt-6 active:scale-[0.98]"
                    >
                        {isLoading
                            ? <Loader2 className="animate-spin text-white dark:text-slate-900" size={18} />
                            : <LogIn size={18} className="text-white dark:text-slate-900" />}
                        {isLoading ? t.btn_loading : t.btn_login}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
                        {t.test_hint}<br />
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
