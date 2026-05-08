import React, { useState, useRef, useEffect } from 'react';
import { Send, LogOut, FileText, User, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ChatPage = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! I am the Safeway Internal Assistant. You can ask me questions about HR policies, handbooks, or company procedures.' }
    ]);
    const[input, setInput] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const profileBtnRef = useRef(null);
    const [profile, setProfile] = useState(null);

    // --- DARK MODE LOGIC ---
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

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

    // --- PROFILE LOGIC ---
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
            setMessages(prev =>[...prev, {
                sender: 'bot',
                text: 'Prototype Mode: I am currently being integrated with Safeway documents. Soon, I will use AI to answer this specifically from your manuals.'
            }]);
        }, 800);
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 md:px-8 transition-colors duration-300 z-10">
                    <div>
                        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Safeway Assistant</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDarkMode ? <Sun size={20} className="text-amber-400"/> : <Moon size={20}/>}
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileBtnRef}>
                            <button
                                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg focus:outline-none transition-colors"
                                onClick={() => setDropdownOpen((v) => !v)}
                                aria-haspopup="true"
                                aria-expanded={dropdownOpen}
                            >
                                <User size={18} />
                                <span className="text-sm font-medium hidden md:block">Safeway Staff</span>
                                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 p-4 flex flex-col items-center transition-colors">
                                    <div className="flex flex-col items-center w-full">
                                        <div className="w-16 h-16 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center mb-3 bg-slate-50 dark:bg-slate-900 transition-colors">
                                            <User size={32} className="text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <div className="text-base font-bold text-slate-800 dark:text-white">Staff Account</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 truncate w-full text-center">{userEmail}</div>
                                    </div>
                                    <div className="w-full border-t border-slate-100 dark:border-slate-700 mb-2"></div>
                                    <button
                                        className="w-full text-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold rounded-lg mb-1 transition-colors"
                                        onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                                    >
                                        My Profile
                                    </button>
                                    <button
                                        className="w-full text-center py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                        onClick={() => { setDropdownOpen(false); navigate('/'); }}
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-2xl px-5 py-3.5 rounded-2xl shadow-sm text-[15px] leading-relaxed transition-colors duration-300 ${
                                msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
                    <div className="max-w-4xl mx-auto flex gap-3 md:gap-4">
                        <input
                            type="text"
                            className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors duration-300"
                            placeholder="Ask me about company rules..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            className="bg-blue-600 text-white px-4 md:px-5 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center shrink-0"
                        >
                            <Send size={20} className="md:mr-1" />
                            <span className="hidden md:inline font-semibold">Send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;