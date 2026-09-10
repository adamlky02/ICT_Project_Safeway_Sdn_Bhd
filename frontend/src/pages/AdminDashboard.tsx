import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { API_URL, authenticatedFetch, getStoredUser, readJson } from '../api/client';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { AccountsPanel } from '../components/admin/AccountsPanel';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { CredentialsModal, EditUserModal, RoleConfirmModal } from '../components/admin/AdminModals';
import { AdminNavigation } from '../components/admin/AdminNavigation';
import { AnalyticsPanel } from '../components/admin/AnalyticsPanel';
import { DocumentsPanel } from '../components/admin/DocumentsPanel';
import { AISettingsPanel } from '../components/admin/AISettingsPanel';
import { DeveloperModeModal } from '../components/admin/DeveloperModeModal';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type {
    AccountForm,
    AdminAnalytics,
    AdminData,
    AdminDocument,
    AdminTab,
    AdminUploadItem,
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
    const currentUser = getStoredUser();
    const isDeveloper = currentUser?.role === 'developer';
    const [tab, setTab] = useState<AdminTab>('analytics');
    const [data, setData] = useState<AdminData>({ users: [], docs: [] });
    const [analytics, setAnalytics] = useState<AdminAnalytics>(emptyAnalytics);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState<EditAccountForm>(emptyEditForm);
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<GeneratedCredentials>({ email: '', password: '' });
    const [uploadItems, setUploadItems] = useState<AdminUploadItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const uploadAbortController = useRef<AbortController | null>(null);
    const [form, setForm] = useState<AccountForm>(emptyAccountForm);
    const [developerToken, setDeveloperToken] = useState<string | null>(null);
    const [showDeveloperUnlock, setShowDeveloperUnlock] = useState(false);

    // Dashboard Data Loading (refreshes users, documents, and analytics with safe fallbacks)
    const loadData = async () => {
        setIsRefreshing(true);
        try {
            const usersResponse = await authenticatedFetch(`${API_URL}/api/admin/users`);
            const documentsResponse = await authenticatedFetch(`${API_URL}/api/admin/documents`);
            const analyticsResponse = await authenticatedFetch(`${API_URL}/api/admin/analytics`).catch(() => null);

            if ([usersResponse, documentsResponse, analyticsResponse].some((response) => response && [401, 403].includes(response.status))) {
                localStorage.removeItem('userData');
                navigate('/login', { state: { role: 'admin' } });
                return;
            }

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
        const user = getStoredUser();
        if (!user?.access_token || !['admin', 'developer'].includes(user.role)) {
            navigate('/login', { state: { role: 'admin' } });
            return;
        }
        void loadData();
    }, [navigate]);

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
            const response = await authenticatedFetch(`${API_URL}/api/admin/users`, {
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
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (developerToken) headers['X-Developer-Token'] = developerToken;
            const response = await authenticatedFetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers,
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
                return;
            }
            const responseError = await readJson<ApiErrorBody>(response).catch((): ApiErrorBody => ({}));
            if ([401, 403].includes(response.status) && (editingUser.role === 'developer' || editForm.role === 'developer')) {
                setDeveloperToken(null);
                setShowDeveloperUnlock(true);
            }
            alert(responseError.detail || 'Account update failed.');
        } catch {
            alert('Network error.');
        }
    };

    // Batch File Selection (adds supported files with editable filename-based titles)
    const handleFilesSelected = (files: File[]) => {
        const supportedFiles = files.filter((file) => /\.(pdf|txt)$/i.test(file.name));
        const unsupportedFiles = files.filter((file) => !/\.(pdf|txt)$/i.test(file.name));

        if (unsupportedFiles.length > 0) {
            alert(`${t.unsupported_files}: ${unsupportedFiles.map((file) => file.name).join(', ')}`);
        }

        setUploadItems((current) => {
            const retryableItems = current.filter((item) => item.status !== 'success');
            const existingFiles = new Set(retryableItems.map((item) => `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
            const newItems = supportedFiles
                .filter((file) => !existingFiles.has(`${file.name}:${file.size}:${file.lastModified}`))
                .map((file, index): AdminUploadItem => ({
                    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
                    file,
                    title: file.name.replace(/\.[^.]+$/, '') || file.name,
                    status: 'ready',
                }));

            return [...retryableItems, ...newItems];
        });
    };

    // Upload Item Title (updates the stored document title for one queued file)
    const handleUploadTitleChange = (id: string, title: string) => {
        setUploadItems((current) => current.map((item) => (item.id === id ? { ...item, title } : item)));
    };

    // Upload Queue Removal (removes one file before or after a batch run)
    const handleUploadItemRemove = (id: string) => {
        setUploadItems((current) => current.filter((item) => item.id !== id));
    };

    // Document Batch Upload (uploads every queued file concurrently and records individual results)
    const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isUploading) {
            return;
        }

        const queuedItems = uploadItems.filter((item) => item.status !== 'success');
        if (queuedItems.length === 0) {
            alert(t.select_files_first);
            return;
        }
        if (queuedItems.some((item) => !item.title.trim())) {
            alert(t.title_required);
            return;
        }

        const user = getStoredUser();
        if (!user) {
            alert('Session expired.');
            navigate('/');
            return;
        }

        const abortController = new AbortController();
        uploadAbortController.current = abortController;
        setIsUploading(true);
        const queuedIds = new Set(queuedItems.map((item) => item.id));
        setUploadItems((current) => current.map((item) => (
            queuedIds.has(item.id) ? { ...item, status: 'uploading', error: undefined } : item
        )));

        try {
            const uploadResults = await Promise.all(queuedItems.map(async (item) => {
                try {
                    const uploadData = new FormData();
                    uploadData.append('file', item.file);
                    uploadData.append('title', item.title.trim());
                    uploadData.append('category', form.category);
                    const response = await authenticatedFetch(`${API_URL}/api/admin/upload`, {
                        method: 'POST',
                        body: uploadData,
                        signal: abortController.signal,
                    });
                    if (!response.ok) {
                        const responseError = await readJson<ApiErrorBody>(response).catch((): ApiErrorBody => ({}));
                        throw new Error(responseError.detail || response.statusText || t.upload_failed);
                    }

                    setUploadItems((current) => current.map((currentItem) => (
                        currentItem.id === item.id ? { ...currentItem, status: 'success', error: undefined } : currentItem
                    )));
                    return true;
                } catch (error) {
                    const wasCancelled = abortController.signal.aborted
                        || (error instanceof DOMException && error.name === 'AbortError');
                    const message = error instanceof Error ? error.message : t.upload_failed;
                    setUploadItems((current) => current.map((currentItem) => (
                        currentItem.id === item.id
                            ? { ...currentItem, status: wasCancelled ? 'cancelled' : 'error', error: wasCancelled ? undefined : message }
                            : currentItem
                    )));
                    return false;
                }
            }));

            if (uploadResults.some(Boolean)) {
                void loadData();
            }
        } finally {
            if (uploadAbortController.current === abortController) {
                uploadAbortController.current = null;
            }
            setIsUploading(false);
        }
    };

    // Force Stop Uploads (aborts every active request and keeps interrupted files available for retry)
    const handleForceStopUpload = () => {
        uploadAbortController.current?.abort();
        setUploadItems((current) => current.map((item) => (
            item.status === 'uploading' ? { ...item, status: 'cancelled', error: undefined } : item
        )));
    };

    // Confirmed Deletion (removes a selected account or document and refreshes dashboard data)
    const deleteItem = async (type: 'users' | 'documents', id: string | number) => {
        if (!window.confirm('Delete this item?')) {
            return;
        }

        try {
            await authenticatedFetch(`${API_URL}/api/admin/${type}/${id}`, { method: 'DELETE' });
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

    // Developer Role Toggle Request (allows an unlocked developer to grant or remove developer access)
    const handleDeveloperRoleToggle = (checked: boolean) => {
        if (!developerToken) {
            setShowDeveloperUnlock(true);
            return;
        }
        const nextRole: UserRole = checked ? 'developer' : 'admin';
        if (nextRole === editForm.role) return;
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
    const developerUsers = sortedUsers.filter((user) => user.role === 'developer');
    const staffUsers = sortedUsers.filter((user) => user.role === 'staff');

    // Dashboard Tab Change (clears a settled upload queue only when returning to Documents)
    const handleTabChange = (nextTab: AdminTab) => {
        if (nextTab === 'ai' && (!isDeveloper || !developerToken)) {
            if (isDeveloper) setShowDeveloperUnlock(true);
            return;
        }
        const isReturningToDocuments = tab !== 'docs' && nextTab === 'docs';
        const isUploadQueueSettled = uploadItems.length > 0 && uploadItems.every((item) => (
            item.status === 'success' || item.status === 'error' || item.status === 'cancelled'
        ));

        if (isReturningToDocuments && isUploadQueueSettled) {
            setUploadItems([]);
        }
        setTab(nextTab);
    };

    // Developer Mode Entry (opens password verification or returns to the protected AI panel)
    const handleDeveloperModeRequest = () => {
        if (!isDeveloper) return;
        if (developerToken) {
            setTab('ai');
            return;
        }
        setShowDeveloperUnlock(true);
    };

    // Developer Mode Expiration (removes the sensitive token and asks for a fresh password)
    const handleDeveloperModeExpired = () => {
        setDeveloperToken(null);
        setTab('analytics');
        setShowDeveloperUnlock(true);
    };

    // Ambient Motion (moves Safeway-colored light fields as the active workspace changes)
    const ambientMotion: Record<AdminTab, { primary: { x: string; y: string; scale: number }; secondary: { x: string; y: string; scale: number } }> = {
        analytics: { primary: { x: '-8%', y: '-6%', scale: 1 }, secondary: { x: '8%', y: '4%', scale: 1 } },
        staff: { primary: { x: '18%', y: '8%', scale: 1.16 }, secondary: { x: '-18%', y: '-8%', scale: 0.9 } },
        docs: { primary: { x: '4%', y: '28%', scale: 0.92 }, secondary: { x: '-6%', y: '-24%', scale: 1.18 } },
        ai: { primary: { x: '24%', y: '-2%', scale: 1.22 }, secondary: { x: '-24%', y: '18%', scale: 1.1 } },
    };

    return (
        <div className="fixed inset-0 flex h-[100dvh] min-h-[100svh] w-full min-w-0 overflow-hidden bg-[#f4f2ed] font-sans transition-colors duration-500 dark:bg-[#07080a]">
            {/* Dashboard Background (adds restrained visual depth behind management panels) */}
            <EngineeringBackground />
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <m.div
                    className="absolute -left-[18rem] -top-[20rem] h-[48rem] w-[48rem] rounded-full bg-amber-400/20 blur-[130px] dark:bg-amber-500/12"
                    animate={ambientMotion[tab].primary}
                    transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
                />
                <m.div
                    className="absolute -bottom-[22rem] -right-[18rem] h-[52rem] w-[52rem] rounded-full bg-orange-500/18 blur-[150px] dark:bg-orange-600/10"
                    animate={ambientMotion[tab].secondary}
                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="admin-stage-vignette absolute inset-0" />
            </div>
            {/* Responsive Navigation (switches panels and provides language, theme, and logout actions) */}
            <AdminNavigation
                tab={tab}
                lang={lang}
                t={t}
                isDarkMode={isDarkMode}
                isDeveloper={isDeveloper}
                developerModeUnlocked={Boolean(developerToken)}
                onTabChange={handleTabChange}
                onLanguageToggle={toggleLanguage}
                onThemeToggle={toggleTheme}
                onLogout={handleLogout}
                onDeveloperModeRequest={handleDeveloperModeRequest}
            />

            {/* Active Dashboard Panel (renders the heading and currently selected management view) */}
            <main className="relative z-10 w-full min-w-0 flex-1 overflow-y-auto px-3 pb-[max(6.5rem,env(safe-area-inset-bottom))] pt-24 transition-colors duration-300 custom-scrollbar sm:px-5 lg:px-8 lg:pb-12 lg:pt-28 xl:px-10">
                <m.div
                    className="mx-auto min-w-0 max-w-[86rem]"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                    <AdminPageHeader tab={tab} t={t} onOpenChat={() => navigate('/chat')} onOpenProfile={() => navigate('/profile')} />

                    {/* Tab Content (animates between analytics, account, and document panels) */}
                    <AnimatePresence mode="wait" initial={false}>
                        <m.div
                            key={tab}
                            className="admin-panel-enter"
                            initial={{ opacity: 0, y: 34, scale: 0.985, filter: 'blur(12px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -18, scale: 0.99, filter: 'blur(9px)' }}
                            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
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
                                    developerUsers={developerUsers}
                                    adminUsers={adminUsers}
                                    staffUsers={staffUsers}
                                    viewerRole={currentUser?.role || 'admin'}
                                    currentUserId={currentUser?.id || ''}
                                    developerModeUnlocked={Boolean(developerToken)}
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
                                    uploadItems={uploadItems}
                                    isUploading={isUploading}
                                    t={t}
                                    onFormChange={setForm}
                                    onFilesSelected={handleFilesSelected}
                                    onUploadTitleChange={handleUploadTitleChange}
                                    onUploadItemRemove={handleUploadItemRemove}
                                    onUpload={(event) => void handleFileUpload(event)}
                                    onForceStopUpload={handleForceStopUpload}
                                    onDeleteDocument={(id) => void deleteItem('documents', id)}
                                />
                            )}
                            {tab === 'ai' && (
                                developerToken
                                    ? <AISettingsPanel t={t} developerToken={developerToken} onProviderActivated={() => void loadData()} onDeveloperModeExpired={handleDeveloperModeExpired} />
                                    : null
                            )}
                        </m.div>
                    </AnimatePresence>
                </m.div>
            </main>

            {/* Account Edit Dialog (updates the selected user's identity and permissions) */}
            <AnimatePresence>
                {editingUser && (
                    <EditUserModal
                        user={editingUser}
                        form={editForm}
                        t={t}
                        onFormChange={setEditForm}
                        onRoleToggle={handleRoleToggle}
                        onDeveloperRoleToggle={handleDeveloperRoleToggle}
                        viewerRole={currentUser?.role || 'admin'}
                        developerModeUnlocked={Boolean(developerToken)}
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
            {/* Developer Unlock Dialog (keeps sensitive controls behind recent password verification) */}
            <AnimatePresence>
                {showDeveloperUnlock && isDeveloper && (
                    <DeveloperModeModal
                        t={t}
                        onClose={() => setShowDeveloperUnlock(false)}
                        onUnlocked={(token) => {
                            setDeveloperToken(token);
                            setShowDeveloperUnlock(false);
                            setTab('ai');
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
