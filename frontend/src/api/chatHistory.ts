import { API_URL, readJson } from './client';
import type { ChatSessionDetail, ChatSessionSummary } from '../types';

/**
 * Chat History API Client
 * Modular service for interacting with /api/chat-history endpoints.
 */

// Lists all active chat sessions for the given user
export async function fetchUserSessions(userId: string): Promise<ChatSessionSummary[]> {
    const response = await fetch(`${API_URL}/api/chat-history/sessions?user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
    }
    return readJson<ChatSessionSummary[]>(response);
}

// Creates a new blank chat session
export async function createSession(userId: string, title?: string): Promise<ChatSessionSummary> {
    const response = await fetch(`${API_URL}/api/chat-history/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: title || 'New Conversation' }),
    });
    if (!response.ok) {
        throw new Error('Failed to create chat session');
    }
    return readJson<ChatSessionSummary>(response);
}

// Fetches the full conversation (messages and citations) for a session
export async function fetchSessionDetail(sessionId: string, userId?: string): Promise<ChatSessionDetail> {
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const response = await fetch(`${API_URL}/api/chat-history/sessions/${encodeURIComponent(sessionId)}${query}`);
    if (!response.ok) {
        throw new Error('Failed to fetch session detail');
    }
    return readJson<ChatSessionDetail>(response);
}

// Renames an existing chat session
export async function updateSessionTitle(sessionId: string, userId: string, title: string): Promise<{ message: string; id: string; title: string }> {
    const response = await fetch(`${API_URL}/api/chat-history/sessions/${encodeURIComponent(sessionId)}/title?user_id=${encodeURIComponent(userId)}`, {
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
export async function deleteSession(sessionId: string, userId: string): Promise<{ message: string; id: string }> {
    const response = await fetch(`${API_URL}/api/chat-history/sessions/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete chat session');
    }
    return readJson<{ message: string; id: string }>(response);
}
