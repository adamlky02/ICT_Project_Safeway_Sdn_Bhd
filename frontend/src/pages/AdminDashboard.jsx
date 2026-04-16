import React, { useState, useEffect } from 'react';
import { UserPlus, FilePlus, Trash2, Users, FileText, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('staff');
    const [data, setData] = useState({ users: [], docs: [] });
    const [form, setForm] = useState({ username: '', password: '', full_name: '', title: '', content: '', category: 'HR' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const u = await fetch("http://localhost:8000/api/admin/users").then(r => r.json());
        const d = await fetch("http://localhost:8000/api/admin/documents").then(r => r.json());
        setData({ users: u, docs: d });
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        await fetch("http://localhost:8000/api/admin/users", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify(form)
        });
        setForm({...form, username: '', password: '', full_name: ''});
        loadData();
    };

    const handleAddDoc = async (e) => {
        e.preventDefault();
        const adminId = JSON.parse(localStorage.getItem("userData")).id;
        await fetch("http://localhost:8000/api/admin/documents", {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({...form, admin_id: adminId})
        });
        setForm({...form, title: '', content: ''});
        loadData();
    };

    const deleteItem = async (type, id) => {
        await fetch(`http://localhost:8000/api/admin/${type}/${id}`, { method: "DELETE" });
        loadData();
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <div className="w-64 bg-slate-900 text-white p-6 flex flex-col">
                <h1 className="text-xl font-bold mb-8 text-blue-400">Safeway Admin</h1>
                <div className="space-y-2 flex-1">
                    <button onClick={() => setTab('staff')} className={`w-full flex p-3 rounded ${tab === 'staff' ? 'bg-blue-600' : ''}`}><Users className="mr-2"/> Staff</button>
                    <button onClick={() => setTab('docs')} className={`w-full flex p-3 rounded ${tab === 'docs' ? 'bg-blue-600' : ''}`}><FileText className="mr-2"/> Knowledge</button>
                </div>
                <button onClick={() => navigate('/')} className="flex text-red-400 p-3 mt-auto"><LogOut className="mr-2"/> Logout</button>
            </div>

            <div className="flex-1 p-10 overflow-y-auto">
                {tab === 'staff' ? (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Staff Management</h2>
                        <form onSubmit={handleAddUser} className="bg-white p-6 rounded-xl shadow mb-8 grid grid-cols-3 gap-4">
                            <input placeholder="Full Name" className="border p-2 rounded" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                            <input placeholder="Username (prefix)" className="border p-2 rounded" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                            <input type="password" placeholder="Password" className="border p-2 rounded" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                            <button className="bg-blue-600 text-white p-2 rounded col-span-3">Add Staff Account</button>
                        </form>
                        <div className="bg-white rounded shadow">
                            {data.users.map(u => (
                                <div key={u.id} className="p-4 border-b flex justify-between items-center">
                                    <div><p className="font-bold">{u.full_name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                                    <button onClick={() => deleteItem('users', u.id)} className="text-red-500"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Knowledge Base</h2>
                        <form onSubmit={handleAddDoc} className="bg-white p-6 rounded-xl shadow mb-8 space-y-4">
                            <input placeholder="Manual Title" className="w-full border p-2 rounded" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                            <textarea placeholder="Content..." className="w-full border p-2 rounded h-32" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
                            <button className="bg-green-600 text-white p-2 rounded w-full">Upload to Knowledge Base</button>
                        </form>
                        <div className="bg-white rounded shadow">
                            {data.docs.map(d => (
                                <div key={d.id} className="p-4 border-b flex justify-between items-center">
                                    <p className="font-bold">{d.title}</p>
                                    <button onClick={() => deleteItem('documents', d.id)} className="text-red-500"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;