import React, { useState, useEffect } from 'react';
import { UserPlus, FilePlus, Trash2, Users, FileText, LogOut, Upload, File, Pencil, UserCircle2, Database, Cloud, RefreshCcw, Sun, Moon, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const createDefaultIntegrationForms = () => ({
    database: { mode: 'default', provider: 'postgresql', connection_string: '', database_name: '' },
    cloudstorage: { mode: 'default', provider: 'local', endpoint: '', bucket_name: '', access_key: '', secret_key: '' }
});

const INTEGRATION_FIELDS = {
    database: [
        { key: 'provider', label: 'Provider', placeholder: 'postgresql' },
        { key: 'connection_string', label: 'Connection String', placeholder: 'postgresql://user:pass@host/db' },
        { key: 'database_name', label: 'Database Name', placeholder: 'chatbot_db' }
    ],
    cloudstorage: [
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
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('staff');
    const [data, setData] = useState({ users: [], docs: [] });
    const [integrationForms, setIntegrationForms] = useState(createDefaultIntegrationForms());
    const [integrationSaving, setIntegrationSaving] = useState({});

    // --- UI States ---
    const [isHovered, setIsHovered] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    // User Management States
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: '', username: '', password: '', role: 'staff' });
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
    const [pendingRole, setPendingRole] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState({ email: '', password: '' });

    // File Upload States
    const [selectedFile, setSelectedFile] = useState(null);
    const [form, setForm] = useState({ username: '', full_name: '', title: '', category: 'HR' });

    // --- Dark Mode Logic ---
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
        else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    }, [isDarkMode]);

    useEffect(() => { loadData(); loadIntegrations(); }, []);

    const loadData = async () => {
        try {
            const uRes = await fetch(`${API_URL}/api/admin/users`);
            const dRes = await fetch(`${API_URL}/api/admin/documents`);
            const u = uRes.ok ? await uRes.json() : [];
            const d = dRes.ok ? await dRes.json() : [];
            setData({ users: Array.isArray(u) ? u : [], docs: Array.isArray(d) ? d : [] });
        } catch (error) { console.error("Data load error:", error); }
    };

    const loadIntegrations = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/integrations`);
            if (!response.ok) return;
            const payload = await response.json();
            const nextForms = createDefaultIntegrationForms();
            Object.entries(payload || {}).forEach(([cat, set]) => {
                if (!nextForms[cat] || !set) return;
                nextForms[cat] = { ...nextForms[cat], mode: set.mode || 'default', provider: set.provider || nextForms[cat].provider, ...(set.config || {}) };
            });
            setIntegrationForms(nextForms);
        } catch (error) { console.error('Integration load error:', error); }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: form.username, full_name: form.full_name })
            });
            if (res.ok) {
                const resData = await res.json();
                setForm({ ...form, username: '', full_name: '' });
                loadData();
                setGeneratedPassword({ email: resData.email, password: resData.password });
                setShowPasswordModal(true);
            }
        } catch (error) { alert("Network error."); }
    };

    const openEditUser = (user) => {
        const username = user.email?.endsWith('@safeway.com') ? user.email.replace('@safeway.com', '') : user.email || '';
        setEditingUser(user);
        setEditForm({ full_name: user.full_name || '', username, password: '', role: user.role || 'staff' });
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) { setEditingUser(null); loadData(); alert('Account updated!'); }
        } catch (error) { alert('Network error.'); }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return alert("Select a file!");
        const userData = JSON.parse(localStorage.getItem("userData"));
        const formData = new FormData();
        formData.append("file", selectedFile); formData.append("title", form.title);
        formData.append("category", form.category); formData.append("admin_id", userData.id);
        try {
            const res = await fetch(`${API_URL}/api/admin/upload`, { method: "POST", body: formData });
            if (res.ok) { setForm({ ...form, title: '' }); setSelectedFile(null); loadData(); alert("Uploaded!"); }
        } catch (error) { alert("Server error."); }
    };

    const deleteItem = async (type, id) => {
        if (!window.confirm("Delete this item?")) return;
        const endpoint = type === 'users' ? 'users' : 'documents';
        try { await fetch(`${API_URL}/api/admin/${endpoint}/${id}`, { method: "DELETE" }); loadData(); }
        catch (err) { alert("Delete failed."); }
    };

    const saveIntegration = async (category) => {
        const current = integrationForms[category];
        const config = {};
        INTEGRATION_FIELDS[category].forEach((f) => { if (f.key !== 'provider' && f.key !== 'mode' && current[f.key]) config[f.key] = current[f.key]; });
        setIntegrationSaving({ ...integrationSaving, [category]: true });
        try {
            const res = await fetch(`${API_URL}/api/admin/integrations/${category}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: current.mode, provider: current.provider, config }) });
            if (res.ok) alert('Settings saved.');
        } finally { setIntegrationSaving({ ...integrationSaving, [category]: false }); }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    const sortedUsers = [...data.users].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    const adminUsers = sortedUsers.filter(u => u.role === 'admin');
    const staffUsers = sortedUsers.filter(u => u.role === 'staff');

    // --- User Row Component ---
    const UserRow = ({ user, isStaffTable }) => (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-lg shrink-0 ${isStaffTable ? 'bg-slate-100 dark:bg-slate-700 text-slate-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                    {isStaffTable ? <User size={18} /> : <ShieldCheck size={18} />}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
                <button onClick={() => openEditUser(user)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Pencil size={18}/></button>
                <button onClick={() => deleteItem('users', user.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18}/></button>
            </div>
        </div>
    );

    const handleRoleToggle = (checked) => {
        const nextRole = checked ? 'admin' : 'staff';
        if (nextRole === editForm.role) return;
        setPendingRole(nextRole);
        setShowPromoteConfirm(true);
    };

    const handlePromoteChoice = (confirmChange) => {
        if (confirmChange) setEditForm(curr => ({ ...curr, role: pendingRole }));
        setShowPromoteConfirm(false); setPendingRole(null);
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">

            {/* MOBILE TOP HEADER */}
            <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-20 shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                    {/* CONTRAST BOX WRAPPER */}
                    <div className="bg-slate-900 dark:bg-slate-800 p-1.5 rounded-xl shadow-inner shrink-0">
                        <img
                            src="/safewaylogo.png"
                            alt="Safeway"
                            className="w-10 h-10 object-cover"
                        />
                    </div>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">Dashboard</span>
                </div>

                {/* Mobile Dark Mode Toggle */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                >
                    {isDarkMode ? <Sun size={18} className="text-amber-400"/> : <Moon size={18}/>}
                </button>
            </div>

            {/* DESKTOP HOVER SIDEBAR */}
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`hidden md:flex bg-slate-900 text-white flex-col z-40 transition-all duration-300 ease-in-out border-r border-slate-800 shrink-0 ${isHovered ? 'w-64' : 'w-20'}`}
            >
                {/* LOGO SECTION - FIXED OVERFLOW */}
                <div className={`flex items-center mb-8 h-20 mt-2 transition-all duration-300 overflow-hidden ${isHovered ? 'px-6' : 'justify-center px-0'}`}>
                    <img
                        src="/safewaylogo.png"
                        alt="Logo"
                        className="w-15 h-15 rounded-lg object-cover shrink-0 shadow-sm border border-slate-700"
                    />
                    <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                        <h1 className="font-bold text-xl text-blue-400">Dashboard</h1>
                    </div>
                </div>

                {/* NAVIGATION - FIXED OVERFLOW */}
                <div className="space-y-2 flex-1 px-3 overflow-hidden">
                    {[
                        { id: 'staff', icon: Users, label: 'Accounts' },
                        { id: 'docs', icon: FileText, label: 'Documents' },
                        { id: 'connection', icon: Database, label: 'Database' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`w-full flex items-center py-3 rounded-lg transition-all overflow-hidden ${tab === item.id ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'} ${isHovered ? 'px-4' : 'justify-center'}`}
                        >
                            <item.icon size={20} className="shrink-0" />
                            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                                <span>{item.label}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* BOTTOM ACTIONS - FIXED OVERFLOW */}
                <div className="mt-auto mb-6 px-3 space-y-2 overflow-hidden border-t border-slate-800 pt-4">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-full flex items-center py-3 rounded-lg hover:bg-slate-800 transition-all ${isHovered ? 'px-4' : 'justify-center'}`}
                    >
                        {isDarkMode ? <Sun size={20} className="text-amber-400 shrink-0"/> : <Moon size={20} className="text-blue-300 shrink-0"/>}
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                            <span>{isDarkMode ? 'Light' : 'Dark'} Mode</span>
                        </div>
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center py-3 rounded-lg hover:bg-red-900/20 text-red-400 transition-all ${isHovered ? 'px-4' : 'justify-center'}`}
                    >
                        <LogOut size={20} className="shrink-0" />
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                            <span>Logout</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 pt-24 pb-24 md:p-10 overflow-y-auto w-full transition-colors duration-300 relative z-10">
                <div className="max-w-5xl mx-auto">

                    {/* Header with Profile */}
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white transition-colors">
                            {tab === 'staff' ? 'Accounts Management' : tab === 'docs' ? 'Document Repository' : 'Database Configuration'}
                        </h2>
                        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:shadow-md transition-all">
                            <UserCircle2 size={20} className="text-blue-500" />
                            <span className="text-sm font-bold hidden sm:inline">Profile</span>
                        </button>
                    </div>

                    {tab === 'staff' && (
                        <div className="space-y-10">
                            {/* Create Section */}
                            <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><UserPlus size={20} className="text-blue-500"/> Create New Account</h3>
                                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase px-1">Full Name</label>
                                        <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500 transition-colors" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required placeholder="John Doe" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase px-1">Username (@safeway.com)</label>
                                        <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500 transition-colors" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required placeholder="john.d" />
                                    </div>
                                    <button className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">Generate Account & Password</button>
                                </form>
                            </section>

                            {/* Split Tables */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-fit">
                                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2"><ShieldCheck size={20}/> Administrators</h3><span className="bg-white/20 text-xs px-2 py-1 rounded-full font-bold">{adminUsers.length}</span></div>
                                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                                        {adminUsers.length === 0 ? <p className="p-8 text-center text-slate-400 italic">No admin accounts.</p> : adminUsers.map(u => <UserRow key={u.id} user={u} isStaffTable={false} />)}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-fit">
                                    <div className="bg-slate-700 dark:bg-slate-600 p-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2"><User size={20}/> Internal Staff</h3><span className="bg-white/20 text-xs px-2 py-1 rounded-full font-bold">{staffUsers.length}</span></div>
                                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                                        {staffUsers.length === 0 ? <p className="p-8 text-center text-slate-400 italic">No staff accounts.</p> : staffUsers.map(u => <UserRow key={u.id} user={u} isStaffTable={true} />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'docs' && (
                        <div className="space-y-6">
                            <form onSubmit={handleFileUpload} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input className="border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500" placeholder="Manual Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                                    <select className="border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                        <option value="HR">HR / Policies</option><option value="Safety">Safety / Warehouse</option><option value="IT">IT / Security</option><option value="General">General Manuals</option>
                                    </select>
                                </div>
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 p-10 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 hover:border-blue-400 transition-colors cursor-pointer relative text-center">
                                    <input id="file-upload" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedFile(e.target.files[0])} accept=".pdf,.docx,.doc,.txt" />
                                    <Upload className="text-blue-500 mb-2" size={32} />
                                    <p className="text-slate-700 dark:text-slate-300 font-bold">{selectedFile ? selectedFile.name : "Tap or Drag file to upload"}</p>
                                </div>
                                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-extrabold transition shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"><FilePlus size={20}/> Upload to Repository</button>
                            </form>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                {data.docs.map(d => (
                                    <div key={d.id} className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <div className="flex items-center gap-3"><File className="text-emerald-600" size={18}/><div><p className="font-bold dark:text-white">{d.title}</p><p className="text-[10px] text-slate-500">{d.category} • {d.file_type}</p></div></div>
                                        <button onClick={() => deleteItem('documents', d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'connection' && (
                        <div className="grid grid-cols-1 gap-6">
                            {['database', 'cloudstorage'].map(category => (
                                <div key={category} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${INTEGRATION_ACCENT_CLASSES[INTEGRATION_META[category].accent]}`}>
                                            {React.createElement(INTEGRATION_META[category].icon, { size: 24 })}
                                        </div>
                                        <div><h4 className="text-lg font-bold dark:text-white">{INTEGRATION_META[category].title}</h4><p className="text-sm text-slate-500">Service configuration settings</p></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {INTEGRATION_FIELDS[category].map(f => (
                                            <div key={f.key} className={f.key === 'connection_string' || f.key === 'secret_key' ? 'md:col-span-2' : ''}>
                                                <label className="text-xs font-bold text-slate-500 uppercase">{f.label}</label>
                                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-2.5 rounded-xl" placeholder={f.placeholder} value={integrationForms[category][f.key] || ''} onChange={e => updateIntegrationField(category, f.key, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => saveIntegration(category)} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition">Save Config Override</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE BOTTOM NAVIGATION BAR */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-40 pb-safe shadow-xl transition-colors">
                {[ ['staff', Users, 'Users'], ['docs', FileText, 'Files'], ['connection', Database, 'Config'] ].map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${tab === id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                        <Icon size={20} />
                        <span className="text-[10px] font-bold mt-1">{label}</span>
                    </button>
                ))}
                <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full py-3 text-red-500 transition-colors">
                    <LogOut size={20} /><span className="text-[10px] font-bold mt-1">Logout</span>
                </button>
            </div>


            {/* Password Result Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700 transition-colors">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 mx-auto rounded-full flex items-center justify-center mb-6 animate-bounce"><Check size={40}/></div>
                        <h3 className="text-2xl font-bold dark:text-white mb-2">Account Created</h3>
                        <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8 space-y-4">
                            <div className="text-left"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</span><p className="font-mono font-bold dark:text-white text-sm">{generatedPassword.email}</p></div>
                            <div className="text-left"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</span><p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg break-all">{generatedPassword.password}</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { navigator.clipboard.writeText(`Email: ${generatedPassword.email}\nPass: ${generatedPassword.password}`); alert('Copied!'); }} className="bg-slate-100 dark:bg-slate-700 p-3 rounded-xl font-bold text-slate-700 dark:text-white hover:bg-slate-200 transition-colors">Copy</button>
                            <button onClick={() => setShowPasswordModal(false)} className="bg-slate-900 dark:bg-white dark:text-slate-900 p-3 rounded-xl font-bold text-white transition-colors">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 transition-colors max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Modify Account</h3>
                        <form onSubmit={handleEditUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">Full Name</label>
                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500 transition-colors" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">Username</label>
                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500 transition-colors" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">Password</label>
                                <input type="password" className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500 transition-colors" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep" />
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <input id="promote" type="checkbox" checked={editForm.role === 'admin'} onChange={(e) => handleRoleToggle(e.target.checked)} className="h-5 w-5 rounded text-blue-600" />
                                <div><label htmlFor="promote" className="font-bold dark:text-white">Admin Privileges</label><p className="text-xs text-slate-500">Enable advanced dashboard access for this user.</p></div>
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold dark:text-white hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-8 py-3 rounded-xl bg-blue-600 text-white font-extrabold hover:bg-blue-700 transition-all shadow-lg">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPromoteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-200 dark:border-slate-700 transition-colors">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Security Change</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to change the access level for this user to <span className="font-bold text-blue-600 uppercase">{pendingRole}</span>?</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handlePromoteChoice(false)} className="p-3 rounded-xl border border-slate-200 font-bold dark:text-white">Cancel</button>
                            <button onClick={() => handlePromoteChoice(true)} className="p-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
