import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { API_URL, apiErrorMessage } from '../../api/client';
import { authenticatedFetch, getStoredUser } from '../session';
import type { AuthenticatorAccount, MfaStatus } from '../types';
import { buttonClass, FactorField, fieldClass, secondaryClass, SecurityDialog } from './AuthenticatorForms';

// Authenticator Directory (searchable per-account metadata and reset decisions are available to both management roles).
export function AuthenticatorPanel() {
    const [accounts, setAccounts] = useState<AuthenticatorAccount[]>([]);
    const [ownStatus, setOwnStatus] = useState<MfaStatus | null>(null);
    const [search, setSearch] = useState('');
    const [pendingOnly, setPendingOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [review, setReview] = useState<{ account: AuthenticatorAccount; decision: 'approve' | 'reject' } | null>(null);
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [note, setNote] = useState('');
    const ownId = getStoredUser()?.id;
    const load = async () => {
        setLoading(true);
        try {
            const [response, own] = await Promise.all([authenticatedFetch(`${API_URL}/api/admin/authenticators`), authenticatedFetch(`${API_URL}/api/mfa/status`)]);
            if (!response.ok) throw new Error('Unable to load the authenticator directory.');
            setAccounts(await response.json() as AuthenticatorAccount[]);
            if (own.ok) setOwnStatus(await own.json() as MfaStatus);
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to refresh accounts.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { void load(); }, []);
    const openReview = (account: AuthenticatorAccount, decision: 'approve' | 'reject') => {
        setReview({ account, decision }); setPassword(''); setCode(''); setNote(''); setError(''); setMessage('');
    };
    const submit = async (event: FormEvent) => {
        event.preventDefault(); if (!review?.account.reset_request) return;
        setBusy(true); setError('');
        try {
            const response = await authenticatedFetch(`${API_URL}/api/admin/authenticators/reset-requests/${review.account.reset_request.id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: review.decision, password, code, note }) });
            const result = await response.json();
            if (!response.ok) throw new Error(apiErrorMessage(result, 'Unable to record this decision.'));
            setMessage(result.message); setReview(null); setPassword(''); setCode(''); await load();
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to record this decision.'); }
        finally { setBusy(false); }
    };
    const filtered = accounts.filter((account) => `${account.full_name || ''} ${account.email} ${account.role}`.toLowerCase().includes(search.toLowerCase()) && (!pendingOnly || account.reset_request?.status === 'pending'));
    const pending = accounts.filter((account) => account.reset_request?.status === 'pending').length;
    const date = (value?: number | null) => value ? new Date(value * 1000).toLocaleString() : '—';
    return <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h3 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="text-amber-500" />Authenticator</h3><p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Review account protection and device reset requests. Verify the account owner's identity before approving a replacement. {pending} awaiting review.</p></div><button className={secondaryClass} type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
        {error && !review && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</p>}
        <div className="mb-5 flex flex-wrap items-center gap-4"><input aria-label="Search authenticator accounts" placeholder="Search name, email, or role" className={`${fieldClass} max-w-md`} value={search} onChange={(event) => setSearch(event.target.value)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} />Pending requests only</label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Account authenticator status and latest reset request</caption><thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><tr>{['Account', 'Protection', 'Reset request', 'Review'].map((label) => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>
            {filtered.map((account) => <tr key={account.id} className="border-b border-slate-100 align-top dark:border-slate-800"><td className="px-3 py-4"><p className="font-semibold">{account.full_name || account.email}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{account.email}</p><p className="mt-1 capitalize">{account.role}{!account.is_active && ' · Inactive'}</p></td><td className="px-3 py-4"><span className={`inline-block rounded-full px-3 py-1 font-semibold ${account.enabled ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'}`}>{account.requires_enrollment ? 'Re-enrollment required' : account.enabled ? 'Enabled' : 'Disabled'}</span>{account.enrolled_at && <p className="mt-2 text-xs text-slate-500">Registered {date(account.enrolled_at)}</p>}</td><td className="max-w-xs break-words px-3 py-4">{account.reset_request ? <><p className="font-semibold capitalize">{account.reset_request.status}</p><p className="mt-1">{account.reset_request.reason}</p><p className="mt-2 text-xs text-slate-500">Requested {date(account.reset_request.created_at)}</p>{account.reset_request.reviewed_at && <p className="mt-1 text-xs text-slate-500">Reviewed {date(account.reset_request.reviewed_at)}</p>}{account.reset_request.review_note && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{account.reset_request.review_note}</p>}</> : 'No reset requests'}</td><td className="px-3 py-4">{account.reset_request?.status === 'pending' ? account.id === ownId ? <p className="max-w-40 text-xs text-slate-500">Another administrator or developer must review your request.</p> : <div className="flex flex-wrap gap-2"><button className={buttonClass} type="button" disabled={!account.is_active} onClick={() => openReview(account, 'approve')}>Approve</button><button className={secondaryClass} type="button" disabled={!account.is_active} onClick={() => openReview(account, 'reject')}>Reject</button></div> : '—'}</td></tr>)}
        </tbody></table></div>{!filtered.length && <p className="py-8 text-center text-sm text-slate-500">{loading ? 'Loading accounts…' : 'No accounts match this filter.'}</p>}
        {review && <SecurityDialog title={`${review.decision === 'approve' ? 'Approve' : 'Reject'} authenticator reset`} onClose={() => { if (!busy) { setReview(null); setPassword(''); setCode(''); setError(''); } }}><form onSubmit={(event) => void submit(event)} className="space-y-4"><p className="break-words text-sm font-semibold">{review.account.email}</p><p className="text-sm text-slate-600 dark:text-slate-300">{review.decision === 'approve' ? 'Approval revokes their old authenticator and all sessions. They must sign in and register a new authenticator before accessing the application.' : 'Rejection keeps their existing authenticator active.'}</p><label className="block space-y-2 text-sm font-semibold">Review note<textarea className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} minLength={3} maxLength={500} required disabled={busy} placeholder="Record how identity was verified, or why the request is rejected." /></label><label className="block space-y-2 text-sm font-semibold">Your current password<input type="password" autoComplete="current-password" className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>{ownStatus?.enabled && <FactorField value={code} onChange={setCode} disabled={busy} />}{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}<button className={buttonClass} disabled={busy}>{busy ? 'Saving…' : 'Confirm decision'}</button></form></SecurityDialog>}
    </section>;
}
