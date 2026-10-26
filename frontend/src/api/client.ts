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
