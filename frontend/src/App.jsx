import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage'; // Make sure this is imported!

function App() {

    // --- GLOBAL THEME CONTROLLER ---
    useEffect(() => {
        // 1. Set up a "listener" that watches for changes to sessionStorage
        const handleStorageChange = () => {
            const currentTheme = sessionStorage.getItem('theme');
            if (currentTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        // 2. Run it once when the app first loads
        handleStorageChange();

        // 3. Listen for clicks on the Sun/Moon buttons from ANY page
        window.addEventListener('storage', handleStorageChange);

        // We create a custom event listener because sessionStorage changes in the same tab don't trigger normal 'storage' events
        window.addEventListener('themeChanged', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('themeChanged', handleStorageChange);
        };
    }, []);

    return (
        <Router>
            {/* The main wrapper of the app */}
            <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 transition-colors duration-500">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;