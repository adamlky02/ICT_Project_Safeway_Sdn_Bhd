import React, { useState, useEffect } from 'react';
import { UserPlus, FilePlus, Trash2, Users, FileText, LogOut, Upload, File, Pencil, UserCircle2, Database, Cloud, RefreshCcw, Sun, Moon, ShieldCheck, User, Search } from 'lucide-react';
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
    const [searchTerm, setSearchTerm] = useState('');

    // User Management States (Updated to separate First/Last Name)
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ first_name: '', last_name: '', username: '', password: '', role: 'staff' });
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
    const [pendingRole, setPendingRole] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState({ email: '', password: '' });

    // File Upload States
    const [selectedFile, setSelectedFile] = useState(null);
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        username: '',
        title: '',
        category: 'HR'
    });

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
        // JOIN LOGIC: Combine first and last name for the full_name column
        const full_name = `${form.first_name} ${form.last_name}`.trim();

        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: form.username, full_name: full_name })
            });
            if (res.ok) {
                const resData = await res.json();
                setForm({ ...form, username: '', first_name: '', last_name: '' });
                loadData();
                setGeneratedPassword({ email: resData.email, password: resData.password });
                setShowPasswordModal(true);
            }
        } catch (error) { alert("Network error."); }
    };

    const openEditUser = (user) => {
        const username = user.email?.endsWith('@safeway.com') ? user.email.replace('@safeway.com', '') : user.email || '';

        // SPLIT LOGIC: Extract first and last name from full_name
        const names = (user.full_name || '').split(' ');
        const first = names[0] || '';
        const last = names.slice(1).join(' ') || '';

        setEditingUser(user);
        setEditForm({ first_name: first, last_name: last, username, password: '', role: user.role || 'staff' });
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        // JOIN LOGIC for update
        const full_name = `${editForm.first_name} ${editForm.last_name}`.trim();

        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: full_name,
                    username: editForm.username,
                    password: editForm.password,
                    role: editForm.role
                })
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

    const filteredUsers = data.users.filter(u =>
        (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    const adminUsers = sortedUsers.filter(u => u.role === 'admin');
    const staffUsers = sortedUsers.filter(u => u.role === 'staff');

    const UserRow = ({ user, isStaffTable }) => (
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-1.5 rounded-lg shrink-0 ${isStaffTable ? 'bg-slate-100 dark:bg-slate-700 text-slate-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                    {isStaffTable ? <User size={16} /> : <ShieldCheck size={16} />}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => openEditUser(user)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Pencil size={16}/></button>
                <button onClick={() => deleteItem('users', user.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">

            {/* DESKTOP SIDEBAR */}
            <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`hidden md:flex bg-slate-900 text-white flex-col z-40 transition-all duration-300 ease-in-out border-r border-slate-800 shrink-0 ${isHovered ? 'w-64' : 'w-20'}`}>
                <div className={`flex items-center mb-8 h-20 mt-2 transition-all duration-300 overflow-hidden ${isHovered ? 'px-6' : 'justify-center px-0'}`}>
                    <img src="/safewaylogo.png" alt="Logo" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-700" />
                    <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                        <h1 className="font-bold text-xl text-blue-400">Dashboard</h1>
                    </div>
                </div>

                <div className="space-y-2 flex-1 px-3 overflow-hidden">
                    {[ { id: 'staff', icon: Users, label: 'Accounts' }, { id: 'docs', icon: FileText, label: 'Documents' }, { id: 'connection', icon: Database, label: 'Connection' } ].map((item) => (
                        <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center py-3 rounded-lg transition-all overflow-hidden ${tab === item.id ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'} ${isHovered ? 'px-4' : 'justify-center'}`}>
                            <item.icon size={20} className="shrink-0" />
                            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{item.label}</span></div>
                        </button>
                    ))}
                </div>

                <div className="mt-auto mb-6 px-3 space-y-2 overflow-hidden border-t border-slate-800 pt-4">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-full flex items-center py-3 rounded-lg hover:bg-slate-800 transition-all ${isHovered ? 'px-4' : 'justify-center'}`}>
                        {isDarkMode ? <Sun size={20} className="text-amber-400 shrink-0"/> : <Moon size={20} className="text-blue-300 shrink-0"/>}
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{isDarkMode ? 'Light' : 'Dark'} Mode</span></div>
                    </button>
                    <button onClick={handleLogout} className={`w-full flex items-center py-3 rounded-lg hover:bg-red-900/20 text-red-400 transition-all ${isHovered ? 'px-4' : 'justify-center'}`}>
                        <LogOut size={20} className="shrink-0" />
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>Logout</span></div>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 pt-8 pb-24 md:p-10 overflow-y-auto w-full transition-colors duration-300 relative z-10">
                <div className="max-w-6xl mx-auto">

                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">
                            {tab === 'staff' ? 'Accounts Management' : tab === 'docs' ? 'Documents Repository' : 'Connection Configuration'}
                        </h2>
                        <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:shadow-md transition-all">
                            <UserCircle2 size={20} className="text-blue-500" />
                            <span className="text-sm font-bold hidden sm:inline">Profile</span>
                        </button>
                    </div>

                    {tab === 'staff' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search Account..."
                                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* --- CREATE ACCOUNT SECTION (With requested Headers) --- */}
                            <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <form onSubmit={handleAddUser} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Employee Name Header & Inputs */}
                                        <div className="space-y-3">
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Employee Name</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl text-sm outline-blue-500" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required placeholder="First Name" />
                                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl text-sm outline-blue-500" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required placeholder="Last Name" />
                                            </div>
                                        </div>

                                        {/* Email Header & Input */}
                                        <div className="space-y-3">
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Email</h4>
                                            <div className="relative group">
                                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 pr-28 rounded-xl text-sm outline-blue-500" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required placeholder="Username prefix (e.g. doe123)" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">@safeway.com</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                                        <p className="text-[10px] text-slate-400 italic">* Random password will be generated for new users</p>
                                        <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                            <UserPlus size={18}/> Generate Account
                                        </button>
                                    </div>
                                </form>
                            </section>

                            {/* Tables */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[400px] flex flex-col">
                                    <div className="bg-blue-600 p-3.5 flex justify-between items-center text-white shrink-0 font-bold text-xs uppercase tracking-widest"><div className="flex items-center gap-2"><ShieldCheck size={16}/> Administrators</div><span>{adminUsers.length}</span></div>
                                    <div className="overflow-y-auto flex-1">{adminUsers.length === 0 ? <div className="p-10 text-center text-slate-400 italic text-sm">No matches found.</div> : adminUsers.map(u => <UserRow key={u.id} user={u} isStaffTable={false} />)}</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[400px] flex flex-col">
                                    <div className="bg-slate-700 dark:bg-slate-600 p-3.5 flex justify-between items-center text-white shrink-0 font-bold text-xs uppercase tracking-widest"><div className="flex items-center gap-2"><User size={16}/> Internal Staff</div><span>{staffUsers.length}</span></div>
                                    <div className="overflow-y-auto flex-1">{staffUsers.length === 0 ? <div className="p-10 text-center text-slate-400 italic text-sm">No matches found.</div> : staffUsers.map(u => <UserRow key={u.id} user={u} isStaffTable={true} />)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ... rest of your code for docs and connection (unchanged) ... */}
                    {tab === 'docs' && (
                        <div className="space-y-6">
                            <form onSubmit={handleFileUpload} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input className="border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500" placeholder="Manual Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                                    <select className="border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                        <option value="HR">HR / Policies</option><option value="Safety">Safety / Warehouse</option><option value="IT">IT / Security</option><option value="General">General Manuals</option>
                                    </select>
                                </div>
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 p-10 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 hover:border-blue-400 cursor-pointer relative text-center">
                                    <input id="file-upload" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedFile(e.target.files[0])} accept=".pdf,.docx,.doc,.txt" />
                                    <Upload className="text-blue-500 mb-2" size={32} />
                                    <p className="text-slate-700 dark:text-slate-300 font-bold">{selectedFile ? selectedFile.name : "Tap or Drag file to upload"}</p>
                                </div>
                                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-extrabold transition shadow-lg flex justify-center items-center gap-2"><FilePlus size={20}/> Upload to Repository</button>
                            </form>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                {data.docs.map(d => (
                                    <div key={d.id} className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded text-emerald-600 shrink-0"><File size={18}/></div>
                                            <div className="overflow-hidden"><p className="font-bold truncate dark:text-white">{d.title}</p><p className="text-[10px] text-slate-500 uppercase">{d.category} • {d.file_type}</p></div>
                                        </div>
                                        <button onClick={() => deleteItem('documents', d.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'connection' && (
                        <div className="grid grid-cols-1 gap-4">
                            {['database', 'cloudstorage'].map(category => (
                                <div key={category} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${INTEGRATION_ACCENT_CLASSES[INTEGRATION_META[category].accent]}`}>{React.createElement(INTEGRATION_META[category].icon, { size: 20 })}</div>
                                        <h4 className="font-bold dark:text-white text-sm">{INTEGRATION_META[category].title}</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {INTEGRATION_FIELDS[category].map(f => (
                                            <div key={f.key} className={f.key === 'connection_string' || f.key === 'secret_key' ? 'md:col-span-2' : ''}>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{f.label}</label>
                                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-2 rounded-lg text-sm" placeholder={f.placeholder} value={integrationForms[category][f.key] || ''} onChange={e => updateIntegrationField(category, f.key, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => saveIntegration(category)} className="w-full bg-blue-600 text-white p-2 rounded-lg font-bold hover:bg-blue-700 transition text-sm">Save Config</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE BOTTOM NAVIGATION BAR */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-40 pb-safe shadow-xl transition-colors h-14">
                {[ ['staff', Users, 'Users'], ['docs', FileText, 'Files'], ['connection', Database, 'Config'] ].map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center justify-center w-full transition-colors ${tab === id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                        <Icon size={18} /><span className="text-[9px] font-bold mt-0.5">{label}</span>
                    </button>
                ))}
                <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full py-3 text-red-500 transition-colors"><LogOut size={18} /><span className="text-[9px] font-bold mt-0.5">Logout</span></button>
            </div>

            {/* EDIT USER MODAL (Responsive & Split Names) */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 transition-colors max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Modify Account</h3>
                        <form onSubmit={handleEditUser} className="space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee Name</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500" value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} required placeholder="First Name" />
                                    <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500" value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} required placeholder="Last Name" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Email</h4>
                                <input className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required placeholder="john.d" />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Security</h4>
                                <input type="password" placeholder="New password (leave blank to keep)" className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white p-3 rounded-xl outline-blue-500" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <input id="promote" type="checkbox" checked={editForm.role === 'admin'} onChange={(e) => handleRoleToggle(e.target.checked)} className="h-5 w-5 rounded text-blue-600" />
                                <div><label htmlFor="promote" className="font-bold dark:text-white">Admin Privileges</label></div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold dark:text-white hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-8 py-3 rounded-xl bg-blue-600 text-white font-extrabold hover:bg-blue-700 shadow-lg">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password result modal (unchanged logic) */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 mx-auto rounded-full flex items-center justify-center mb-6"><Check size={32}/></div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Account Ready</h3>
                        <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 space-y-3">
                            <div className="text-left"><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-mono text-xs dark:text-white truncate">{generatedPassword.email}</p></div>
                            <div className="text-left"><p className="text-[10px] font-bold text-slate-400 uppercase">Password</p><p className="font-mono text-sm text-emerald-600 dark:text-emerald-400 font-bold">{generatedPassword.password}</p></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { navigator.clipboard.writeText(`Email: ${generatedPassword.email}\nPass: ${generatedPassword.password}`); alert('Copied!'); }} className="flex-1 bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-white">Copy</button>
                            <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 p-2.5 rounded-xl font-bold text-sm">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role confirm modal (unchanged logic) */}
            {showPromoteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Change Role?</h3>
                        <p className="text-xs text-slate-500 mb-6 px-4">Switch access to <span className="font-bold text-blue-600 uppercase">{pendingRole}</span>?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handlePromoteChoice(false)} className="p-2 rounded-lg border border-slate-200 font-bold dark:text-white text-xs">No</button>
                            <button onClick={() => handlePromoteChoice(true)} className="p-2 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-md">Yes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;