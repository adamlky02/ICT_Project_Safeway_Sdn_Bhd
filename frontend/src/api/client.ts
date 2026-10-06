import type { StoredUser } from '../types';

// API Settings (defines the backend address and staff account domain)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const STAFF_EMAIL_DOMAIN = 'safeway.com';

// Typed JSON Reader (parses an HTTP response into the caller's expected data type)
export async function readJson<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
}

// Stored Session Reader (restores the signed-in user from local browser storage)
export function getStoredUser(): StoredUser | null {
    const storedUser = localStorage.getItem('userData');
    return storedUser ? JSON.parse(storedUser) as StoredUser : null;
}

// Stored Session Writer (persists the signed-in user for later page loads)
export function storeUser(user: StoredUser): void {
    localStorage.setItem('userData', JSON.stringify(user));
}

// Keep the credentials until the server confirms revocation, so failed logout can be retried.
let pendingLogout: Promise<void> | null = null;
export function logoutSession(): Promise<void> {
    if (pendingLogout) return pendingLogout;
    pendingLogout = (async () => {
        const token = getStoredUser()?.access_token;
        if (token) {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 10000);
            try {
                const response = await fetch(`${API_URL}/api/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (!response.ok && response.status !== 401) {
                    throw new Error('Unable to log out. Please try again.');
                }
            } finally {
                window.clearTimeout(timer);
            }
        }
        // Do not remove a newer login established in another tab during this request.
        if (getStoredUser()?.access_token === token) localStorage.removeItem('userData');
    })().finally(() => { pendingLogout = null; });
    return pendingLogout;
}

// Authenticated Request (attaches the signed login token without disturbing FormData headers)
export function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const accessToken = getStoredUser()?.access_token;
    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return fetch(input, { ...init, headers });
}
