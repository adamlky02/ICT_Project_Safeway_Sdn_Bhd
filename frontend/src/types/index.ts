export type Language = 'en' | 'ms' | 'zh';
export type UserRole = 'admin' | 'staff';
export type AdminTab = 'analytics' | 'staff' | 'docs';

export interface StoredUser {
    id: string;
    email: string;
    role: UserRole;
    name: string;
}

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
}

export interface DocumentSource {
    title: string;
    category: string;
    content: string;
    file_path: string;
}

export interface ChatMessage {
    sender: 'bot' | 'user';
    text: string;
    isDefault?: boolean;
    sources?: DocumentSource[];
}

export interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    sender: 'bot';
    message: string;
    sources: DocumentSource[];
}

export interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active?: boolean;
    created_at?: string;
}

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

export interface AdminAnalytics {
    total_users: number;
    total_docs: number;
    total_storage_mb: number;
    status: Record<string, string>;
}

export interface AdminData {
    users: AdminUser[];
    docs: AdminDocument[];
}

export interface AccountForm {
    first_name: string;
    last_name: string;
    username: string;
    title: string;
    category: string;
}

export interface EditAccountForm {
    first_name: string;
    last_name: string;
    username: string;
    password: string;
    role: UserRole;
}

export interface GeneratedCredentials {
    email: string;
    password: string;
}

export interface ProfileFormData {
    full_name: string;
    password: string;
    confirmPassword: string;
}

export interface ApiErrorBody {
    detail?: string;
}
