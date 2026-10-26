import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { MfaChallenge } from '../types';

export const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
export const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryClass = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';

// Accessible Dialog (native modal focus trapping, Escape handling, and labelled content support keyboard users).
export function SecurityDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { ref.current?.showModal(); }, []);
    return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-label={title}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
        <div className="mb-5 flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} className="min-h-10 min-w-10 rounded-lg border border-slate-300 dark:border-slate-600" aria-label="Close dialog">×</button></div>
        {children}
    </dialog>;
}

// Factor Field (accepts either a six-digit TOTP or a one-use recovery code without persisting either).
export function FactorField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
    return <label className="block space-y-2 text-sm font-semibold">Authenticator or recovery code
        <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}
            autoComplete="one-time-code" maxLength={40} disabled={disabled} required placeholder="Six-digit code or recovery code" />
    </label>;
}

// QR Confirmation (the QR is rendered locally; expiring setup credentials never enter URLs, logs, or browser storage).
export function SetupForm({ setup, busy, onConfirm, onCancel }: { setup: MfaChallenge; busy: boolean; onConfirm: (code: string) => void; onCancel: () => void }) {
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
        <p className="text-sm text-slate-600 dark:text-slate-300">Scan with Google Authenticator, Microsoft Authenticator, or another TOTP app. Enter its code to finish registering this device.</p>
        {seconds > 0 && <>
            {setup.otpauth_uri && <div className="mx-auto w-fit rounded-xl bg-white p-4"><QRCodeSVG value={setup.otpauth_uri} size={200} marginSize={2} title="Safeway authenticator setup QR code" /></div>}
            <details className="rounded-xl border border-slate-300 p-3 dark:border-slate-700"><summary className="cursor-pointer text-sm font-semibold">Cannot scan? Enter the setup key manually</summary><code className="mt-3 block select-all break-all text-sm">{setup.secret}</code></details>
            <label className="block space-y-2 text-sm font-semibold">Six-digit authenticator code<input className={fieldClass} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
        </>}
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{seconds > 0 ? `Setup expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.` : 'This setup has expired. Start again to register your authenticator.'}</p>
        <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy || seconds <= 0 || code.length !== 6}>Verify and enable MFA</button><button type="button" className={secondaryClass} disabled={busy} onClick={onCancel}>Back</button></div>
    </form>;
}

// Recovery Receipt (the user acknowledges saving the only displayed copy before leaving the enrollment flow).
export function RecoveryReceipt({ codes, onDone }: { codes: string[]; onDone: () => void }) {
    const [saved, setSaved] = useState(false);
    const download = () => {
        const url = URL.createObjectURL(new Blob(['Safeway recovery codes\nKeep these private. Each code works once.\n\n' + codes.join('\n')], { type: 'text/plain' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'safeway-recovery-codes.txt'; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return <section className="space-y-4" aria-label="Recovery codes">
        <h3 className="text-lg font-bold">Save your recovery codes</h3><p className="text-sm text-slate-600 dark:text-slate-300">MFA is enabled. These codes are shown once. Store them privately, separately from your phone. Each code can replace one authenticator code.</p>
        <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-100 p-4 font-mono text-sm dark:bg-slate-950 sm:grid-cols-2">{codes.map((code) => <code key={code}>{code}</code>)}</div>
        <button type="button" className={secondaryClass} onClick={download}>Download recovery codes</button>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />I have saved these recovery codes.</label>
        <button className={buttonClass} type="button" disabled={!saved} onClick={onDone}>Continue</button>
    </section>;
}
