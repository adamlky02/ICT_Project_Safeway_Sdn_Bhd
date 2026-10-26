import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { API_URL } from '../../api/client';
import { authenticatedFetch } from '../session';
import type { MfaStatus } from '../types';

// Privileged Account Reminder (server role controls the reminder even when management enters the staff portal).
export function MfaReminder() {
    const [status, setStatus] = useState<MfaStatus | null>(null);
    useEffect(() => {
        let active = true;
        void authenticatedFetch(`${API_URL}/api/mfa/status`).then(async (response) => {
            if (response.ok && active) setStatus(await response.json() as MfaStatus);
        }).catch(() => undefined);
        return () => { active = false; };
    }, []);
    if (!status || status.enabled || !['admin', 'developer'].includes(status.role || '')) return null;
    return <aside className="mx-3 my-3 flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100" aria-label="Account security reminder"><ShieldAlert size={20} className="shrink-0" /><p className="flex-1">Your account has elevated privileges. Enable authenticator protection to improve account security.</p><Link to="/profile" className="min-h-10 py-2 font-bold underline underline-offset-4">Enable now</Link></aside>;
}
