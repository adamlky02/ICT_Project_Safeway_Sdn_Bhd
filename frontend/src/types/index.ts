// Shared Enumerations (define supported languages, roles, and dashboard tabs)
export type Language = 'en' | 'ms' | 'zh';
export type UserRole = 'admin' | 'staff';
export type AdminTab = 'analytics' | 'staff' | 'docs';

// Stored User (describes the authenticated account cached in the browser)
export interface StoredUser {
    id: string;
    email: string;
    role: UserRole;
    name: string;
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
