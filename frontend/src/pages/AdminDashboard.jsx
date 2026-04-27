import React, { useState, useEffect } from 'react';
import { UserPlus, FilePlus, Trash2, Users, FileText, LogOut, Upload, File, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('staff');
    const [data, setData] = useState({ users: [], docs: [] });
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: '', username: '', password: '' });

    // State for file upload
    const [selectedFile, setSelectedFile] = useState(null);
    const [form, setForm] = useState({
        username: '',
        full_name: '',
        title: '',
        category: 'HR'
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const uRes = await fetch("http://localhost:8000/api/admin/users");
            const dRes = await fetch("http://localhost:8000/api/admin/documents");

            const u = uRes.ok ? await uRes.json() : [];
            const d = dRes.ok ? await dRes.json() : [];

            // CRITICAL FIX: Ensure they are arrays so .map() doesn't crash the page
            setData({
                users: Array.isArray(u) ? u : [],
                docs: Array.isArray(d) ? d : []
            });
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:8000/api/admin/users", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    username: form.username,
                    full_name: form.full_name
                })
            });
            if (res.ok) {
                setForm({...form, username: '', full_name: ''});
                loadData();
                alert("Staff account created!");
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
            password: ''
        });
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: editForm.full_name,
                    username: editForm.username,
                    password: editForm.password
                })
            });

            if (res.ok) {
                alert('Staff account updated!');
                setEditingUser(null);
                setEditForm({ full_name: '', username: '', password: '' });
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
            const res = await fetch("http://localhost:8000/api/admin/upload", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                alert("Document uploaded successfully!");
                setForm({...form, title: ''});
                setSelectedFile(null);
                // Reset the actual HTML file input
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
            await fetch(`http://localhost:8000/api/admin/${endpoint}/${id}`, { method: "DELETE" });
            loadData();
        } catch (err) {
            alert("Failed to delete item.");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white p-6 flex flex-col">
                <h1 className="text-xl font-bold mb-8 text-blue-400 flex items-center gap-2">
                    <Upload size={24} /> Safeway Admin
                </h1>
                <div className="space-y-2 flex-1">
                    <button
                        onClick={() => setTab('staff')}
                        className={`w-full flex items-center p-3 rounded transition ${tab === 'staff' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}
                    >
                        <Users className="mr-2" size={20}/> Staff Accounts
                    </button>
                    <button
                        onClick={() => setTab('docs')}
                        className={`w-full flex items-center p-3 rounded transition ${tab === 'docs' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}
                    >
                        <FileText className="mr-2" size={20}/> Document Repository
                    </button>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center text-red-400 p-3 mt-auto hover:bg-red-900/20 rounded transition"
                >
                    <LogOut className="mr-2" size={20}/> Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-10 overflow-y-auto">
                {tab === 'staff' ? (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800">Staff Account Management</h2>
                        <form onSubmit={handleAddUser} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-slate-600">Full Name</label>
                                <input className="border p-2 rounded outline-blue-500" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-slate-600">Username (@safeway.com)</label>
                                <input className="border p-2 rounded outline-blue-500" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded col-span-2 font-bold transition flex items-center justify-center gap-2 mt-2">
                                <UserPlus size={20}/> Create Staff Account
                            </button>
                        </form>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 p-4 border-b font-bold text-slate-700 flex justify-between">
                                <span>Employee Details</span>
                                <span>Action</span>
                            </div>
                            {data.users.filter(u => u.role === 'staff').map(u => (
                                <div key={u.id} className="p-4 border-b flex justify-between items-center hover:bg-blue-50/30 transition">
                                    <div>
                                        <p className="font-bold text-slate-800">{u.full_name}</p>
                                        <p className="text-sm text-slate-500">{u.email}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditUser(u)}
                                            className="text-blue-500 hover:bg-blue-50 p-2 rounded transition"
                                            aria-label="Edit user"
                                            title="Edit"
                                        >
                                            <Pencil size={20}/>
                                        </button>
                                        <button onClick={() => deleteItem('users', u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition" aria-label="Delete user" title="Delete">
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {editingUser && (
                            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                                <div className="bg-white w-full max-w-xl rounded-xl shadow-lg border border-slate-200 p-6">
                                    <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Staff Account</h3>
                                    <form onSubmit={handleEditUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex flex-col gap-1 md:col-span-3">
                                            <label className="text-sm font-semibold text-slate-600">Full Name</label>
                                            <input
                                                className="border p-2 rounded outline-blue-500"
                                                value={editForm.full_name}
                                                onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-sm font-semibold text-slate-600">Username (@safeway.com)</label>
                                            <input
                                                className="border p-2 rounded outline-blue-500"
                                                value={editForm.username}
                                                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 md:col-span-1">
                                            <label className="text-sm font-semibold text-slate-600">Password</label>
                                            <input
                                                type="password"
                                                className="border p-2 rounded outline-blue-500"
                                                value={editForm.password}
                                                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                                placeholder="Leave blank to keep"
                                            />
                                        </div>
                                        <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingUser(null);
                                                    setEditForm({ full_name: '', username: '', password: '' });
                                                }}
                                                className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 text-slate-800">Knowledge Base Management</h2>
                        <form onSubmit={handleFileUpload} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-600">Document Title</label>
                                    <input className="border p-2 rounded outline-blue-500" placeholder="e.g. Employee Handbook" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-600">Category</label>
                                    <select className="border p-2 rounded bg-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                        <option value="HR">HR / Policies</option>
                                        <option value="Safety">Safety / Warehouse</option>
                                        <option value="IT">IT / Security</option>
                                        <option value="General">General Manuals</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 p-8 rounded-lg flex flex-col items-center justify-center bg-slate-50 hover:border-blue-400 transition cursor-pointer relative">
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                    accept=".pdf,.docx,.doc,.txt"
                                />
                                <Upload className="text-blue-500 mb-2" size={32} />
                                <p className="text-slate-700 font-medium">
                                    {selectedFile ? selectedFile.name : "Click or Drag file to upload"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Supports PDF, Word, and Text files</p>
                            </div>

                            <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg w-full font-bold transition flex items-center justify-center gap-2 shadow-md">
                                <FilePlus size={20}/> Upload to Knowledge Base
                            </button>
                        </form>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 p-4 border-b font-bold text-slate-700">Stored Documents</div>
                            {data.docs.length === 0 ? (
                                <p className="p-8 text-center text-slate-400 italic">No documents uploaded yet.</p>
                            ) : (
                                data.docs.map(d => (
                                    <div key={d.id} className="p-4 border-b flex justify-between items-center hover:bg-green-50/30 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded text-blue-600"><File size={20}/></div>
                                            <div>
                                                <p className="font-bold text-slate-800">{d.title}</p>
                                                <p className="text-xs text-slate-500 uppercase font-semibold">{d.category} • {d.file_type}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteItem('docs', d.id)} className="text-red-400 hover:text-red-600 p-2 transition">
                                            <Trash2 size={20}/>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;