import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit3, LogOut, UserCircle2, Sun, Moon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ProfilePage = () => {
    const navigate = useNavigate();
    const[profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState({ full_name: '', password: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');

    // --- DARK MODE LOGIC ---
    // CORRECT (Always forces Light Mode on initial load, but respects it if navigating between pages in the same session)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // If they just landed on the site, sessionStorage will be empty, force light mode.
        // We use sessionStorage instead of localStorage so it resets when the tab closes!
        const sessionTheme = sessionStorage.getItem('theme');
        return sessionTheme === 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            sessionStorage.setItem('theme', 'dark'); // Save to session, not local
        } else {
            root.classList.remove('dark');
            sessionStorage.setItem('theme', 'light'); // Save to session, not local
        }
    }, [isDarkMode]);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const userDataStr = localStorage.getItem('userData');
                if (!userDataStr) {
                    navigate('/login');
                    return;
                }

                const userData = JSON.parse(userDataStr);
                const response = await fetch(`${API_URL}/api/profile/${userData.id}`);

                if (!response.ok) {
                    throw new Error('Failed to load profile');
                }

                const data = await response.json();
                setProfile(data);
                setForm({ full_name: data.full_name || '', password: '', confirmPassword: '' });
            } catch (err) {
                setError('Unable to load profile. Please log in again.');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setSaving(true);
        setMessage('');
        setError('');

        // Validate passwords match if password is being changed
        if (form.password && form.password !== form.confirmPassword) {
            setPasswordError('Passwords do not match');
            setSaving(false);
            return;
        }

        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const response = await fetch(`${API_URL}/api/profile/${userData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: form.full_name,
                    password: form.password || null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update profile');
            }

            const updated = { ...profile, full_name: data.full_name };
            setProfile(updated);
            localStorage.setItem('userData', JSON.stringify({ ...userData, name: data.full_name }));
            setForm({ full_name: data.full_name, password: '', confirmPassword: '' });
            setEditing(false);
            setMessage('Profile updated successfully.');
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 transition-colors duration-300">
                Loading profile...
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full text-center transition-colors duration-300">
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                        Back to home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300 font-sans">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                        <ArrowLeft size={18} /> <span className="hidden md:inline">Back</span>
                    </button>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold">
                        <UserCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
                        My Profile
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDarkMode ? <Sun size={20} className="text-amber-400"/> : <Moon size={20}/>}
                        </button>

                        <button onClick={handleLogout} className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
                            <LogOut size={18} /> <span className="hidden md:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Account Details</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Email is read-only. Name and password can be changed.</p>
                    </div>

                    <form onSubmit={handleSave} className="p-6 space-y-6">
                        {message && (
                            <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-green-700 dark:text-green-400 transition-colors">
                                {message}
                            </div>
                        )}
                        {error && (
                            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-red-700 dark:text-red-400 transition-colors">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Email</label>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-slate-700 dark:text-slate-300 transition-colors">
                                {profile?.email}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Name</label>
                            {editing ? (
                                <input
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    placeholder="Your name"
                                    required
                                />
                            ) : (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-slate-700 dark:text-slate-300 transition-colors">
                                    {profile?.full_name}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Password</label>
                            {editing ? (
                                <>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => {
                                            setForm({ ...form, password: e.target.value });
                                            setPasswordError('');
                                        }}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-3 transition-colors"
                                        placeholder="Enter new password"
                                    />
                                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={(e) => {
                                            setForm({ ...form, confirmPassword: e.target.value });
                                            setPasswordError('');
                                        }}
                                        className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors ${
                                            passwordError
                                                ? 'border-red-300 dark:border-red-500 focus:ring-red-500'
                                                : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
                                        }`}
                                        placeholder="Confirm new password"
                                    />
                                    {passwordError && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{passwordError}</p>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 tracking-[0.3em] text-slate-700 dark:text-slate-300 transition-colors">
                                    *****
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            {editing ? (
                                <>
                                    <button
                                        type="submit"
                                        disabled={saving || (form.password && form.password !== form.confirmPassword)}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Check size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(false);
                                            setForm({ full_name: profile.full_name || '', password: '', confirmPassword: '' });
                                            setError('');
                                            setPasswordError('');
                                        }}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setEditing(true);
                                    }}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-3 font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <Edit3 size={18} /> Edit Profile
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;