import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { LoadingState } from './components/feedback/LoadingState';
import { AsyncBoundary } from './components/feedback/AsyncBoundary';
import { useLanguage } from './hooks/useLanguage';
const LoginPage = lazy(() => import('./login/LoginPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Session Revocation Navigation (any protected API can send an expired/reset session back through password verification).
function SessionEvents() {
    const navigate = useNavigate();
    useEffect(() => {
        const expired = (event: Event) => navigate('/login', { replace: true, state: { role: (event as CustomEvent<{ role?: string }>).detail?.role || 'staff' } });
        window.addEventListener('safeway-session-expired', expired);
        return () => window.removeEventListener('safeway-session-expired', expired);
    }, [navigate]);
    return null;
}

function RouteContent({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const { t } = useLanguage();
    return <AsyncBoundary key={location.pathname} t={t}>
        <Suspense fallback={<div className="app-canvas min-h-[100svh] p-6 pt-28"><div className="mx-auto max-w-3xl"><LoadingState label={t.loading} /></div></div>}>
            {children}
        </Suspense>
    </AsyncBoundary>;
}

// Application Shell (synchronizes the global theme and maps URLs to pages)
function App() {
    // Global Theme Sync (applies stored theme changes from this tab or another browser context)
    useEffect(() => {
        const handleStorageChange = () => {
            const currentTheme = sessionStorage.getItem('theme');
            if (currentTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        handleStorageChange();

        window.addEventListener('storage', handleStorageChange);

        // Same-tab Theme Event (covers session storage changes that do not emit a native storage event)
        window.addEventListener('themeChanged', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('themeChanged', handleStorageChange);
        };
    }, []);

    return (
        <Router>
            <SessionEvents />
            {/* Application Routes (renders the requested page inside the global color shell) */}
            <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 transition-colors duration-500">
                <RouteContent><Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes></RouteContent>
            </div>
        </Router>
    );
}

export default App;
