import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft, Loader2 } from 'lucide-react'; // Added Loader2 for the spinner

const LoginPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const role = state?.role || 'staff';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // --- NEW: Loading State ---
    const [isLoading, setIsLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true); // Trigger the loading popup

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("userData", JSON.stringify(data));

                if (data.role === 'admin') navigate('/admin');
                else navigate('/chat');
            } else {
                setError(data.detail || "Login failed");
                setIsLoading(false); // Stop loading if error
            }
        } catch (err) {
            setError("Network error: Could not reach the server. Please try again.");
            setIsLoading(false); // Stop loading if error
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative">

            {/* --- NEW: LOADING POP-UP OVERLAY --- */}
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform transition-all">
                        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Authenticating...</h3>
                        <p className="text-sm text-slate-500">
                            Connecting to Safeway secure servers.
                            <br/><br/>
                            <span className="italic text-xs">
                (Note: If the cloud server is waking up, this may take up to 50 seconds.)
              </span>
                        </p>
                    </div>
                </div>
            )}

            {/* Login Card */}
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md z-10">
                <button
                    onClick={() => navigate('/')}
                    disabled={isLoading}
                    className="flex items-center text-gray-500 mb-6 hover:text-blue-600 disabled:opacity-50"
                >
                    <ArrowLeft size={18} className="mr-2" /> Back
                </button>

                <h2 className="text-2xl font-bold mb-2 capitalize text-slate-800">{role} Portal Login</h2>
                <p className="text-gray-500 mb-6 italic text-sm">
                    Try: {role}@safeway.com / {role === 'staff' ? 'staff123' : 'admin123'}
                </p>

                {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-slate-700">Email Address</label>
                        <input
                            type="email"
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-slate-700">Password</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-blue-400"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                        {isLoading ? 'Connecting...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;