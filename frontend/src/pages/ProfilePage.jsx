import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit3, LogOut, UserCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState({ full_name: '', password: '' });

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
                setForm({ full_name: data.full_name || '', password: '' });
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
        setSaving(true);
        setMessage('');
        setError('');

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
            setForm({ full_name: data.full_name, password: '' });
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
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
                Loading profile...
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 max-w-md w-full text-center">
                    <p className="text-red-600 font-medium">{error}</p>
                    <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white">
                        Back to home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition">
                        <ArrowLeft size={18} /> Back
                    </button>
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <UserCircle2 size={20} className="text-blue-600" />
                        My Profile
                    </div>
                    <button onClick={handleLogout} className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 transition">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-10">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                        <h1 className="text-2xl font-bold text-slate-800">Account Details</h1>
                        <p className="text-sm text-slate-500 mt-1">Email is read-only. Name and password can be changed.</p>
                    </div>

                    <form onSubmit={handleSave} className="p-6 space-y-6">
                        {message && (
                            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                                {message}
                            </div>
                        )}
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">Email</label>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                                {profile?.email}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">Name</label>
                            {editing ? (
                                <input
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your name"
                                    required
                                />
                            ) : (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                                    {profile?.full_name}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">Password</label>
                            {editing ? (
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter new password"
                                />
                            ) : (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 tracking-[0.3em] text-slate-700">
                                    *****
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            {editing ? (
                                <>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                                    >
                                        <Check size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(false);
                                            setForm({ full_name: profile.full_name || '', password: '' });
                                            setError('');
                                        }}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
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
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
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