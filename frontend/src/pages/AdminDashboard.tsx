import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getStoredUser, readJson } from '../api/client';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { AccountsPanel } from '../components/admin/AccountsPanel';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { CredentialsModal, EditUserModal, RoleConfirmModal } from '../components/admin/AdminModals';
import { AdminNavigation } from '../components/admin/AdminNavigation';
import { AnalyticsPanel } from '../components/admin/AnalyticsPanel';
import { DocumentsPanel } from '../components/admin/DocumentsPanel';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type {
    AccountForm,
    AdminAnalytics,
    AdminData,
    AdminDocument,
    AdminTab,
    AdminUser,
    ApiErrorBody,
    EditAccountForm,
    GeneratedCredentials,
    UserRole,
} from '../types';

// Empty Account Form (provides safe defaults for account creation and document metadata)
const emptyAccountForm: AccountForm = {
    first_name: '',
    last_name: '',
    username: '',
    title: '',
    category: 'HR',
};

// Empty Edit Form (provides safe defaults before an account is selected)
const emptyEditForm: EditAccountForm = {
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    role: 'staff',
};

// Empty Analytics (keeps metric components stable before API data arrives)
const emptyAnalytics: AdminAnalytics = {
    total_users: 0,
    total_docs: 0,
    total_storage_mb: 0,
    status: {},
};

