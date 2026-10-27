import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { API_URL, apiErrorMessage } from '../../api/client';
import { authenticatedFetch, getStoredUser } from '../session';
import type { AuthenticatorAccount, MfaStatus } from '../types';
import type { Translation } from '../../translations';
import type { Language } from '../../types';
import { buttonClass, FactorField, fieldClass, secondaryClass, SecurityDialog } from './AuthenticatorForms';

// Authenticator Directory (searchable per-account metadata and reset decisions are available to both management roles).
export function AuthenticatorPanel({ t, lang }: { t: Translation; lang: Language }) {
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
            if (!response.ok) throw new Error(t.mfa_directory_failed);
            setAccounts(await response.json() as AuthenticatorAccount[]);
            if (own.ok) setOwnStatus(await own.json() as MfaStatus);
        } catch (caught) { setError(caught instanceof Error ? caught.message : t.mfa_refresh_failed); }
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
            if (!response.ok) throw new Error(apiErrorMessage(result, t.mfa_decision_failed));
            setMessage(review.decision === 'approve' ? t.mfa_reset_approved_notice : t.mfa_reset_rejected_notice); setReview(null); setPassword(''); setCode(''); await load();
        } catch (caught) { setError(caught instanceof Error ? caught.message : t.mfa_decision_failed); }
        finally { setBusy(false); }
    };
    const filtered = accounts.filter((account) => `${account.full_name || ''} ${account.email} ${account.role} ${account.role === 'admin' ? t.admin_role : account.role === 'developer' ? t.developer_role : t.staff_role}`.toLowerCase().includes(search.toLowerCase()) && (!pendingOnly || account.reset_request?.status === 'pending'));
    const pending = accounts.filter((account) => account.reset_request?.status === 'pending').length;
    const date = (value?: number | null) => value ? new Date(value * 1000).toLocaleString({ en: 'en-MY', ms: 'ms-MY', zh: 'zh-CN' }[lang]) : '—';
    return <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h3 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="text-amber-500" />{t.authenticator}</h3><p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t.mfa_directory_description} {t.mfa_pending_count.replace('{count}', String(pending))}</p></div><button className={secondaryClass} type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />{t.refresh}</button></div>
        {error && !review && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</p>}
        <div className="mb-5 flex flex-wrap items-center gap-4"><input aria-label={t.mfa_search_label} placeholder={t.mfa_search_placeholder} className={`${fieldClass} max-w-md`} value={search} onChange={(event) => setSearch(event.target.value)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} />{t.mfa_pending_only}</label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">{t.mfa_table_caption}</caption><thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><tr>{[t.account_label, t.protection_label, t.mfa_reset_request, t.review_label].map((label) => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>
            {filtered.map((account) => <tr key={account.id} className="border-b border-slate-100 align-top dark:border-slate-800"><td className="px-3 py-4"><p className="font-semibold">{account.full_name || account.email}</p><p className="mt-1 text-slate-500 dark:text-slate-400">{account.email}</p><p className="mt-1 capitalize">{account.role === 'admin' ? t.admin_role : account.role === 'developer' ? t.developer_role : t.staff_role}{!account.is_active && ` · ${t.inactive}`}</p></td><td className="px-3 py-4"><span className={`inline-block rounded-full px-3 py-1 font-semibold ${account.enabled ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'}`}>{account.requires_enrollment ? t.mfa_reenrollment_required : account.enabled ? t.enabled : t.disabled}</span>{account.enrolled_at && <p className="mt-2 text-xs text-slate-500">{t.mfa_registered.replace('{date}', date(account.enrolled_at))}</p>}</td><td className="max-w-xs break-words px-3 py-4">{account.reset_request ? <><p className="font-semibold capitalize">{t[`mfa_status_${account.reset_request.status}`]}</p><p className="mt-1">{account.reset_request.reason}</p><p className="mt-2 text-xs text-slate-500">{t.mfa_requested.replace('{date}', date(account.reset_request.created_at))}</p>{account.reset_request.reviewed_at && <p className="mt-1 text-xs text-slate-500">{t.mfa_reviewed.replace('{date}', date(account.reset_request.reviewed_at))}</p>}{account.reset_request.review_note && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{account.reset_request.review_note}</p>}</> : t.mfa_no_requests}</td><td className="px-3 py-4">{account.reset_request?.status === 'pending' ? account.id === ownId ? <p className="max-w-40 text-xs text-slate-500">{t.mfa_other_reviewer}</p> : <div className="flex flex-wrap gap-2"><button className={buttonClass} type="button" disabled={!account.is_active} onClick={() => openReview(account, 'approve')}>{t.approve}</button><button className={secondaryClass} type="button" disabled={!account.is_active} onClick={() => openReview(account, 'reject')}>{t.reject}</button></div> : '—'}</td></tr>)}
        </tbody></table></div>{!filtered.length && <p className="py-8 text-center text-sm text-slate-500">{loading ? t.mfa_loading_accounts : t.mfa_no_accounts}</p>}
        {review && <SecurityDialog t={t} title={review.decision === 'approve' ? t.mfa_approve_reset : t.mfa_reject_reset} onClose={() => { if (!busy) { setReview(null); setPassword(''); setCode(''); setError(''); } }}><form onSubmit={(event) => void submit(event)} className="space-y-4"><p className="break-words text-sm font-semibold">{review.account.email}</p><p className="text-sm text-slate-600 dark:text-slate-300">{review.decision === 'approve' ? t.mfa_approve_description : t.mfa_reject_description}</p><label className="block space-y-2 text-sm font-semibold">{t.mfa_review_note}<textarea className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} minLength={3} maxLength={500} required disabled={busy} placeholder={t.mfa_review_placeholder} /></label><label className="block space-y-2 text-sm font-semibold">{t.mfa_your_password}<input type="password" autoComplete="current-password" className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>{ownStatus?.enabled && <FactorField t={t} value={code} onChange={setCode} disabled={busy} />}{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}<button className={buttonClass} disabled={busy}>{busy ? t.saving : t.mfa_confirm_decision}</button></form></SecurityDialog>}
    </section>;
}
