import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getStoredUser, readJson, storeUser } from '../api/client';
import { ProfileForm } from '../components/profile/ProfileForm';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { useTheme } from '../hooks/useTheme';
import type { ApiErrorBody, ProfileFormData, UserProfile } from '../types';

// Empty Profile Form (provides safe initial values for editable account fields)
const emptyProfileForm: ProfileFormData = { full_name: '', password: '', confirmPassword: '' };

// Profile Page (loads and updates the signed-in user's account details)
const ProfilePage = () => {
    // Profile State (tracks account data, form mode, validation, and request progress)
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState<ProfileFormData>(emptyProfileForm);
    const [passwordError, setPasswordError] = useState('');

    // Profile Loading (restores the session and fetches the current account details)
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const user = getStoredUser();
                if (!user) {
                    navigate('/login');
                    return;
                }

                const response = await fetch(`${API_URL}/api/profile/${user.id}`);
                if (!response.ok) {
                    throw new Error('Failed to load profile');
                }

                const profileData = await readJson<UserProfile>(response);
                setProfile(profileData);
                setForm({ full_name: profileData.full_name || '', password: '', confirmPassword: '' });
            } catch {
                setError('Unable to load profile. Please log in again.');
            } finally {
                setLoading(false);
            }
        };

        void loadProfile();
    }, [navigate]);

    // Profile Logout (clears the browser session and returns to the landing page)
    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Profile Save (validates passwords, updates the API, and synchronizes stored identity)
    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordError('');
        setSaving(true);
        setMessage('');
        setError('');

        if (form.password && form.password !== form.confirmPassword) {
            setPasswordError('Passwords do not match');
            setSaving(false);
            return;
        }

        try {
            const user = getStoredUser();
            if (!user) {
                throw new Error('Session expired');
            }

            const response = await fetch(`${API_URL}/api/profile/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: form.full_name, password: form.password || null }),
            });
            const data = await readJson<UserProfile & ApiErrorBody>(response);
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update profile');
            }

            setProfile(data);
            storeUser({ ...user, name: data.full_name });
            setForm({ full_name: data.full_name, password: '', confirmPassword: '' });
            setEditing(false);
            setMessage('Profile updated successfully.');
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // Loading View (holds the page while profile data is being requested)
    if (loading) {
        return <div className="min-h-[100svh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-center text-slate-600 dark:text-slate-400 transition-colors duration-300">Loading profile...</div>;
    }

    // Fatal Error View (offers recovery when no profile could be loaded)
    if (error && !profile) {
        return (
            <div className="min-h-[100svh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full text-center transition-colors duration-300">
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition" type="button">Back to home</button>
                </div>
            </div>
        );
    }

    // Missing Profile Guard (prevents the form from rendering without account data)
    if (!profile) {
        return null;
    }

    return (
        <div className="min-h-[100svh] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300 font-sans">
            {/* Profile Navigation (provides back, theme, and logout controls) */}
            <ProfileHeader
                isDarkMode={isDarkMode}
                onBack={() => navigate(-1)}
                onThemeToggle={toggleTheme}
                onLogout={handleLogout}
            />
            {/* Profile Editor (displays and updates the current account fields) */}
            <main className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-5 sm:py-8 md:py-10 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <ProfileForm
                    profile={profile}
                    form={form}
                    editing={editing}
                    saving={saving}
                    message={message}
                    error={error}
                    passwordError={passwordError}
                    onSubmit={(event) => void handleSave(event)}
                    onFormChange={setForm}
                    onEdit={() => setEditing(true)}
                    onCancel={() => {
                        setEditing(false);
                        setForm({ full_name: profile.full_name || '', password: '', confirmPassword: '' });
                        setError('');
                        setPasswordError('');
                    }}
                    onClearPasswordError={() => setPasswordError('')}
                />
            </main>
        </div>
    );
};

export default ProfilePage;
