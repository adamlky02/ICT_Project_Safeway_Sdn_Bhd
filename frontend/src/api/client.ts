import type { StoredUser } from '../types';

// Public API Settings (only the HTTPS backend address belongs in the frontend build).
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');
export const STAFF_EMAIL_DOMAIN = 'safeway.com';

export async function readJson<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
}

// API Feedback (validation errors show their message text without echoing request input or object representations).
export function apiErrorMessage(body: { detail?: unknown }, fallback: string): string {
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
        const messages = body.detail.map((item: { msg?: unknown }) => typeof item.msg === 'string' ? item.msg : '').filter(Boolean);
        if (messages.length) return messages.join(' ');
    }
    return fallback;
}

// Browser Identity Cache (the HttpOnly cookie holds the session; local storage contains no usable credential).
export function getStoredUser(): StoredUser | null {
    try { return JSON.parse(localStorage.getItem('userData') || 'null') as StoredUser | null; }
    catch { localStorage.removeItem('userData'); return null; }
}
export function storeUser(user: StoredUser): void {
    const { id, email, role, name } = user;
    localStorage.setItem('userData', JSON.stringify({ id, email, role, name, access_token: 'cookie' }));
}

// Cookie Requests (a custom header and the backend origin check protect state-changing requests against CSRF).
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('X-Safeway-Request', '1');
    const response = await fetch(input, { ...init, credentials: 'include', headers });
    if (response.status === 401 && response.headers.get('X-Session-Expired') === '1' && getStoredUser()) {
        const previousRole = getStoredUser()?.role;
        localStorage.removeItem('userData');
        window.dispatchEvent(new CustomEvent('safeway-session-expired', { detail: { role: previousRole === 'staff' ? 'staff' : 'admin' } }));
    }
    return response;
}

// Server Logout (revocation happens before clearing the identity cache; errors still clear the local interface).
export async function logout(): Promise<void> {
    try { await authenticatedFetch(`${API_URL}/api/logout`, { method: 'POST' }); }
    finally { localStorage.removeItem('userData'); }
}
