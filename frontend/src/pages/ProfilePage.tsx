import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getStoredUser, readJson, storeUser } from '../api/client';
import { ProfileForm } from '../components/profile/ProfileForm';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { useTheme } from '../hooks/useTheme';
import type { ApiErrorBody, ProfileFormData, UserProfile } from '../types';

const emptyProfileForm: ProfileFormData = { full_name: '', password: '', confirmPassword: '' };

const ProfilePage = () => {
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

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 transition-colors duration-300">Loading profile...</div>;
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full text-center transition-colors duration-300">
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition" type="button">Back to home</button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300 font-sans">
            <ProfileHeader
                isDarkMode={isDarkMode}
                onBack={() => navigate(-1)}
                onThemeToggle={toggleTheme}
                onLogout={handleLogout}
            />
            <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10">
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
