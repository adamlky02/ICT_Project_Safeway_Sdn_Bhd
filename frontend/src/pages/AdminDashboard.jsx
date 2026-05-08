import React, { useState, useEffect } from 'react';
import { UserPlus, FilePlus, Trash2, Users, FileText, LogOut, Upload, File, Pencil, UserCircle2, Database, Cloud, RefreshCcw, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const createDefaultIntegrationForms = () => ({
    database: {
        mode: 'default',
        provider: 'postgresql',
        connection_string: '',
        database_name: ''
    },
    cloudstorage: {
        mode: 'default',
        provider: 'local',
        endpoint: '',
        bucket_name: '',
        access_key: '',
        secret_key: ''
    }
});

const INTEGRATION_FIELDS = {
    database:[
        { key: 'provider', label: 'Provider', placeholder: 'postgresql' },
        { key: 'connection_string', label: 'Connection String', placeholder: 'postgresql://user:pass@host/db' },
        { key: 'database_name', label: 'Database Name', placeholder: 'chatbot_db' }
    ],

    cloudstorage:[
        { key: 'provider', label: 'Provider', placeholder: 'local' },
        { key: 'endpoint', label: 'Endpoint', placeholder: 'https://storage.example.com' },
        { key: 'bucket_name', label: 'Bucket Name', placeholder: 'company-docs' },
        { key: 'access_key', label: 'Access Key', placeholder: 'ACCESS_KEY' },
        { key: 'secret_key', label: 'Secret Key', placeholder: 'SECRET_KEY' }
    ]
};

const INTEGRATION_META = {
    database: { title: 'Database Model', icon: Database, accent: 'blue' },
    cloudstorage: { title: 'Cloud Storage Model', icon: Cloud, accent: 'emerald' }
};

const INTEGRATION_ACCENT_CLASSES = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('staff');
    const [data, setData] = useState({ users: [], docs: [] });
    const [integrationForms, setIntegrationForms] = useState(createDefaultIntegrationForms());
    const [integrationSaving, setIntegrationSaving] = useState({});

    // --- UI States ---
    const [isHovered, setIsHovered] = useState(false); // Controls desktop sidebar expand/collapse
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    // Edit User States
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: '', username: '', password: '', role: 'staff' });
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
    const [pendingRole, setPendingRole] = useState(null);

    // Generated Password Modal States
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const[generatedPassword, setGeneratedPassword] = useState({ email: '', password: '' });

    // State for file upload
    const[selectedFile, setSelectedFile] = useState(null);
    const [form, setForm] = useState({
        username: '',
        full_name: '',
        title: '',
        category: 'HR'
    });

    // --- REAL DARK MODE TOGGLE LOGIC ---
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => { loadData(); }, []);
    useEffect(() => { loadIntegrations(); },[]);

    const loadData = async () => {
        try {
            const uRes = await fetch(`${API_URL}/api/admin/users`);
            const dRes = await fetch(`${API_URL}/api/admin/documents`);

            const u = uRes.ok ? await uRes.json() :[];
            const d = dRes.ok ? await dRes.json() : [];

            setData({
                users: Array.isArray(u) ? u :[],
                docs: Array.isArray(d) ? d :[]
            });
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    };

    const loadIntegrations = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/integrations`);
            if (!response.ok) return;

            const payload = await response.json();
            const nextForms = createDefaultIntegrationForms();

            Object.entries(payload || {}).forEach(([category, setting]) => {
                if (!nextForms[category] || !setting) return;

                nextForms[category] = {
                    ...nextForms[category],
                    mode: setting.mode || 'default',
                    provider: setting.provider || nextForms[category].provider,
                    ...(setting.config || {})
                };
            });

            setIntegrationForms(nextForms);
        } catch (error) {
            console.error('Error loading integration settings:', error);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    username: form.username,
                    password: form.password,
                    full_name: form.full_name
                })
            });
            if (res.ok) {
                const data = await res.json();
                setForm({...form, username: '', password: '', full_name: ''});
                loadData();
                setGeneratedPassword({ email: data.email, password: data.password });
                setShowPasswordModal(true);
            } else {
                const err = await res.json();
                alert(`Failed to add user: ${err.detail || 'Unknown error'}`);
            }
        } catch (error) {
            alert("Network error. Could not reach server.");
        }
    };

    const openEditUser = (user) => {
        const username = user.email?.endsWith('@safeway.com')
            ? user.email.replace('@safeway.com', '')
            : user.email || '';

        setEditingUser(user);
        setEditForm({
            full_name: user.full_name || '',
            username,
            password: '',
            role: user.role || 'staff'
        });
        setShowPromoteConfirm(false);
        setPendingRole(null);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: editForm.full_name,
                    username: editForm.username,
                    password: editForm.password,
                    role: editForm.role
                })
            });

            if (res.ok) {
                alert('Account updated!');
                setEditingUser(null);
                setEditForm({ full_name: '', username: '', password: '', role: 'staff' });
                setShowPromoteConfirm(false);
                setPendingRole(null);
                loadData();
            } else {
                const err = await res.json();
                alert(`Failed to update user: ${err.detail || 'Unknown error'}`);
            }
        } catch (error) {
            alert('Network error. Could not reach server.');
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return alert("Please select a file first!");

        const userDataStr = localStorage.getItem("userData");
        if (!userDataStr) {
            alert("Session expired. Please log in again.");
            return navigate('/');
        }

        const userData = JSON.parse(userDataStr);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", form.title);
        formData.append("category", form.category);
        formData.append("admin_id", userData.id);

        try {
            const res = await fetch(`${API_URL}/api/admin/upload`, {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                alert("Document uploaded successfully!");
                setForm({...form, title: ''});
                setSelectedFile(null);
                const fileInput = document.getElementById("file-upload");
                if (fileInput) fileInput.value = "";
                loadData();
            } else {
                const err = await res.json();
                alert(`Upload failed: ${err.detail}`);
            }
        } catch (error) {
            alert("Server error during upload.");
        }
    };

    const deleteItem = async (type, id) => {
        const itemName = type === 'users' ? 'user' : 'document';
        if (!window.confirm(`Are you sure you want to delete this ${itemName}?`)) return;

        const endpoint = type === 'users' ? 'users' : 'documents';

        try {
            await fetch(`${API_URL}/api/admin/${endpoint}/${id}`, { method: "DELETE" });
            loadData();
        } catch (err) {
            alert("Failed to delete item.");
        }
    };

    const updateIntegrationField = (category, field, value) => {
        setIntegrationForms((current) => ({
            ...current,
            [category]: {
                ...current[category],
                [field]: value
            }
        }));
    };

    const setIntegrationMode = (category, mode) => {
        setIntegrationForms((current) => ({
            ...current,
            [category]: {
                ...current[category],
                mode
            }
        }));
    };

    const saveIntegration = async (category) => {
        const current = integrationForms[category];
        if (!current) return;

        const config = {};
        INTEGRATION_FIELDS[category].forEach((field) => {
            if (field.key === 'provider' || field.key === 'mode') return;
            if (current[field.key]) config[field.key] = current[field.key];
        });

        setIntegrationSaving((currentSaving) => ({ ...currentSaving, [category]: true }));

        try {
            const response = await fetch(`${API_URL}/api/admin/integrations/${category}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: current.mode,
                    provider: current.provider,
                    config
                })
            });

            if (!response.ok) {
                const err = await response.json();
                alert(err.detail || 'Failed to save integration settings');
                return;
            }

            const saved = await response.json();
            setIntegrationForms((existing) => ({
                ...existing,
                [category]: {
                    ...existing[category],
                    mode: saved.mode || current.mode,
                    provider: saved.provider || current.provider,
                    ...(saved.config || {})
                }
            }));
            alert(current.mode === 'default' ? 'Default settings restored.' : 'Custom settings saved.');
        } catch (error) {
            alert('Network error. Could not update integration settings.');
        } finally {
            setIntegrationSaving((currentSaving) => ({ ...currentSaving,[category]: false }));
        }
    };

    const renderIntegrationCard = (category) => {
        const setting = integrationForms[category];
        const meta = INTEGRATION_META[category];
        const Icon = meta.icon;
        const isCustom = setting.mode === 'custom';

        return (
            <div key={category} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-5 transition-colors duration-300">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${INTEGRATION_ACCENT_CLASSES[meta.accent]}`}>
                            <Icon size={22} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800 dark:text-white">{meta.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Default settings are used unless a custom override is saved.</p>
                        </div>
                    </div>
                    <div className={`text-xs font-semibold px-3 py-1 rounded-full ${isCustom ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {isCustom ? 'Custom override active' : 'Using default'}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                            type="radio"
                            name={`${category}-mode`}
                            checked={setting.mode === 'default'}
                            onChange={() => setIntegrationMode(category, 'default')}
                            className="h-4 w-4 text-blue-600"
                        />
                        Use default
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                            type="radio"
                            name={`${category}-mode`}
                            checked={setting.mode === 'custom'}
                            onChange={() => setIntegrationMode(category, 'custom')}
                            className="h-4 w-4 text-blue-600"
                        />
                        Use custom values
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INTEGRATION_FIELDS[category].map((field) => (
                        <div key={field.key} className={field.key === 'api_key' || field.key === 'secret_key' ? 'md:col-span-2' : ''}>
                            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">{field.label}</label>
                            <input
                                type={field.key === 'api_key' || field.key === 'secret_key' ? 'password' : 'text'}
                                className="w-full border p-2.5 rounded-lg border-slate-200 dark:border-slate-600 outline-blue-500 bg-slate-50 dark:bg-slate-900 dark:text-white transition-colors"
                                placeholder={field.placeholder}
                                value={setting[field.key] || ''}
                                onChange={(e) => updateIntegrationField(category, field.key, e.target.value)}
                                disabled={setting.mode === 'default' && field.key !== 'provider'}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => loadIntegrations()}
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                        <RefreshCcw size={16} /> Reload
                    </button>
                    <button
                        type="button"
                        onClick={() => saveIntegration(category)}
                        className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        disabled={integrationSaving[category]}
                    >
                        {integrationSaving[category] ? 'Saving...' : setting.mode === 'default' ? 'Restore Default' : 'Save Custom Override'}
                    </button>
                </div>
            </div>
        );
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const handleRoleToggle = (checked) => {
        if (!editingUser) return;
        const nextRole = checked ? 'admin' : 'staff';
        if (nextRole === editForm.role) return;

        setPendingRole(nextRole);
        setShowPromoteConfirm(true);
    };

    const handlePromoteChoice = (confirmChange) => {
        if (!editingUser || !pendingRole) {
            setShowPromoteConfirm(false);
            setPendingRole(null);
            return;
        }
        if (confirmChange) {
            setEditForm((current) => ({ ...current, role: pendingRole }));
        }
        setShowPromoteConfirm(false);
        setPendingRole(null);
    };

    const sortedUsers =[...data.users].sort((left, right) => {
        const leftName = (left.full_name || left.email || '').toLowerCase();
        const rightName = (right.full_name || right.email || '').toLowerCase();
        return leftName.localeCompare(rightName);
    });

    const adminUsers = sortedUsers.filter((user) => user.role === 'admin');
    const staffUsers = sortedUsers.filter((user) => user.role === 'staff');

    const renderUserRow = (user) => (
        <div key={user.id} className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center hover:bg-blue-50/30 dark:hover:bg-slate-700 transition-colors">
            <div className="overflow-hidden pr-2">
                <p className="font-bold text-slate-800 dark:text-white truncate">{user.full_name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEditUser(user)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 p-2 rounded transition" aria-label="Edit user" title="Edit">
                    <Pencil size={20}/>
                </button>
                <button onClick={() => deleteItem('users', user.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 p-2 rounded transition" aria-label="Delete user" title="Delete">
                    <Trash2 size={20}/>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">

            {/* --- MOBILE TOP HEADER --- */}
            <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-20 shadow-sm transition-colors">
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 text-lg">
                    <Upload size={20} /> Safeway
                </div>
                {/* Mobile Dark Mode Toggle */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                >
                    {isDarkMode ? <Sun size={18} className="text-amber-400"/> : <Moon size={18}/>}
                </button>
            </div>

            {/* --- DESKTOP HOVER SIDEBAR --- */}
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`hidden md:flex bg-slate-900 text-white flex-col z-40 transition-all duration-300 ease-in-out border-r border-slate-800 ${isHovered ? 'w-64' : 'w-20'}`}
            >
                <div className={`flex items-center mb-8 h-16 mt-2 transition-all duration-300 ${isHovered ? 'px-6 justify-start' : 'px-0 justify-center'}`}>
                    <Upload size={28} className="text-blue-400 shrink-0" />
                    <h1 className={`font-bold text-xl text-blue-400 whitespace-nowrap overflow-hidden transition-all duration-300 ${isHovered ? 'w-32 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                        Safeway Admin
                    </h1>
                </div>

                <div className={`space-y-2 flex-1 transition-all duration-300 ${isHovered ? 'px-4' : 'px-3'}`}>
                    <button onClick={() => setTab('staff')} title={!isHovered ? "Staff Accounts" : ""} className={`w-full flex items-center py-3 rounded-lg transition-all overflow-hidden ${tab === 'staff' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'} ${isHovered ? 'px-4 justify-start' : 'px-0 justify-center'}`}>
                        <Users className="shrink-0" size={20}/>
                        <span className={`whitespace-nowrap transition-all duration-300 text-left ${isHovered ? 'w-32 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>Staff Accounts</span>
                    </button>
                    <button onClick={() => setTab('docs')} title={!isHovered ? "Document Repository" : ""} className={`w-full flex items-center py-3 rounded-lg transition-all overflow-hidden ${tab === 'docs' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'} ${isHovered ? 'px-4 justify-start' : 'px-0 justify-center'}`}>
                        <FileText className="shrink-0" size={20}/>
                        <span className={`whitespace-nowrap transition-all duration-300 text-left ${isHovered ? 'w-32 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>Document Repository</span>
                    </button>
                    <button onClick={() => setTab('connection')} title={!isHovered ? "Connection Settings" : ""} className={`w-full flex items-center py-3 rounded-lg transition-all overflow-hidden ${tab === 'connection' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'} ${isHovered ? 'px-4 justify-start' : 'px-0 justify-center'}`}>
                        <Database className="shrink-0" size={20}/>
                        <span className={`whitespace-nowrap transition-all duration-300 text-left ${isHovered ? 'w-32 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>Connections</span>
                    </button>
                </div>

                <div className={`mt-auto mb-6 transition-all duration-300 space-y-2 ${isHovered ? 'px-4' : 'px-3'}`}>
                    {/* Desktop Dark Mode Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        title={!isHovered ? (isDarkMode ? "Light Mode" : "Dark Mode") : ""}
                        className={`w-full flex items-center py-3 rounded-lg transition-all overflow-hidden text-slate-300 hover:text-white hover:bg-slate-800 ${isHovered ? 'px-4 justify-start' : 'px-0 justify-center'}`}
                    >
                        {isDarkMode ? <Sun className="shrink-0 text-amber-400" size={20}/> : <Moon className="shrink-0 text-blue-300" size={20}/>}
                        <span className={`whitespace-nowrap transition-all duration-300 text-left ${isHovered ? 'w-32 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </button>

                    <button
                        onClick={handleLogout}
                        title={!isHovered ? "Logout" : ""}
                        className={`w-full flex items-center py-3 rounded-lg transition-all overflow-hidden text-red-400 hover:bg-red-900/20 hover:text-red-300 ${isHovered ? 'px-4 justify-start' : 'px-0 justify-center'}`}
                    >
                        <LogOut className="shrink-0" size={20}/>
                        <span className={`whitespace-nowrap transition-all duration-300 text-left ${isHovered ? 'w-32 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>Logout</span>
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            {/* Added pb-24 for mobile so content doesn't hide behind the bottom nav bar */}
            <div className="flex-1 p-4 pt-24 pb-24 md:p-10 overflow-y-auto w-full transition-colors duration-300 relative z-10">
                <div className="flex items-center justify-end mb-6 max-w-5xl mx-auto">
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm"
                        title="Open profile"
                    >
                        <UserCircle2 size={20} />
                        <span className="text-sm font-semibold">My Profile</span>
                    </button>
                </div>

                {tab === 'staff' && (
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white transition-colors">Staff Account Management</h2>
                        <form onSubmit={handleAddUser} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 transition-colors">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Full Name</label>
                                <input className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-2 rounded outline-blue-500 transition-colors" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Username (@safeway.com)</label>
                                <input className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-2 rounded outline-blue-500 transition-colors" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                            </div>
                            <div className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400 italic mb-2">
                                * New accounts will automatically be assigned a randomly generated password
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded md:col-span-2 font-bold transition flex items-center justify-center gap-2 mt-2">
                                <UserPlus size={20}/> Create Staff Account
                            </button>
                        </form>

                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                                <span>Employee Details</span>
                                <span>Action</span>
                            </div>

                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-900/20">
                                <h3 className="font-bold text-slate-800 dark:text-white">Admin Accounts ({adminUsers.length})</h3>
                            </div>
                            {adminUsers.length === 0 ? (
                                <p className="p-4 text-sm text-slate-500 dark:text-slate-400 italic border-b border-slate-200 dark:border-slate-700">No admin accounts found.</p>
                            ) : (
                                adminUsers.map(renderUserRow)
                            )}

                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                <h3 className="font-bold text-slate-800 dark:text-white">Staff Accounts ({staffUsers.length})</h3>
                            </div>
                            {staffUsers.length === 0 ? (
                                <p className="p-4 text-sm text-slate-500 dark:text-slate-400 italic">No staff accounts found.</p>
                            ) : (
                                staffUsers.map(renderUserRow)
                            )}
                        </div>

                        {/* Edit User Modal */}
                        {editingUser && (
                            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
                                <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 transition-colors max-h-[90vh] overflow-y-auto">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Edit Account</h3>
                                    <form onSubmit={handleEditUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex flex-col gap-1 md:col-span-3">
                                            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Full Name</label>
                                            <input className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-2 rounded outline-blue-500" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
                                        </div>
                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Username (@safeway.com)</label>
                                            <input className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-2 rounded outline-blue-500" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required />
                                        </div>
                                        <div className="flex flex-col gap-1 md:col-span-1">
                                            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">New Password</label>
                                            <input type="password" className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-2 rounded outline-blue-500" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep" />
                                        </div>
                                        <div className="md:col-span-3 flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 mt-2">
                                            <input id="promote-admin" type="checkbox" checked={editForm.role === 'admin'} onChange={(e) => handleRoleToggle(e.target.checked)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500" />
                                            <div className="flex flex-col">
                                                <label htmlFor="promote-admin" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Admin access</label>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Check to grant admin access. Uncheck to remove it.</span>
                                            </div>
                                        </div>
                                        <div className="md:col-span-3 flex justify-end gap-2 mt-4">
                                            <button type="button" onClick={() => { setEditingUser(null); setEditForm({ full_name: '', username: '', password: '', role: 'staff' }); setShowPromoteConfirm(false); setPendingRole(null); }} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                Cancel
                                            </button>
                                            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                                                Save Changes
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Promote Confirm Modal */}
                        {showPromoteConfirm && (
                            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
                                <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center md:text-left transition-colors">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
                                        {pendingRole === 'admin' ? 'Promote to admin?' : 'Demote to staff?'}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {pendingRole === 'admin'
                                            ? 'Are you sure you want to promote this user to admin?'
                                            : 'Are you sure you want to demote this user to staff?'}
                                    </p>
                                    <div className="flex flex-col-reverse md:flex-row justify-end gap-2 mt-6">
                                        <button type="button" onClick={() => handlePromoteChoice(false)} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                            No, cancel
                                        </button>
                                        <button type="button" onClick={() => handlePromoteChoice(true)} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                                            Yes, confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'docs' && (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white transition-colors">Knowledge Base Management</h2>
                        <form onSubmit={handleFileUpload} className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 space-y-6 transition-colors">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Document Title</label>
                                    <input className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-2 rounded outline-blue-500" placeholder="e.g. Employee Handbook" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Category</label>
                                    <select className="border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white p-2 rounded" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                        <option value="HR">HR / Policies</option>
                                        <option value="Safety">Safety / Warehouse</option>
                                        <option value="IT">IT / Security</option>
                                        <option value="General">General Manuals</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 rounded-lg flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer relative text-center">
                                <input id="file-upload" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedFile(e.target.files[0])} accept=".pdf,.docx,.doc,.txt" />
                                <Upload className="text-blue-500 mb-2" size={32} />
                                <p className="text-slate-700 dark:text-slate-300 font-medium">{selectedFile ? selectedFile.name : "Click or Drag file to upload"}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Supports PDF, Word, and Text files</p>
                            </div>

                            <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg w-full font-bold transition flex items-center justify-center gap-2 shadow-md">
                                <FilePlus size={20}/> Upload to Knowledge Base
                            </button>
                        </form>

                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">Stored Documents</div>
                            {data.docs.length === 0 ? (
                                <p className="p-8 text-center text-slate-400 italic">No documents uploaded yet.</p>
                            ) : (
                                data.docs.map(d => (
                                    <div key={d.id} className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center hover:bg-green-50/30 dark:hover:bg-slate-700 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden pr-2">
                                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded text-blue-600 dark:text-blue-400 shrink-0"><File size={20}/></div>
                                            <div className="overflow-hidden">
                                                <p className="font-bold text-slate-800 dark:text-white truncate">{d.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold truncate">{d.category} • {d.file_type}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteItem('docs', d.id)} className="text-red-400 hover:text-red-600 p-2 shrink-0 transition">
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {tab === 'connection' && (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white transition-colors">Connection Settings</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 transition-colors">Choose the default service or override it with a custom provider configuration.</p>

                        <div className="grid grid-cols-1 gap-5">
                            {renderIntegrationCard('database')}
                            {renderIntegrationCard('cloudstorage')}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MOBILE BOTTOM NAVIGATION BAR --- */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-40 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.5)] transition-colors">
                <button onClick={() => setTab('staff')} className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${tab === 'staff' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                    <Users size={20} />
                    <span className="text-[10px] font-medium mt-1">Staff</span>
                </button>
                <button onClick={() => setTab('docs')} className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${tab === 'docs' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                    <FileText size={20} />
                    <span className="text-[10px] font-medium mt-1">Docs</span>
                </button>
                <button onClick={() => setTab('connection')} className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${tab === 'connection' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                    <Database size={20} />
                    <span className="text-[10px] font-medium mt-1">Config</span>
                </button>
                <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full py-3 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
                    <LogOut size={20} />
                    <span className="text-[10px] font-medium mt-1">Logout</span>
                </button>
            </div>

            {/* Generated Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 transition-colors">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Staff Account Created</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">A random password has been generated for this account.</p>
                        </div>

                        <div className="space-y-4 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                            <div>
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Email Address</p>
                                <p className="text-sm font-mono bg-white dark:bg-slate-800 dark:text-white p-2 rounded border border-slate-300 dark:border-slate-600">{generatedPassword.email}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Generated Password</p>
                                <p className="text-sm font-mono bg-white dark:bg-slate-800 dark:text-white p-2 rounded border border-slate-300 dark:border-slate-600 break-all">{generatedPassword.password}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 italic">
                            Please share these credentials securely. They can change their password after logging in.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`Email: ${generatedPassword.email}\nPassword: ${generatedPassword.password}`);
                                    alert('Credentials copied to clipboard!');
                                }}
                                className="flex-1 px-4 py-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition text-sm md:text-base"
                            >
                                Copy Credentials
                            </button>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold hover:bg-slate-800 dark:hover:bg-slate-600 transition text-sm md:text-base"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;