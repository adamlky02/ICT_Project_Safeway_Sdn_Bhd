import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { MfaChallenge } from '../types';
import type { Translation } from '../../translations';

export const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
export const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryClass = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';

// Accessible Dialog (native modal focus trapping, Escape handling, and labelled content support keyboard users).
export function SecurityDialog({ title, children, onClose, t }: { title: string; children: ReactNode; onClose: () => void; t: Translation }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { ref.current?.showModal(); }, []);
    return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-label={title}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
        <div className="mb-5 flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} className="min-h-10 min-w-10 rounded-lg border border-slate-300 dark:border-slate-600" aria-label={t.close_dialog}>×</button></div>
        {children}
    </dialog>;
}

// Factor Field (accepts either a six-digit TOTP or a one-use recovery code without persisting either).
export function FactorField({ value, onChange, disabled = false, t }: { value: string; onChange: (value: string) => void; disabled?: boolean; t: Translation }) {
    return <label className="block space-y-2 text-sm font-semibold">{t.mfa_factor_label}
        <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}
            autoComplete="one-time-code" maxLength={40} disabled={disabled} required placeholder={t.mfa_factor_placeholder} />
    </label>;
}

// QR Confirmation (the QR is rendered locally; expiring setup credentials never enter URLs, logs, or browser storage).
export function SetupForm({ setup, busy, onConfirm, onCancel, t }: { setup: MfaChallenge; busy: boolean; onConfirm: (code: string) => void; onCancel: () => void; t: Translation }) {
    const [code, setCode] = useState('');
    const [seconds, setSeconds] = useState(setup.expires_in);
    useEffect(() => {
        const deadline = Date.now() + setup.expires_in * 1000;
        setCode('');
        setSeconds(setup.expires_in);
        const timer = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000);
        return () => window.clearInterval(timer);
    }, [setup]);
    const submit = (event: FormEvent) => { event.preventDefault(); if (seconds > 0) onConfirm(code); };
    return <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.mfa_setup_instructions}</p>
        {seconds > 0 && <>
            {setup.otpauth_uri && <div className="mx-auto w-fit rounded-xl bg-white p-4"><QRCodeSVG value={setup.otpauth_uri} size={200} marginSize={2} title={t.mfa_qr_alt} /></div>}
            <details className="rounded-xl border border-slate-300 p-3 dark:border-slate-700"><summary className="cursor-pointer text-sm font-semibold">{t.mfa_manual_setup}</summary><code className="mt-3 block select-all break-all text-sm">{setup.secret}</code></details>
            <label className="block space-y-2 text-sm font-semibold">{t.mfa_code_label}<input className={fieldClass} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
        </>}
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{seconds > 0 ? t.mfa_setup_expires.replace('{time}', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`) : t.mfa_setup_expired}</p>
        <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy || seconds <= 0 || code.length !== 6}>{t.mfa_verify_enable}</button><button type="button" className={secondaryClass} disabled={busy} onClick={onCancel}>{t.back}</button></div>
    </form>;
}

// Recovery Receipt (the user acknowledges saving the only displayed copy before leaving the enrollment flow).
export function RecoveryReceipt({ codes, onDone, t }: { codes: string[]; onDone: () => void; t: Translation }) {
    const [saved, setSaved] = useState(false);
    const download = () => {
        const url = URL.createObjectURL(new Blob([t.mfa_recovery_file + '\n\n' + codes.join('\n')], { type: 'text/plain' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'safeway-recovery-codes.txt'; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return <section className="space-y-4" aria-label={t.mfa_recovery_codes}>
        <h3 className="text-lg font-bold">{t.mfa_recovery_title}</h3><p className="text-sm text-slate-600 dark:text-slate-300">{t.mfa_recovery_description}</p>
        <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-100 p-4 font-mono text-sm dark:bg-slate-950 sm:grid-cols-2">{codes.map((code) => <code key={code}>{code}</code>)}</div>
        <button type="button" className={secondaryClass} onClick={download}>{t.mfa_recovery_download}</button>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />{t.mfa_recovery_saved}</label>
        <button className={buttonClass} type="button" disabled={!saved} onClick={onDone}>{t.continue_label}</button>
    </section>;
}
