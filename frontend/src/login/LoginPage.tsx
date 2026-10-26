import { useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, LockKeyhole, LogIn } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_URL, apiErrorMessage, readJson, STAFF_EMAIL_DOMAIN } from '../api/client';
import { storeUser } from './session';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { PageControls } from '../components/PageControls';
import { LoginLoadingOverlay } from './components/LoginLoadingOverlay';
import { fadeUp } from '../components/motion/presets';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { buttonClass, FactorField, fieldClass, RecoveryReceipt, secondaryClass, SecurityDialog, SetupForm } from './components/AuthenticatorForms';
import type { ApiErrorBody } from '../types';
import type { MfaChallenge, MfaLoginResult, PortalRole, StoredUser } from './types';

// Login Navigation State (carries the portal role selected on the landing page)
interface LoginLocationState {
    role?: PortalRole;
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
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
    const [code, setCode] = useState('');
    const [reason, setReason] = useState('');
    const [requestOpen, setRequestOpen] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const [notice, setNotice] = useState('');
    const [completed, setCompleted] = useState<MfaLoginResult | null>(null);

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
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role }),
            });

            if (response.ok) {
                const result = await readJson<StoredUser | MfaChallenge>(response);
                setPassword(''); setCode(''); setNotice('');
                if ('mfa_required' in result) setChallenge(result);
                else finishLogin(result);
                return;
            }

            const responseError = await readJson<ApiErrorBody>(response);
            setError(apiErrorMessage(responseError, 'Login failed'));
        } catch {
            setError(lang === 'en' ? 'Network error: Could not reach server.' : 'Ralat Rangkaian / 网络错误');
        } finally {
            setIsLoading(false);
        }
    };

    // Restricted Login Actions (only verification completes login; a reset submission never grants access).
    const verify = async (value: string) => {
        if (!challenge) return;
        setIsLoading(true); setError('');
        try {
            const path = challenge.setup_required ? '/api/mfa/enroll/confirm' : '/api/login/mfa/verify';
            const response = await fetch(`${API_URL}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: value, setup_token: challenge.setup_token, challenge_token: challenge.challenge_token }) });
            const result = await readJson<MfaLoginResult & ApiErrorBody>(response);
            if (!response.ok) throw new Error(apiErrorMessage(result, 'Authenticator verification failed.'));
            if (result.recovery_codes?.length) { setCompleted(result); setChallenge(null); }
            else finishLogin(result);
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to verify your code.'); }
        finally { setIsLoading(false); }
    };
    const sendReset = async (event: FormEvent) => {
        event.preventDefault(); setIsLoading(true); setError('');
        try {
            const response = await fetch(`${API_URL}/api/login/mfa/reset-request`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge_token: challenge?.challenge_token, reason }) });
            const result = await response.json();
            if (!response.ok) throw new Error(apiErrorMessage(result, 'Unable to submit your request.'));
            setNotice(result.message); setRequestOpen(false); setRequestSent(true);
            setChallenge((previous) => previous ? { ...previous, reset_request: result.reset_request } : null);
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit your request.'); }
        finally { setIsLoading(false); }
    };
    const back = () => { setChallenge(null); setCode(''); setError(''); setNotice(''); setPassword(''); };

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
                    {t.login_desc}
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

                {/* Login Form (collects account credentials for the selected portal) */}
                {notice && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">{notice}</p>}
                {completed?.recovery_codes ? <RecoveryReceipt codes={completed.recovery_codes} onDone={() => finishLogin(completed)} /> : challenge?.setup_required ? <SetupForm setup={challenge} busy={isLoading} onConfirm={(value) => void verify(value)} onCancel={back} /> : challenge ? <form onSubmit={(event) => { event.preventDefault(); void verify(code); }} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Enter a code from your authenticator app or an unused recovery code to finish signing in.</p>
                    <FactorField value={code} onChange={setCode} disabled={isLoading} />
                    <button className={buttonClass} disabled={isLoading}>Verify and sign in</button>
                    {challenge.reset_request && <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-950"><p>Reset request: <strong className="capitalize">{challenge.reset_request.status}</strong></p>{challenge.reset_request.review_note && <p>{challenge.reset_request.review_note}</p>}</div>}
                    <button type="button" className={secondaryClass} disabled={isLoading || challenge.reset_request?.status === 'pending'} onClick={() => { setReason(''); setError(''); setRequestOpen(true); }}>{challenge.reset_request?.status === 'pending' ? 'Reset awaiting approval' : 'I want to reset my authenticator'}</button>
                    <button type="button" className="block min-h-11 text-sm font-semibold underline" disabled={isLoading} onClick={back}>Back to password / check approval</button>
                </form> : <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
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
                </form>}
                {requestOpen && <SecurityDialog title="Request an authenticator reset" onClose={() => { if (!isLoading) setRequestOpen(false); }}><form onSubmit={(event) => void sendReset(event)} className="space-y-4"><p className="text-sm">Your password was verified. An administrator or developer must approve your request before you can register a new device.</p><label className="block space-y-2 text-sm font-semibold">Reason<textarea className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required disabled={isLoading} /></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className={buttonClass} disabled={isLoading}>Send reset request</button></form></SecurityDialog>}
                {requestSent && <SecurityDialog title="Reset request sent" onClose={() => setRequestSent(false)}><p role="status" className="mb-5">{notice}</p><button className={buttonClass} type="button" onClick={() => setRequestSent(false)}>Done</button></SecurityDialog>}
            </m.div>
        </div>
    );
};

export default LoginPage;
