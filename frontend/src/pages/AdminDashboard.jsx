import React, { useState, useEffect } from 'react';
import { UserPlus, FilePlus, Trash2, Users, FileText, LogOut, Upload, File, Pencil, UserCircle2, RefreshCcw, Sun, Moon, ShieldCheck, User, Search, Globe, Activity, Database, Cloud, Cpu, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const inputStyle = "w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0a0a0a] dark:text-white p-3 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 shadow-inner";
const cardStyle = "bg-white/40 dark:bg-white/5 backdrop-blur-3xl saturate-150 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl md:rounded-[2rem] transition-colors relative overflow-hidden";
const primaryBtnStyle = "w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 p-2.5 rounded-xl text-sm font-black transition-all hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-2";

const AdminDashboard = () => {
    const navigate = useNavigate();

    // --- LANGUAGE LOGIC ---
    const [lang, setLang] = useState(() => localStorage.getItem('language') || 'en');
    const t = translations[lang] || translations['en'] || {};

    const toggleLanguage = () => {
        const nextLang = lang === 'en' ? 'ms' : lang === 'ms' ? 'zh' : 'en';
        setLang(nextLang);
        localStorage.setItem('language', nextLang);
    };

    const [tab, setTab] = useState('staff');
    const [data, setData] = useState({ users: [], docs: [] });

    // NEW: Analytics State
    const [analytics, setAnalytics] = useState({ total_users: 0, total_docs: 0, total_storage_mb: 0, status: {} });
    const [isRefreshing, setIsRefreshing] = useState(false);

    // --- UI States ---
    const [isHovered, setIsHovered] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [searchTerm, setSearchTerm] = useState('');

    // User Management States
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ first_name: '', last_name: '', username: '', password: '', role: 'staff' });
    const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
    const [pendingRole, setPendingRole] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState({ email: '', password: '' });

    // File Upload States
    const [selectedFile, setSelectedFile] = useState(null);
    const [form, setForm] = useState({ first_name: '', last_name: '', username: '', title: '', category: 'HR' });

    // --- Dark Mode Logic ---
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
        else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    }, [isDarkMode]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsRefreshing(true);
        try {
            const uRes = await fetch(`${API_URL}/api/admin/users`);
            const dRes = await fetch(`${API_URL}/api/admin/documents`);
            const aRes = await fetch(`${API_URL}/api/admin/analytics`); // Fetch new analytics

            const u = uRes.ok ? await uRes.json() : [];
            const d = dRes.ok ? await dRes.json() : [];
            const a = aRes.ok ? await aRes.json() : { total_users: 0, total_docs: 0, total_storage_mb: 0, status: {} };

            setData({ users: Array.isArray(u) ? u : [], docs: Array.isArray(d) ? d : [] });
            setAnalytics(a);
        } catch (error) {
            console.error("Data load error:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
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
        const names = (user.full_name || '').split(' ');
        const first = names[0] || '';
        const last = names.slice(1).join(' ') || '';
        setEditingUser(user);
        setEditForm({ first_name: first, last_name: last, username, password: '', role: user.role || 'staff' });
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        const full_name = `${editForm.first_name} ${editForm.last_name}`.trim();
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: full_name, username: editForm.username, password: editForm.password, role: editForm.role })
            });
            if (res.ok) { setEditingUser(null); loadData(); alert(t.acc_ready || 'Account updated!'); }
        } catch (error) { alert('Network error.'); }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return alert("Select a file!");
        const userDataStr = localStorage.getItem("userData");
        if (!userDataStr) { alert("Session expired."); return navigate('/'); }

        const formData = new FormData();
        formData.append("file", selectedFile); formData.append("title", form.title);
        formData.append("category", form.category); formData.append("admin_id", JSON.parse(userDataStr).id);

        try {
            const res = await fetch(`${API_URL}/api/admin/upload`, { method: "POST", body: formData });
            if (res.ok) {
                setForm({ ...form, title: '' });
                setSelectedFile(null);
                const fileInput = document.getElementById("file-upload");
                if (fileInput) fileInput.value = "";
                loadData();
                alert("Uploaded!");
            } else {
                const err = await res.json();
                alert(`Upload failed: ${err.detail}`);
            }
        } catch (error) { alert("Server error."); }
    };

    const deleteItem = async (type, id) => {
        if (!window.confirm("Delete this item?")) return;
        const endpoint = type === 'users' ? 'users' : 'documents';
        try { await fetch(`${API_URL}/api/admin/${endpoint}/${id}`, { method: "DELETE" }); loadData(); }
        catch (err) { alert("Delete failed."); }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };
    const handleRoleToggle = (checked) => { const nextRole = checked ? 'admin' : 'staff'; if (nextRole === editForm.role) return; setPendingRole(nextRole); setShowPromoteConfirm(true); };
    const handlePromoteChoice = (confirmChange) => { if (confirmChange) setEditForm(curr => ({ ...curr, role: pendingRole })); setShowPromoteConfirm(false); setPendingRole(null); };

    const filteredUsers = data.users.filter(u => (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())));
    const sortedUsers = [...filteredUsers].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    const adminUsers = sortedUsers.filter(u => u.role === 'admin');
    const staffUsers = sortedUsers.filter(u => u.role === 'staff');

    const UserRow = ({ user, isStaffTable }) => (
        <div className="p-3 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-1.5 rounded-lg shrink-0 ${isStaffTable ? 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-500/20'}`}>
                    {isStaffTable ? <User size={16} /> : <ShieldCheck size={16} />}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate tracking-tight">{user.full_name}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-500 truncate">{user.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity">
                <button onClick={() => openEditUser(user)} className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:bg-white/5 rounded-lg transition-colors"><Pencil size={15}/></button>
                <button onClick={() => deleteItem('users', user.id)} className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:bg-white/5 rounded-lg transition-colors"><Trash2 size={15}/></button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-500 overflow-hidden relative font-sans">

            {/* AMBIENT BACKGROUND GLOWS */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-40 dark:opacity-60 transition-opacity duration-700"></div>
            <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none z-0 transition-colors duration-700"></div>
            <div className="absolute bottom-[20%] right-[-5%] w-[300px] h-[300px] bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-[80px] pointer-events-none z-0 transition-colors duration-700"></div>

            {/* MOBILE TOP HEADER */}
            <div className="md:hidden bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-20 transition-colors">
                <div className="flex items-center gap-3">
                    <img src={isDarkMode ? "/safewaylogo.png" : "/safewaylogoblack.png"} alt="Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 uppercase tracking-tight text-lg">Safeway</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleLanguage} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-blue-600 dark:text-blue-400 transition-colors uppercase text-[10px] font-bold">
                        <Globe size={16} />
                    </button>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors">
                        {isDarkMode ? <Sun size={16} className="text-amber-500"/> : <Moon size={16}/>}
                    </button>
                </div>
            </div>

            {/* DESKTOP HOVER SIDEBAR */}
            <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`hidden md:flex bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl text-slate-700 dark:text-slate-300 flex-col z-40 transition-all duration-300 ease-out border-r border-slate-200 dark:border-slate-800 shrink-0 ${isHovered ? 'w-64' : 'w-24'}`}>
                <div className={`flex items-center mb-8 h-24 mt-2 transition-all duration-300 overflow-hidden ${isHovered ? 'px-6' : 'justify-center px-0'}`}>
                    <img src={isDarkMode ? "/safewaylogo.png" : "/safewaylogoblack.png"} alt="Logo" className="w-18 h-18 object-contain shrink-0 drop-shadow-md transition-transform duration-500 hover:scale-105" />
                    <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-2' : 'w-0 opacity-0 ml-0'}`}>
                        <h1 className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 uppercase tracking-tight">{t.admin_dashboard || 'Admin'}</h1>
                    </div>
                </div>

                <div className="space-y-1.5 flex-1 px-3 overflow-hidden">
                    {/* Changed Config tab to Analytics tab */}
                    {[ , { id: 'analytics', icon: Activity, label: t.tab_analytics || 'Health' }, { id: 'staff', icon: Users, label: t.tab_accounts || 'Accounts' }, { id: 'docs', icon: FileText, label: t.tab_docs || 'Docs' } ].map((item) => (
                        <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center py-3 rounded-2xl transition-all overflow-hidden ${tab === item.id ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20 font-bold' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'} ${isHovered ? 'px-4' : 'justify-center'}`}>
                            <item.icon size={22} className="shrink-0" />
                            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{item.label}</span></div>
                        </button>
                    ))}
                </div>

                <div className="mt-auto mb-6 px-3 space-y-1.5 pt-4 border-t border-slate-300/50 dark:border-white/10">
                    <button onClick={toggleLanguage} className={`w-full flex items-center py-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-medium text-slate-600 dark:text-slate-400 ${isHovered ? 'px-4' : 'justify-center'}`}>
                        <Globe size={22} className="text-blue-500 shrink-0"/>
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'} uppercase`}><span>{lang}</span></div>
                    </button>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-full flex items-center py-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-medium text-slate-600 dark:text-slate-400 ${isHovered ? 'px-4' : 'justify-center'}`}>
                        {isDarkMode ? <Sun size={22} className="text-amber-500 shrink-0"/> : <Moon size={22} className="shrink-0"/>}
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{t.theme_mode || 'Theme'}</span></div>
                    </button>
                    <button onClick={handleLogout} className={`w-full flex items-center py-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-all font-medium ${isHovered ? 'px-4' : 'justify-center'}`}>
                        <LogOut size={22} className="shrink-0" />
                        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isHovered ? 'w-40 opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}><span>{t.logout || 'Logout'}</span></div>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 pt-24 pb-24 md:p-10 overflow-y-auto w-full transition-colors duration-300 relative z-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto">

                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight transition-colors">
                            {tab === 'staff' ? t.accounts_mgmt || 'Accounts' : tab === 'docs' ? t.docs_repo || 'Documents' : t.sys_analytics || 'System Analytics & Health'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/chat')} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/60 dark:border-white/20 text-slate-800 dark:text-white hover:border-amber-500/50 hover:bg-white/60 dark:hover:bg-white/20 transition-all shadow-sm font-bold text-sm">
                                <MessageSquare size={16} className="text-amber-500" />
                                <span className="hidden sm:inline">{t.switch_to_staff || 'Staff Chat'}</span>
                            </button>
                            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/60 dark:border-white/20 text-slate-800 dark:text-white hover:border-amber-500/50 hover:bg-white/60 dark:hover:bg-white/20 transition-all shadow-sm font-bold text-sm">
                                <UserCircle2 size={18} className="text-amber-500" />
                                <span className="hidden sm:inline">{t.profile || 'Profile'}</span>
                            </button>
                        </div>
                    </div>

                    {/* STAFF TAB */}
                    {tab === 'staff' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                                <div className="space-y-1.5 w-full sm:w-72">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.search_dir || 'Search'}</label>
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={14} />
                                        <input type="text" placeholder={t.search_placeholder} className={`${inputStyle} pl-9`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] hidden sm:block pb-2">
                                    {t.id_manager || 'Safeway Identity Manager'}
                                </div>
                            </div>

                            <section className={`${cardStyle} p-5`}>
                                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>
                                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end relative z-10">
                                    <div className="sm:col-span-5 flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">{t.emp_name}</label>
                                        <div className="flex gap-2">
                                            <input className={inputStyle} value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required placeholder={t.first_name || 'First'} />
                                            <input className={inputStyle} value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required placeholder={t.last_name || 'Last'} />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-4 flex flex-col gap-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">{t.email} <span className="text-[9px] lowercase opacity-70">{t.email_prefix}</span></label>
                                        <div className="flex border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:border-amber-500 transition-all shadow-inner backdrop-blur-sm">
                                            <input className="flex-1 bg-transparent p-2.5 text-sm dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-500" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required placeholder="john.d" />
                                            <span className="bg-slate-200/50 dark:bg-white/5 px-3 flex items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-white/10">@safeway.com</span>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <button className={primaryBtnStyle}><UserPlus size={16}/> {t.generate_acc}</button>
                                    </div>
                                    <div className="sm:col-span-12 text-[10px] text-slate-500 dark:text-slate-400 italic ml-1 mt-1 font-medium">{t.acc_notice}</div>
                                </form>
                            </section>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className={`${cardStyle} flex flex-col h-[380px]`}>
                                    <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>
                                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3.5 flex justify-between items-center text-slate-900 shrink-0 font-black text-xs uppercase tracking-widest relative z-10 border-b border-white/20">
                                        <div className="flex items-center gap-2"><ShieldCheck size={14}/> {t.admins}</div>
                                        <span className="bg-slate-900/10 px-2.5 py-0.5 rounded-full">{adminUsers.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                                        {adminUsers.length === 0 ? <div className="p-10 text-center text-slate-400 italic text-sm">{t.no_matches}</div> : adminUsers.map(u => <UserRow key={u.id} user={u} isStaffTable={false} />)}
                                    </div>
                                </div>

                                <div className={`${cardStyle} flex flex-col h-[380px]`}>
                                    <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>
                                    <div className="bg-slate-200/50 dark:bg-slate-800/80 p-3.5 flex justify-between items-center text-slate-800 dark:text-white shrink-0 font-black text-xs uppercase tracking-widest border-b border-slate-300 dark:border-slate-700 relative z-10">
                                        <div className="flex items-center gap-2"><User size={14}/> {t.internal_staff}</div>
                                        <span className="bg-white/40 dark:bg-white/10 px-2.5 py-0.5 rounded-full">{staffUsers.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                                        {staffUsers.length === 0 ? <div className="p-10 text-center text-slate-400 italic text-sm">{t.no_matches}</div> : staffUsers.map(u => <UserRow key={u.id} user={u} isStaffTable={true} />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCS TAB */}
                    {tab === 'docs' && (
                        <div className="space-y-6">
                            <form onSubmit={handleFileUpload} className={`${cardStyle} p-6 md:p-8 space-y-6`}>
                                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.doc_title}</label>
                                        <input className={inputStyle} placeholder="e.g. Employee Handbook" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.category}</label>
                                        <select className={`${inputStyle} appearance-none`} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                            <option value="HR">HR / Policies</option><option value="Safety">Safety / Warehouse</option><option value="IT">IT / Security</option><option value="General">General Manuals</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="border border-dashed border-slate-300 dark:border-white/20 p-10 rounded-3xl flex flex-col items-center justify-center bg-white/40 dark:bg-black/20 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer relative text-center shadow-inner z-10">
                                    <input id="file-upload" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedFile(e.target.files[0])} accept=".pdf,.docx,.doc,.txt" />
                                    <Upload className="text-amber-500 mb-3" size={28} />
                                    <p className="text-slate-800 dark:text-slate-200 text-sm font-bold tracking-wide">{selectedFile ? selectedFile.name : t.choose_file}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">{t.auto_embed_notice}</p>
                                </div>
                                <div className="relative z-10">
                                    <button className={primaryBtnStyle}><Cloud size={18}/> {t.upload_repo}</button>
                                </div>
                            </form>

                            <div className={`${cardStyle} overflow-hidden`}>
                                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="bg-slate-50 dark:bg-white/5 p-4 border-b border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t.stored_docs}</div>
                                    {data.docs.map(d => (
                                        <div key={d.id} className="p-4 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="bg-orange-50 dark:bg-orange-500/10 p-2.5 rounded-xl text-orange-600 dark:text-orange-500 border border-orange-200/50 dark:border-orange-500/20 shrink-0"><File size={18}/></div>
                                                <div className="overflow-hidden"><p className="font-bold truncate text-slate-800 dark:text-white tracking-tight">{d.title}</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{d.category} • {d.file_type}</p></div>
                                            </div>
                                            <button onClick={() => deleteItem('documents', d.id)} className="p-2 text-slate-400 hover:text-red-500 dark:hover:bg-white/5 rounded-xl transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                    {data.docs.length === 0 && <p className="p-8 text-center text-slate-500 italic text-sm">{t.no_matches}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- NEW SYSTEM ANALYTICS TAB --- */}
                    {tab === 'analytics' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold dark:text-white">{t.sys_analytics || 'System Health'}</h3>
                                <button
                                    onClick={loadData}
                                    disabled={isRefreshing}
                                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-amber-500 hover:text-blue-800 dark:hover:text-amber-400 transition-colors"
                                >
                                    <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} /> {t.refresh_stats || 'Refresh'}
                                </button>
                            </div>

                            {/* Top Metric Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`${cardStyle} p-6 flex flex-col items-center justify-center text-center`}>
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-4"><Users size={28}/></div>
                                    <h4 className="text-3xl font-black dark:text-white mb-1">{analytics.total_users}</h4>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.total_staff || 'Total Staff'}</p>
                                </div>
                                <div className={`${cardStyle} p-6 flex flex-col items-center justify-center text-center`}>
                                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4"><FileText size={28}/></div>
                                    <h4 className="text-3xl font-black dark:text-white mb-1">{analytics.total_docs}</h4>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.docs_indexed || 'Docs Indexed'}</p>
                                </div>
                                <div className={`${cardStyle} p-6 flex flex-col items-center justify-center text-center`}>
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl mb-4"><Database size={28}/></div>
                                    <h4 className="text-3xl font-black dark:text-white mb-1">{analytics.total_storage_mb} <span className="text-lg">MB</span></h4>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.storage_used || 'Storage Used'}</p>
                                </div>
                            </div>

                            {/* System Status Panel */}
                            <div className={`${cardStyle} p-6 md:p-8 space-y-6 mt-4`}>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/10 pb-3">{t.system_status || 'Live Status'}</h4>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <Database className="text-blue-500" size={24} />
                                            <div>
                                                <p className="font-bold dark:text-white">Neon PostgreSQL</p>
                                                <p className="text-xs text-slate-500">Vector Database Connection</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-emerald-100/50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t.operational || 'Online'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <Cloud className="text-orange-500" size={24} />
                                            <div>
                                                <p className="font-bold dark:text-white">Cloudflare R2</p>
                                                <p className="text-xs text-slate-500">Binary Object Storage</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-emerald-100/50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t.operational || 'Online'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <Cpu className="text-amber-500" size={24} />
                                            <div>
                                                <p className="font-bold dark:text-white">Google Gemini</p>
                                                <p className="text-xs text-slate-500">Generative AI & Embeddings</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-emerald-100/50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t.operational || 'Online'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE BOTTOM NAVIGATION BAR */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl saturate-150 border-t border-slate-200 dark:border-white/5 flex justify-around items-center z-40 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.1)] transition-colors h-16">
                {[ ['staff', Users, t.tab_accounts || 'Users'], ['docs', FileText, t.tab_docs || 'Files'], ['analytics', Activity, t.tab_analytics || 'Health'] ].map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${tab === id ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                        <Icon size={20} className={tab === id ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''} />
                        <span className="text-[9px] font-bold mt-1 tracking-wide uppercase">{label}</span>
                    </button>
                ))}
            </div>

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
                    <div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl saturate-150 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-white/10 p-8 max-h-[90vh] overflow-y-auto relative">
                        <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none"></div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight relative z-10">{t.modify_acc}</h3>
                        <form onSubmit={handleEditUser} className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.emp_name}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input className={inputStyle} value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} required placeholder={t.first_name} />
                                    <input className={inputStyle} value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} required placeholder={t.last_name} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.email}</h4>
                                <input className={inputStyle} value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required placeholder="john.d" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.security}</h4>
                                <input type="password" placeholder={t.new_pass_placeholder} className={inputStyle} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner backdrop-blur-sm">
                                <input id="promote" type="checkbox" checked={editForm.role === 'admin'} onChange={(e) => handleRoleToggle(e.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-500 bg-transparent" />
                                <div><label htmlFor="promote" className="font-bold text-sm dark:text-white">{t.admin_privileges}</label></div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-white/5">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">{t.cancel}</button>
                                <button type="submit" className={primaryBtnStyle + " w-auto px-8 py-2.5"}>{t.save_changes}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PASSWORD RESULT MODAL */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all">
                    <div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl saturate-150 rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full text-center border border-white/50 dark:border-white/10 relative">
                        <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none"></div>
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 mx-auto rounded-full flex items-center justify-center mb-6 border border-emerald-200 dark:border-emerald-500/20 shadow-inner relative z-10"><ShieldCheck size={40}/></div>
                        <h3 className="text-2xl font-black dark:text-white mb-2 uppercase tracking-tight relative z-10">{t.acc_ready}</h3>
                        <div className="bg-slate-50/50 dark:bg-black/20 p-5 rounded-2xl border border-slate-200 dark:border-white/10 mb-6 space-y-3 shadow-inner backdrop-blur-sm relative z-10">
                            <div className="text-left"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.email}</p><p className="font-mono font-bold text-slate-800 dark:text-white text-sm">{generatedPassword.email}</p></div>
                            <div className="text-left"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Password</p><p className="font-mono text-amber-600 dark:text-amber-500 font-bold text-lg break-all">{generatedPassword.password}</p></div>
                        </div>
                        <div className="flex gap-3 relative z-10">
                            <button onClick={() => { navigator.clipboard.writeText(`Safeway Access\nEmail: ${generatedPassword.email}\nPass: ${generatedPassword.password}`); alert(t.copy + '!'); }} className="flex-1 bg-slate-100 dark:bg-white/5 p-3 rounded-xl font-bold text-sm text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">{t.copy}</button>
                            <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-3 rounded-xl font-bold text-sm transition-colors hover:scale-[0.98]">{t.done}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ROLE CONFIRM MODAL */}
            {showPromoteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-all">
                    <div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl saturate-150 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border border-white/50 dark:border-white/10 relative">
                        <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pointer-events-none"></div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight relative z-10">{t.change_role}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 font-medium relative z-10">{t.switch_access} <span className="font-bold text-amber-600 dark:text-amber-500 uppercase">{pendingRole}</span>?</p>
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <button onClick={() => handlePromoteChoice(false)} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">{t.cancel}</button>
                            <button onClick={() => handlePromoteChoice(true)} className={primaryBtnStyle + " p-3"}>{t.confirm}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;