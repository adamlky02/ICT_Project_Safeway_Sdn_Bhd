import React, { useState, useRef, useEffect } from 'react';
import { Send, LogOut, User, Sun, Moon, Loader2 } from 'lucide-react';
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
    const [isLoading, setIsLoading] = useState(false);

    // Auto-scroll reference
    const messagesEndRef = useRef(null);

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

                if (!response.ok) throw new Error('Failed to load profile');

                const data = await response.json();
                setProfile(data);
            } catch (err) {
                console.error('Failed to load profile:', err);
            }
        };
        loadProfile();
    }, [navigate]);

    const userEmail = profile?.email || 'Loading...';

    // Auto-scroll to latest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileBtnRef.current && !profileBtnRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    // --- REAL AI CONNECTION LOGIC ---
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg.text }),
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, { sender: 'bot', text: data.message }]);
            } else {
                setMessages(prev => [...prev, { sender: 'bot', text: "Error: Could not reach the Safeway AI server." }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { sender: 'bot', text: "Network error. Is the backend running?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // h-[100dvh] forces exact 1-page fit on mobile, overflow-hidden stops bouncy scrolling
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans overflow-hidden">

            {/* TOP HEADER (Matches Admin Dashboard styling) */}
            <header className="h-14 md:h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-8 shadow-md z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-1.0 rounded-lg shrink-0 hidden sm:block">
                        <img src="/safewaylogo.png" alt="Logo" className="w-12 h-12 object-cover" />
                    </div>
                    {/* Changed text color to white */}
                    <h1 className="text-lg md:text-xl font-bold text-blue-400 tracking-wide">Safeway Assistant</h1>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <Sun size={20} className="text-amber-400"/> : <Moon size={20}/>}
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileBtnRef}>
                        <button
                            className="flex items-center gap-2 text-slate-200 hover:text-white hover:bg-slate-800 px-2 md:px-3 py-2 rounded-lg focus:outline-none transition-colors"
                            onClick={() => setDropdownOpen((v) => !v)}
                            aria-haspopup="true"
                            aria-expanded={dropdownOpen}
                        >
                            <User size={18} />
                            <span className="text-sm font-bold hidden md:block">{profile?.full_name || 'Safeway Staff'}</span>
                            <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-30 p-4 flex flex-col items-center transition-colors">
                                <div className="flex flex-col items-center w-full">
                                    <div className="w-14 h-14 rounded-full border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center mb-3 bg-slate-50 dark:bg-slate-900">
                                        <User size={28} className="text-slate-400" />
                                    </div>
                                    <div className="text-base font-bold text-slate-800 dark:text-white">{profile?.full_name || 'Staff Account'}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 truncate w-full text-center">{userEmail}</div>
                                </div>
                                <div className="w-full border-t border-slate-100 dark:border-slate-700 mb-2"></div>
                                <button
                                    className="w-full text-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-bold rounded-lg mb-1 transition-colors"
                                    onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                                >
                                    My Profile
                                </button>
                                <button
                                    className="w-full text-center py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                    onClick={() => { localStorage.clear(); setDropdownOpen(false); navigate('/'); }}
                                >
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MESSAGES AREA */}
            {/* flex-1 lets this section take remaining space. overflow-y-auto enables scrolling ONLY here */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-2xl px-4 md:px-5 py-3 rounded-2xl shadow-sm text-sm md:text-[15px] leading-relaxed transition-colors duration-300 whitespace-pre-wrap ${
                            msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {/* Thinking Animation */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm text-sm">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="italic">Assistant is checking manuals...</span>
                        </div>
                    </div>
                )}
                {/* Invisible element to auto-scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA (Fixed at bottom naturally by flex layout) */}
            <div className="p-3 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300 shrink-0">
                <div className="max-w-4xl mx-auto flex gap-2 md:gap-4 items-center">
                    <input
                        type="text"
                        className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 md:py-3.5 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors duration-300 text-sm md:text-base disabled:opacity-50"
                        placeholder="Ask me a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="bg-blue-600 text-white p-3 md:px-6 md:py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center shrink-0 disabled:bg-blue-400"
                    >
                        <Send size={20} className="md:mr-2" />
                        <span className="hidden md:inline font-bold">Send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;