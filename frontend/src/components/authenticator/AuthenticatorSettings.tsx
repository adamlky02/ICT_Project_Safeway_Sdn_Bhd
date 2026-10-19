import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { API_URL, apiErrorMessage, authenticatedFetch, readJson, storeUser } from '../../api/client';
import type { MfaChallenge, MfaLoginResult, MfaStatus } from '../../types';
import { buttonClass, FactorField, fieldClass, RecoveryReceipt, secondaryClass, SecurityDialog, SetupForm } from './AuthenticatorForms';

// Profile MFA Settings (password confirmation gates enrollment, disabling, and lost-device reset requests).
export function AuthenticatorSettings() {
    const [status, setStatus] = useState<MfaStatus | null>(null);
    const [action, setAction] = useState<'enable' | 'disable' | 'reset' | null>(null);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [reason, setReason] = useState('');
    const [setup, setSetup] = useState<MfaChallenge | null>(null);
    const [codes, setCodes] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);
    const load = async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/api/mfa/status`);
            if (!response.ok) throw new Error('Unable to load authenticator settings.');
            setStatus(await response.json() as MfaStatus);
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load authenticator settings.'); }
    };
    useEffect(() => { void load(); }, []);
    const close = () => { if (!busy) { setAction(null); setPassword(''); setCode(''); setError(''); } };
    const open = (next: typeof action) => { setAction(next); setPassword(''); setCode(''); setReason(''); setError(''); setMessage(''); };
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const path = action === 'enable' ? 'enroll' : action === 'disable' ? 'disable' : 'reset-requests';
            const response = await authenticatedFetch(`${API_URL}/api/mfa/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, code, reason }) });
            const result = await response.json();
            if (!response.ok) throw new Error(apiErrorMessage(result, 'The action could not be completed.'));
            setPassword(''); setCode(''); setAction(null);
            if (action === 'enable') setSetup(result as MfaChallenge);
            else if (action === 'disable') { storeUser(result as MfaLoginResult); setMessage('MFA has been disabled. Other sessions have been signed out.'); await load(); }
            else { setMessage(result.message); setShowReceipt(true); await load(); }
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'The action could not be completed.'); }
        finally { setBusy(false); }
    };
    const confirm = async (value: string) => {
        setBusy(true); setError('');
        try {
            const response = await fetch(`${API_URL}/api/mfa/enroll/confirm`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setup_token: setup?.setup_token, code: value }) });
            const result = await readJson<MfaLoginResult & { detail?: string }>(response);
            if (!response.ok) throw new Error(apiErrorMessage(result, 'Unable to confirm your authenticator.'));
            storeUser(result); setSetup(null); setCodes(result.recovery_codes || []); await load();
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to confirm your authenticator.'); }
        finally { setBusy(false); }
    };
    return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:p-6" aria-label="Authenticator settings">
        <div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-amber-500" /><div><h2 className="text-xl font-bold">Authenticator</h2><p className="text-sm text-slate-500 dark:text-slate-400">Add a verification code to protect your account.</p></div></div>
        {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {message && !showReceipt && <p role="status" className="mb-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
        {codes.length ? <RecoveryReceipt codes={codes} onDone={() => setCodes([])} /> : setup ? <SetupForm setup={setup} busy={busy} onConfirm={(value) => void confirm(value)} onCancel={() => { setSetup(null); setError(''); }} /> : <>
            <p className="mb-4 text-sm">Status: <strong>{status ? status.enabled ? 'Enabled' : 'Disabled' : 'Loading…'}</strong></p>
            {status?.reset_request && <div className="mb-4 rounded-xl bg-slate-100 p-4 text-sm dark:bg-slate-950"><p>Latest reset request: <strong className="capitalize">{status.reset_request.status}</strong></p>{status.reset_request.review_note && <p className="mt-1">{status.reset_request.review_note}</p>}</div>}
            <div className="flex flex-wrap gap-3">{status?.enabled ? <><button type="button" className={secondaryClass} onClick={() => open('disable')}>Disable MFA</button><button type="button" className={secondaryClass} disabled={status.reset_request?.status === 'pending'} onClick={() => open('reset')}>{status.reset_request?.status === 'pending' ? 'Reset awaiting approval' : 'I want to reset my authenticator'}</button></> : <button type="button" className={buttonClass} disabled={!status} onClick={() => open('enable')}>Enable MFA</button>}<button type="button" className={secondaryClass} onClick={() => void load()}>Refresh status</button></div>
        </>}
        {action && <SecurityDialog title={action === 'enable' ? 'Enable MFA' : action === 'disable' ? 'Disable MFA' : 'Request an authenticator reset'} onClose={close}>
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">{action === 'reset' ? 'An administrator or developer will review your request before you can register a replacement device.' : action === 'disable' ? 'Confirm your password and a current authenticator or recovery code. This returns your account to password-only sign-in.' : 'Confirm your password to begin registering your authenticator app.'}</p>
                <label className="block space-y-2 text-sm font-semibold">Current password<input autoComplete="current-password" type="password" className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>
                {action === 'disable' && <FactorField value={code} onChange={setCode} disabled={busy} />}
                {action === 'reset' && <label className="block space-y-2 text-sm font-semibold">Reason<textarea className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required disabled={busy} placeholder="For example, I changed my phone." /></label>}
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button className={buttonClass} disabled={busy}>{busy ? 'Please wait…' : action === 'enable' ? 'Continue to QR setup' : action === 'disable' ? 'Confirm disabling' : 'Send reset request'}</button>
            </form>
        </SecurityDialog>}
        {showReceipt && <SecurityDialog title="Reset request sent" onClose={() => setShowReceipt(false)}><p role="status" className="mb-5">{message}</p><button type="button" className={buttonClass} onClick={() => setShowReceipt(false)}>Done</button></SecurityDialog>}
    </section>;
}
