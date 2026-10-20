import { API_URL, authenticatedFetch, readJson } from './client';
import type { ChatSessionDetail, ChatSessionSummary } from '../types';

/**
 * Chat History API Client
 * Modular service for interacting with /api/chat-history endpoints.
 */

// Lists all active chat sessions for the authenticated user
export async function fetchUserSessions(): Promise<ChatSessionSummary[]> {
    const response = await authenticatedFetch(`${API_URL}/api/chat-history/sessions`);
    if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
    }
    return readJson<ChatSessionSummary[]>(response);
}

// Creates a new blank chat session
export async function createSession(title?: string): Promise<ChatSessionSummary> {
    const response = await authenticatedFetch(`${API_URL}/api/chat-history/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'New Conversation' }),
    });
    if (!response.ok) {
        throw new Error('Failed to create chat session');
    }
    return readJson<ChatSessionSummary>(response);
}

// Fetches the full conversation (messages and citations) for a session
export async function fetchSessionDetail(sessionId: string): Promise<ChatSessionDetail> {
    const response = await authenticatedFetch(`${API_URL}/api/chat-history/sessions/${encodeURIComponent(sessionId)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch session detail');
    }
    return readJson<ChatSessionDetail>(response);
}

// Downloads saved messages through the authenticated export endpoint.
export async function downloadSessionHistory(sessionId: string, lastRounds?: number): Promise<void> {
    const query = lastRounds === undefined ? '' : `?last_rounds=${lastRounds}`;
    const response = await authenticatedFetch(`${API_URL}/api/chat-history/sessions/${encodeURIComponent(sessionId)}/export${query}`);
    if (!response.ok) {
        if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
        if (response.status === 404) throw new Error('This conversation is no longer available.');
        throw new Error('Unable to download chat history. Please try again.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-history-${sessionId}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Allow the browser to start the download before releasing the object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Renames an existing chat session
export async function updateSessionTitle(sessionId: string, title: string): Promise<{ message: string; id: string; title: string }> {
    const response = await authenticatedFetch(`${API_URL}/api/chat-history/sessions/${encodeURIComponent(sessionId)}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    });
    if (!response.ok) {
        throw new Error('Failed to update session title');
    }
    return readJson<{ message: string; id: string; title: string }>(response);
}

// Deletes a chat session and cascades deletion of its messages
export async function deleteSession(sessionId: string): Promise<{ message: string; id: string }> {
    const response = await authenticatedFetch(`${API_URL}/api/chat-history/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete chat session');
    }
    return readJson<{ message: string; id: string }>(response);
}
