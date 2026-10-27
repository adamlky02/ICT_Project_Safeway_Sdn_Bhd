import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { API_URL, apiErrorMessage, readJson } from '../../api/client';
import { authenticatedFetch, storeUser } from '../session';
import type { MfaChallenge, MfaLoginResult, MfaStatus } from '../types';
import type { Translation } from '../../translations';
import { buttonClass, FactorField, fieldClass, RecoveryReceipt, secondaryClass, SecurityDialog, SetupForm } from './AuthenticatorForms';

// Profile MFA Settings (password confirmation gates enrollment, disabling, and lost-device reset requests).
export function AuthenticatorSettings({ t }: { t: Translation }) {
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
            if (!response.ok) throw new Error(t.mfa_load_failed);
            setStatus(await response.json() as MfaStatus);
        } catch (caught) { setError(caught instanceof Error ? caught.message : t.mfa_load_failed); }
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
            if (!response.ok) throw new Error(apiErrorMessage(result, t.mfa_action_failed));
            setPassword(''); setCode(''); setAction(null);
            if (action === 'enable') setSetup(result as MfaChallenge);
            else if (action === 'disable') { storeUser(result as MfaLoginResult); setMessage(t.mfa_disabled_notice); await load(); }
            else { setMessage(t.mfa_reset_sent_notice); setShowReceipt(true); await load(); }
        } catch (caught) { setError(caught instanceof Error ? caught.message : t.mfa_action_failed); }
        finally { setBusy(false); }
    };
    const confirm = async (value: string) => {
        setBusy(true); setError('');
        try {
            const response = await fetch(`${API_URL}/api/mfa/enroll/confirm`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setup_token: setup?.setup_token, code: value }) });
            const result = await readJson<MfaLoginResult & { detail?: string }>(response);
            if (!response.ok) throw new Error(apiErrorMessage(result, t.mfa_confirm_failed));
            storeUser(result); setSetup(null); setCodes(result.recovery_codes || []); await load();
        } catch (caught) { setError(caught instanceof Error ? caught.message : t.mfa_confirm_failed); }
        finally { setBusy(false); }
    };
    return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:p-6" aria-label={t.mfa_settings}>
        <div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-amber-500" /><div><h2 className="text-xl font-bold">{t.authenticator}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{t.mfa_description}</p></div></div>
        {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {message && !showReceipt && <p role="status" className="mb-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
        {codes.length ? <RecoveryReceipt t={t} codes={codes} onDone={() => setCodes([])} /> : setup ? <SetupForm t={t} setup={setup} busy={busy} onConfirm={(value) => void confirm(value)} onCancel={() => { setSetup(null); setError(''); }} /> : <>
            <p className="mb-4 text-sm">{t.status_label}: <strong>{status ? status.enabled ? t.enabled : t.disabled : t.loading}</strong></p>
            {status?.reset_request && <div className="mb-4 rounded-xl bg-slate-100 p-4 text-sm dark:bg-slate-950"><p>{t.mfa_latest_reset}: <strong className="capitalize">{t[`mfa_status_${status.reset_request.status}`]}</strong></p>{status.reset_request.review_note && <p className="mt-1">{status.reset_request.review_note}</p>}</div>}
            <div className="flex flex-wrap gap-3">{status?.enabled ? <><button type="button" className={secondaryClass} onClick={() => open('disable')}>{t.mfa_disable}</button><button type="button" className={secondaryClass} disabled={status.reset_request?.status === 'pending'} onClick={() => open('reset')}>{status.reset_request?.status === 'pending' ? t.mfa_reset_pending : t.mfa_reset_action}</button></> : <button type="button" className={buttonClass} disabled={!status} onClick={() => open('enable')}>{t.mfa_enable}</button>}<button type="button" className={secondaryClass} onClick={() => void load()}>{t.mfa_refresh_status}</button></div>
        </>}
        {action && <SecurityDialog t={t} title={action === 'enable' ? t.mfa_enable : action === 'disable' ? t.mfa_disable : t.mfa_reset_title} onClose={close}>
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">{action === 'reset' ? t.mfa_reset_description : action === 'disable' ? t.mfa_disable_description : t.mfa_enable_description}</p>
                <label className="block space-y-2 text-sm font-semibold">{t.current_password}<input autoComplete="current-password" type="password" className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>
                {action === 'disable' && <FactorField t={t} value={code} onChange={setCode} disabled={busy} />}
                {action === 'reset' && <label className="block space-y-2 text-sm font-semibold">{t.reason}<textarea className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required disabled={busy} placeholder={t.mfa_reset_reason_placeholder} /></label>}
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button className={buttonClass} disabled={busy}>{busy ? t.please_wait : action === 'enable' ? t.mfa_continue_setup : action === 'disable' ? t.mfa_confirm_disable : t.mfa_send_reset}</button>
            </form>
        </SecurityDialog>}
        {showReceipt && <SecurityDialog t={t} title={t.mfa_reset_sent} onClose={() => setShowReceipt(false)}><p role="status" className="mb-5">{message}</p><button type="button" className={buttonClass} onClick={() => setShowReceipt(false)}>{t.done}</button></SecurityDialog>}
    </section>;
}
