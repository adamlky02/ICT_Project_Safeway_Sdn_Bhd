import React, { useState, useRef, useEffect } from 'react';
import { Send, LogOut, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ChatPage = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! I am the Safeway Internal Assistant. You can ask me questions about HR policies, handbooks, or company procedures.' }
    ]);
    const [input, setInput] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const profileBtnRef = useRef(null);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const userDataStr = localStorage.getItem('userData');
                if (!userDataStr) {
                    navigate('/login');
                    return;
                }

                const userData = JSON.parse(userDataStr);
                const response = await fetch(`${API_URL}/api/profile/${userData.id}`);

                if (!response.ok) {
                    throw new Error('Failed to load profile');
                }

                const data = await response.json();
                setProfile(data);
            } catch (err) {
                console.error('Failed to load profile:', err);
            }
        };

        loadProfile();
    }, [navigate]);

    // Get user email from profile or fallback
    const userEmail = profile?.email || 'Loading...';

    // Close dropdown when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event) {
            if (profileBtnRef.current && !profileBtnRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = { sender: 'user', text: input };
        setMessages([...messages, userMsg]);
        setInput('');

        // Simulate AI Response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: 'Prototype Mode: I am currently being integrated with Safeway documents. Soon, I will use AI to answer this specifically from your manuals.'
            }]);
        }, 800);
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b flex items-center justify-between px-8">
                    <div><h1 className="text-xl font-bold text-blue-400">Safeway Assistant</h1></div>
                    <div className="relative" ref={profileBtnRef}>
                        <button
                            className="flex items-center gap-2 text-slate-600 hover:bg-slate-100 px-3 py-1 rounded-lg focus:outline-none"
                            onClick={() => setDropdownOpen((v) => !v)}
                            aria-haspopup="true"
                            aria-expanded={dropdownOpen}
                        >
                            <User size={18} />
                            <span className="text-sm font-medium">Safeway Staff</span>
                            <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4 flex flex-col items-center">
                                <div className="flex flex-col items-center w-full">
                                    <div className="w-16 h-16 rounded-full border-2 border-slate-300 flex items-center justify-center mb-2">
                                        <User size={40} className="text-slate-400" />
                                    </div>
                                    <div className="text-base font-semibold text-slate-700">Staff</div>
                                    <div className="text-sm text-slate-600 mb-3">{userEmail}</div>
                                </div>
                                <button
                                    className="w-full text-center py-1 text-base text-blue-600 hover:bg-blue-50 font-medium rounded mb-2"
                                    onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                                >
                                    Profile
                                </button>
                                <button
                                    className="w-full text-center py-1 text-base text-red-500 hover:bg-red-50 font-semibold rounded"
                                    onClick={() => { setDropdownOpen(false); navigate('/'); }}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-2xl px-5 py-3 rounded-2xl shadow-sm ${
                                msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-6 bg-white border-t">
                    <div className="max-w-4xl mx-auto flex gap-4">
                        <input
                            type="text"
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                            placeholder="Ask me about company rules..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;