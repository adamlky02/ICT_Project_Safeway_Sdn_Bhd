import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft } from 'lucide-react';

const LoginPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const role = state?.role || 'staff'; // Fallback to staff

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');


    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Change the fetch URL to use the API_URL variable
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
            }
        } catch (err) {
            setError("Network error: Check if backend is running.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <button onClick={() => navigate('/')} className="flex items-center text-gray-500 mb-6 hover:text-blue-600">
                    <ArrowLeft size={18} className="mr-2" /> Back
                </button>

                <h2 className="text-2xl font-bold mb-2 capitalize">{role} Portal Login</h2>
                <p className="text-gray-500 mb-6 italic text-sm">
                    Try: {role}@safeway.com / {role}123
                </p>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                        <LogIn size={18} /> Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;