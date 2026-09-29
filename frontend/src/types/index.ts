// Shared Enumerations (define supported languages, roles, and dashboard tabs)
export type Language = 'en' | 'ms' | 'zh';
export type UserRole = 'admin' | 'developer' | 'staff';
export type PortalRole = 'admin' | 'staff';
export type AdminTab = 'analytics' | 'staff' | 'docs' | 'ai';

// Stored User (describes the authenticated account cached in the browser)
export interface StoredUser {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    access_token: string;
}

// User Profile (describes account details returned by profile endpoints)
export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
}

// Document Source (identifies retrieved evidence displayed with an AI answer)
export interface DocumentSource {
    title: string;
    category: string;
    content: string;
    file_path: string;
}

// Chat Message (represents one rendered user or assistant message)
export interface ChatMessage {
    sender: 'bot' | 'user';
    text: string;
    isDefault?: boolean;
    sources?: DocumentSource[];
}

// Chat History Item (formats earlier turns sent back to the chat API)
export interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

// Chat Response (describes a grounded assistant reply from the API)
export interface ChatResponse {
    sender: 'bot';
    message: string;
    sources: DocumentSource[];
    session_id?: string;
}

// Chat Session Summary (for sidebar / session selector)
export interface ChatSessionSummary {
    id: string;
    user_id: string;
    title: string;
    is_archived: boolean;
    created_at?: string;
    updated_at?: string;
    last_message?: string;
}

// Persisted Message (saved message record retrieved from database)
export interface PersistedChatMessage {
    id: string;
    session_id: string;
    sender: 'user' | 'bot';
    content: string;
    sources: DocumentSource[];
    created_at: string;
}

// Chat Session Detail (complete session with all messages)
export interface ChatSessionDetail {
    id: string;
    user_id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
    messages: PersistedChatMessage[];
}

// Admin User (describes an account managed from the dashboard)
export interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active?: boolean;
    created_at?: string;
}

// Admin Document (describes indexed document metadata in the dashboard)
export interface AdminDocument {
    id: number;
    title: string;
    category: string;
    file_path: string;
    file_type: string;
    file_size?: number;
    uploaded_by?: string;
    created_at?: string;
}

// Admin Upload Item (tracks one file and its progress through a batch upload)
export interface AdminUploadItem {
    id: string;
    file: File;
    title: string;
    status: 'ready' | 'uploading' | 'success' | 'error' | 'cancelled';
    error?: string;
}

// Admin Analytics (describes service totals and health information)
export interface AdminAnalytics {
    total_users: number;
    total_docs: number;
    total_storage_mb: number;
    status: Record<string, string>;
}

// Admin Data (groups the account and document collections loaded together)
export interface AdminData {
    users: AdminUser[];
    docs: AdminDocument[];
}

// AI Provider Profile (contains only masked administrative configuration metadata)
export interface AIProviderProfile {
    display_name: string;
    provider: 'gemini' | 'openai_compatible';
    base_url: string;
    model: string;
    temperature: number;
    max_tokens: number;
    timeout_seconds: number;
    thinking_mode: 'enabled' | 'disabled';
    secret_source: 'stored' | 'render_environment';
    has_api_key: boolean;
    test_status: 'environment' | 'untested' | 'passed' | 'failed';
    tested_at?: string | null;
    latency_ms?: number | null;
    activated_at?: string | null;
}

// AI Settings State (groups active, draft, rollback, and fixed embedding configuration)
export interface AISettingsState {
    active: AIProviderProfile;
    draft: AIProviderProfile | null;
    previous: AIProviderProfile | null;
    embedding: {
        display_name: string;
        provider: 'gemini';
        model: string;
        managed_by: string;
        change_supported: false;
    };
}

// AI Provider Form (adds a write-only API key to the editable profile fields)
export interface AIProviderForm {
    display_name: string;
    provider: 'gemini' | 'openai_compatible';
    base_url: string;
    model: string;
    api_key: string;
    temperature: number;
    max_tokens: number;
    timeout_seconds: number;
    thinking_mode: 'enabled' | 'disabled';
}

// Account Form (stores new-account fields and shared document form fields)
export interface AccountForm {
    first_name: string;
    last_name: string;
    username: string;
    title: string;
    category: string;
}

// Edit Account Form (stores mutable account details in the edit dialog)
export interface EditAccountForm {
    first_name: string;
    last_name: string;
    username: string;
    password: string;
    role: UserRole;
}

// Generated Credentials (contains the temporary login returned for a new account)
export interface GeneratedCredentials {
    email: string;
    password: string;
}

// Developer Unlock Response (returns a short-lived token after password confirmation)
export interface DeveloperUnlockResponse {
    developer_token: string;
    expires_in: number;
}

// Profile Form Data (stores editable name and password confirmation fields)
export interface ProfileFormData {
    full_name: string;
    password: string;
    confirmPassword: string;
}

// API Error Body (captures an optional backend error explanation)
export interface ApiErrorBody {
    detail?: string;
}
