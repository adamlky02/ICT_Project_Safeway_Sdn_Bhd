import { useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_URL, readJson, STAFF_EMAIL_DOMAIN, storeUser } from '../api/client';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { PageControls } from '../components/PageControls';
import { LoginLoadingOverlay } from '../components/login/LoginLoadingOverlay';
import { fadeUp } from '../components/motion/presets';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type { ApiErrorBody, LoginMfaChallenge, PortalRole, StoredUser } from '../types';

// Login Navigation State (carries the portal role selected on the landing page)
interface LoginLocationState {
    role?: PortalRole;
}

// MFA Response Detection (distinguishes a pending authenticator challenge from a completed login)
function isLoginMfaChallenge(result: StoredUser | LoginMfaChallenge): result is LoginMfaChallenge {
    return 'mfa_required' in result && result.mfa_required;
}

// Login Page (authenticates a user for the selected staff or administrator portal)
const LoginPage = () => {
    // Login State (connects navigation, display controls, credentials, errors, and progress)
    const location = useLocation();
    const navigate = useNavigate();
    const role = (location.state as LoginLocationState | null)?.role ?? 'staff';
    const { lang, t, toggleLanguage } = useLanguage();
    const { isDarkMode, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaChallenge, setMfaChallenge] = useState<LoginMfaChallenge | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Completed Login (stores the issued session and opens the workspace selected by the response role)
    const finishLogin = (user: StoredUser) => {
        storeUser(user);
        navigate(user.role === 'admin' || user.role === 'developer' ? '/admin' : '/chat');
    };

    // Login Submission (validates credentials through the API and routes the accepted role)
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
                const result = await readJson<StoredUser | LoginMfaChallenge>(response);
                // Pending MFA (clears the password and waits for verification before storing an authenticated session)
                if (isLoginMfaChallenge(result)) {
                    setPassword('');
                    setMfaChallenge(result);
                    return;
                }
                finishLogin(result);
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

    // Authenticator Submission (sends the pending challenge token and code to complete enrollment or login)
    const handleMfaVerification = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!mfaChallenge) return;
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/login/mfa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mfa_token: mfaChallenge.mfa_token, code: mfaCode }),
            });

            if (response.ok) {
                finishLogin(await readJson<StoredUser>(response));
                return;
            }

            const responseError = await readJson<ApiErrorBody>(response);
            setError(responseError.detail || 'Authentication code verification failed');
        } catch {
            setError(lang === 'en' ? 'Network error: Could not reach server.' : 'Ralat Rangkaian / 网络错误');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100svh] min-h-[100dvh] flex items-start sm:items-center justify-center bg-[#f0f2f5] dark:bg-[#0a0a0a] relative overflow-x-hidden overflow-y-auto font-sans px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(5.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-16 transition-colors duration-700">
            {/* Page Background and Controls (provide ambient visuals plus language and theme actions) */}
            <EngineeringBackground variant="login" />
            <PageControls
                lang={lang}
                isDarkMode={isDarkMode}
                onLanguageToggle={toggleLanguage}
                onThemeToggle={toggleTheme}
                variant="login"
            />

            {/* Authentication Overlay (blocks duplicate submissions while login is pending) */}
            <AnimatePresence>
                {isLoading && (
                    <LoginLoadingOverlay
                        title={t.auth_loading}
                        description={t.auth_desc}
                        warning={t.auth_warning}
                    />
                )}
            </AnimatePresence>

            {/* Login Card (contains portal identity, validation feedback, and credential fields) */}
            <m.div
                className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md z-10 relative transition-colors duration-500"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
            >
                {/* Back Navigation (returns to portal selection without submitting credentials) */}
                <button
                    onClick={() => navigate('/')}
                    disabled={isLoading}
                    className="flex min-h-11 items-center text-slate-500 dark:text-slate-400 mb-5 sm:mb-8 hover:text-amber-600 dark:hover:text-amber-500 transition-colors disabled:opacity-50 text-xs font-bold uppercase tracking-widest"
                    type="button"
                >
                    <ArrowLeft size={16} className="mr-2" /> {t.login_back}
                </button>

                {/* Portal Identity (shows whether staff or administrator access is requested) */}
                <div className="flex min-w-0 items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
                        <LockKeyhole size={24} className="text-white dark:text-slate-900" />
                    </div>
                    <h2 className="min-w-0 text-[clamp(1.35rem,7vw,1.875rem)] font-black leading-tight text-slate-900 dark:text-white uppercase tracking-tight">
                        {role === 'admin' ? t.admin_role : t.staff_role}{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{t.portal}</span>
                    </h2>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 text-sm font-medium leading-relaxed">
                    {mfaChallenge
                        ? (mfaChallenge.mfa_setup_required ? t.mfa_setup_instructions : t.mfa_prompt)
                        : t.login_desc}
                </p>

                {/* Login Error (shows a failed credential or network response) */}
                <AnimatePresence initial={false}>
                    {error && (
                        <m.div
                            className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-3"
                            initial={{ opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                        >
                            <div className="bg-red-100 dark:bg-red-500/20 p-1 rounded-md shrink-0">
                                <span className="text-red-600 dark:text-red-500">!</span>
                            </div>
                            {error}
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Authentication Forms (switches from account credentials to the pending authenticator step) */}
                {mfaChallenge ? (
                    <form onSubmit={handleMfaVerification} className="space-y-4 sm:space-y-5">
                        {/* Authenticator Enrollment (renders a local QR code and manual secret for first-time setup) */}
                        {mfaChallenge.mfa_setup_required && mfaChallenge.secret && (
                            <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-sm text-slate-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-slate-200">
                                {mfaChallenge.otpauth_url && (
                                    <div className="inline-flex rounded-xl bg-white p-3">
                                        <QRCodeSVG
                                            value={mfaChallenge.otpauth_url}
                                            size={220}
                                            level="M"
                                            marginSize={2}
                                            title={t.mfa_qr_alt}
                                        />
                                    </div>
                                )}
                                <p>{t.mfa_setup_instructions}</p>
                                <details className="text-left">
                                    <summary className="cursor-pointer font-bold text-amber-700 underline dark:text-amber-400">
                                        {t.mfa_manual_setup}
                                    </summary>
                                    <code className="mt-2 block select-all break-all rounded-lg bg-white p-3 font-mono text-base font-bold tracking-wider dark:bg-slate-950">
                                        {mfaChallenge.secret}
                                    </code>
                                </details>
                            </div>
                        )}

                        {/* Authenticator Code (collects exactly six numeric digits for the pending challenge) */}
                        <div className="space-y-1.5">
                            <label htmlFor="mfa-code" className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                {t.mfa_code_label}
                            </label>
                            <input
                                id="mfa-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-center font-mono text-xl tracking-[0.4em] text-slate-900 shadow-inner outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 dark:border-slate-800 dark:bg-[#0a0a0a] dark:text-white"
                                value={mfaCode}
                                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || mfaCode.length !== 6}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:grayscale active:scale-[0.98] dark:text-slate-900"
                        >
                            {isLoading
                                ? <Loader2 className="animate-spin" size={18} />
                                : <ShieldCheck size={18} />}
                            {isLoading ? t.btn_loading : t.mfa_verify}
                        </button>
                        {/* Credential Step Reset (discards the local challenge and code when returning to login) */}
                        <button
                            type="button"
                            onClick={() => {
                                setMfaChallenge(null);
                                setMfaCode('');
                                setError('');
                            }}
                            disabled={isLoading}
                            className="flex min-h-11 w-full items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-amber-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-amber-500"
                        >
                            <ArrowLeft size={16} /> {t.mfa_back}
                        </button>
                    </form>
                ) : (
                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
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
                )}

            </m.div>
        </div>
    );
};

export default LoginPage;
