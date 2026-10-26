// Login identities, portal roles, and MFA contracts.
export type UserRole = 'admin' | 'developer' | 'staff';

export type PortalRole = 'admin' | 'staff';

// Stored User (describes the authenticated account cached in the browser)
export interface StoredUser {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    access_token: string;
}

// Developer Unlock Response (returns a short-lived token after password confirmation)
export interface DeveloperUnlockResponse {
    developer_token: string;
    expires_in: number;
}

// Authenticator Contracts (restricted challenges and one-time recovery codes remain in memory only).
export interface MfaResetRequest {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    reason: string;
    created_at: number;
    reviewed_at?: number | null;
    review_note?: string | null;
}

export interface MfaStatus {
    enabled: boolean;
    requires_enrollment: boolean;
    enrolled_at?: number | null;
    reset_request: MfaResetRequest | null;
    role?: UserRole;
}

export interface MfaChallenge {
    mfa_required: true;
    setup_required: boolean;
    challenge_token?: string;
    setup_token?: string;
    secret?: string;
    otpauth_uri?: string;
    expires_in: number;
    reset_request?: MfaResetRequest | null;
}

export interface MfaLoginResult extends StoredUser {
    recovery_codes?: string[];
}

export interface AuthenticatorAccount extends MfaStatus {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
}
