import type { StoredUser } from '../types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const STAFF_EMAIL_DOMAIN = 'safeway.com';

export async function readJson<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
}

export function getStoredUser(): StoredUser | null {
    const storedUser = localStorage.getItem('userData');
    return storedUser ? JSON.parse(storedUser) as StoredUser : null;
}

export function storeUser(user: StoredUser): void {
    localStorage.setItem('userData', JSON.stringify(user));
}