// Admin Dashboard (coordinates analytics, account management, and document indexing)
const AdminDashboard = () => {
    // Dashboard State (tracks navigation, remote data, forms, dialogs, display settings, and time)
    const navigate = useNavigate();
    const { lang, t, toggleLanguage } = useLanguage();
    const { isDarkMode, toggleTheme } = useTheme({ storage: 'local' });
    const [tab, setTab] = useState<AdminTab>('analytics');
    const [data, setData] = useState<AdminData>({ users: [], docs: [] });
    const [analytics, setAnalytics] = useState<AdminAnalytics>(emptyAnalytics);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isHovered, setIsHovered] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState<EditAccountForm>(emptyEditForm);
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<GeneratedCredentials>({ email: '', password: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [form, setForm] = useState<AccountForm>(emptyAccountForm);

    // Dashboard Data Loading (refreshes users, documents, and analytics with safe fallbacks)
    const loadData = async () => {
        setIsRefreshing(true);
        try {
            const usersResponse = await fetch(`${API_URL}/api/admin/users`);
            const documentsResponse = await fetch(`${API_URL}/api/admin/documents`);
            const analyticsResponse = await fetch(`${API_URL}/api/admin/analytics`).catch(() => null);

            const users = usersResponse.ok ? await readJson<AdminUser[]>(usersResponse) : [];
            const documents = documentsResponse.ok ? await readJson<AdminDocument[]>(documentsResponse) : [];
            const safeUsers = Array.isArray(users) ? users : [];
            const safeDocuments = Array.isArray(documents) ? documents : [];
            const analyticsData = analyticsResponse?.ok
                ? await readJson<AdminAnalytics>(analyticsResponse)
                : { total_users: safeUsers.length, total_docs: safeDocuments.length, total_storage_mb: 0, status: {} };

            setData({ users: safeUsers, docs: safeDocuments });
            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Data load error:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Live Clock (updates the diagnostics timestamp once per second)
    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    // Initial Data Load (populates all dashboard panels when the page mounts)
    useEffect(() => {
        void loadData();
    }, []);

    // Diagnostics Timestamp (formats the live date and time displayed by analytics)
    const formattedDate = currentTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    // Account Creation (submits staff details and opens the generated credentials dialog)
    const handleAddUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fullName = `${form.first_name} ${form.last_name}`.trim();

        try {
            const response = await fetch(`${API_URL}/api/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: form.username, full_name: fullName }),
            });

            if (response.ok) {
                const credentials = await readJson<GeneratedCredentials>(response);
                setForm((current) => ({ ...current, username: '', first_name: '', last_name: '' }));
                void loadData();
                setGeneratedPassword(credentials);
                setShowPasswordModal(true);
            }
        } catch {
            alert('Network error.');
        }
    };

    // Account Edit Setup (converts a selected user record into editable form fields)
    const openEditUser = (user: AdminUser) => {
        const username = user.email.endsWith('@gmail.com') ? user.email.replace('@s.com', '') : user.email || '';
        const names = (user.full_name || '').split(' ');
        setEditingUser(user);
        setEditForm({
            first_name: names[0] || '',
            last_name: names.slice(1).join(' ') || '',
            username,
            password: '',
            role: user.role || 'staff',
        });
    };

    // Account Update (submits edited identity, password, and role information)
    const handleEditUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingUser) {
            return;
        }

        const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
        try {
            const response = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    username: editForm.username,
                    password: editForm.password,
                    role: editForm.role,
                }),
            });

            if (response.ok) {
                setEditingUser(null);
                void loadData();
                alert(t.acc_ready || 'Account updated!');
            }
        } catch {
            alert('Network error.');
        }
    };

    // Document Upload (validates the session and sends file metadata for indexing)
    const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedFile) {
            alert('Select a file!');
            return;
        }

        const user = getStoredUser();
        if (!user) {
            alert('Session expired.');
            navigate('/');
            return;
        }

        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('title', form.title);
        uploadData.append('category', form.category);
        uploadData.append('admin_id', user.id);

        try {
            const response = await fetch(`${API_URL}/api/admin/upload`, { method: 'POST', body: uploadData });
            if (response.ok) {
                setForm((current) => ({ ...current, title: '' }));
                setSelectedFile(null);
                const fileInput = document.getElementById('file-upload') as HTMLInputElement | null;
                if (fileInput) {
                    fileInput.value = '';
                }
                void loadData();
                alert('Uploaded!');
            } else {
                const responseError = await readJson<ApiErrorBody>(response);
                alert(`Upload failed: ${responseError.detail}`);
            }
        } catch {
            alert('Server error.');
        }
    };

    // Confirmed Deletion (removes a selected account or document and refreshes dashboard data)
    const deleteItem = async (type: 'users' | 'documents', id: string | number) => {
        if (!window.confirm('Delete this item?')) {
            return;
        }

        try {
            await fetch(`${API_URL}/api/admin/${type}/${id}`, { method: 'DELETE' });
            void loadData();
        } catch {
            alert('Delete failed.');
        }
    };

    // Admin Logout (clears the browser session and returns to the landing page)
    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Role Toggle Request (stages a privilege change for explicit confirmation)
    const handleRoleToggle = (checked: boolean) => {
        const nextRole: UserRole = checked ? 'admin' : 'staff';
        if (nextRole === editForm.role) {
            return;
        }
        setPendingRole(nextRole);
        setShowPromoteConfirm(true);
    };

    // Role Change Confirmation (applies or discards the staged access level)
    const handlePromoteChoice = (confirmChange: boolean) => {
        if (confirmChange && pendingRole) {
            setEditForm((current) => ({ ...current, role: pendingRole }));
        }
        setShowPromoteConfirm(false);
        setPendingRole(null);
    };

    // Account Directory Views (filters, sorts, and separates users by access role)
    const filteredUsers = data.users.filter((user) => (
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        || user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ));
    const sortedUsers = [...filteredUsers].sort((first, second) => (first.full_name || '').localeCompare(second.full_name || ''));
    const adminUsers = sortedUsers.filter((user) => user.role === 'admin');
    const staffUsers = sortedUsers.filter((user) => user.role === 'staff');

    return (
        <div className="flex fixed inset-0 w-full h-[100dvh] bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-500 overflow-hidden font-sans">
            {/* Dashboard Background (adds restrained visual depth behind management panels) */}
            <EngineeringBackground />
            {/* Responsive Navigation (switches panels and provides language, theme, and logout actions) */}
            <AdminNavigation
                tab={tab}
                lang={lang}
                t={t}
                isDarkMode={isDarkMode}
                isHovered={isHovered}
                onTabChange={setTab}
                onLanguageToggle={toggleLanguage}
                onThemeToggle={toggleTheme}
                onLogout={handleLogout}
                onHoverChange={setIsHovered}
            />

            {/* Active Dashboard Panel (renders the heading and currently selected management view) */}
            <div className="flex-1 p-4 pt-24 pb-24 md:p-10 overflow-y-auto w-full transition-colors duration-300 relative z-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    <AdminPageHeader tab={tab} t={t} onOpenChat={() => navigate('/chat')} onOpenProfile={() => navigate('/profile')} />

                    {/* Tab Content (animates between analytics, account, and document panels) */}
                    <AnimatePresence mode="wait" initial={false}>
                        <m.div
                            key={tab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.24 }}
                        >
                            {tab === 'analytics' && (
                                <AnalyticsPanel
                                    analytics={analytics}
                                    usersCount={data.users.length}
                                    documentsCount={data.docs.length}
                                    formattedDate={formattedDate}
                                    formattedTime={formattedTime}
                                    isRefreshing={isRefreshing}
                                    t={t}
                                    onRefresh={() => void loadData()}
                                />
                            )}
                            {tab === 'staff' && (
                                <AccountsPanel
                                    form={form}
                                    searchTerm={searchTerm}
                                    adminUsers={adminUsers}
                                    staffUsers={staffUsers}
                                    t={t}
                                    onFormChange={setForm}
                                    onSearchChange={setSearchTerm}
                                    onAddUser={(event) => void handleAddUser(event)}
                                    onEditUser={openEditUser}
                                    onDeleteUser={(id) => void deleteItem('users', id)}
                                />
                            )}
                            {tab === 'docs' && (
                                <DocumentsPanel
                                    documents={data.docs}
                                    form={form}
                                    selectedFile={selectedFile}
                                    t={t}
                                    onFormChange={setForm}
                                    onFileChange={setSelectedFile}
                                    onUpload={(event) => void handleFileUpload(event)}
                                    onDeleteDocument={(id) => void deleteItem('documents', id)}
                                />
                            )}
                        </m.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Account Edit Dialog (updates the selected user's identity and permissions) */}
            <AnimatePresence>
                {editingUser && (
                    <EditUserModal
                        user={editingUser}
                        form={editForm}
                        t={t}
                        onFormChange={setEditForm}
                        onRoleToggle={handleRoleToggle}
                        onClose={() => setEditingUser(null)}
                        onSubmit={(event) => void handleEditUser(event)}
                    />
                )}
            </AnimatePresence>
            {/* Generated Credentials Dialog (reveals the temporary login for a new account) */}
            <AnimatePresence>
                {showPasswordModal && (
                    <CredentialsModal credentials={generatedPassword} t={t} onClose={() => setShowPasswordModal(false)} />
                )}
            </AnimatePresence>
            {/* Role Confirmation Dialog (guards administrator privilege changes) */}
            <AnimatePresence>
                {showPromoteConfirm && (
                    <RoleConfirmModal pendingRole={pendingRole} t={t} onChoice={handlePromoteChoice} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
