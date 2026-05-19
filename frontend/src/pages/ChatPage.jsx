import React, { useState, useRef, useEffect } from 'react';
import { Send, LogOut, User, Sun, Moon, Loader2, Globe, FileText, ChevronDown, ChevronUp, UserCircle2, X, Search, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { translations } from '../translations';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ChatPage = () => {
    const navigate = useNavigate();
    const [lang, setLang] = useState(() => localStorage.getItem('language') || 'en');
    const t = translations[lang] || translations['en'] || {};

    const toggleLanguage = () => {
        const nextLang = lang === 'en' ? 'ms' : lang === 'ms' ? 'zh' : 'en';
        setLang(nextLang);
        localStorage.setItem('language', nextLang);
    };

    const [messages, setMessages] = useState([
        { sender: 'bot', text: t.chat_initial_msg || 'System Initialized. I am the Safeway Internal Assistant.', isDefault: true, sources: [] }
    ]);
    const [input, setInput] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const profileBtnRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // --- STOP BUTTON LOGIC (Abort Controller) ---
    const abortControllerRef = useRef(null);

    // --- DRAWER STATE ---
    const [drawerSource, setDrawerSource] = useState(null);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs.length > 0 && newMsgs[0].isDefault) newMsgs[0].text = t.chat_initial_msg || 'System Initialized.';
            return newMsgs;
        });
    }, [lang, t.chat_initial_msg]);

    // CORRECT (Always forces Light Mode on initial load, but respects it if navigating between pages in the same session)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const sessionTheme = sessionStorage.getItem('theme');
        return sessionTheme === 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            sessionStorage.setItem('theme', 'dark'); // Save to session, not local
        } else {
            root.classList.remove('dark');
            sessionStorage.setItem('theme', 'light'); // Save to session, not local
        }
    }, [isDarkMode]);

    // --- PROFILE LOGIC ---
    // NEW: We need to know if the user is an admin to show the button
    const [userRole, setUserRole] = useState('staff');

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const userDataStr = localStorage.getItem('userData');
                if (!userDataStr) {
                    navigate('/login');
                    return;
                }

                const userData = JSON.parse(userDataStr);
                setUserRole(userData.role); // <-- Set the role so React knows if they are an admin

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

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileBtnRef.current && !profileBtnRef.current.contains(event.target)) setDropdownOpen(false);
        }
        if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    // --- REAL AI CONNECTION LOGIC WITH ABORT CONTROLLER ---
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Initialize a new abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg.text }),
                signal: abortControllerRef.current.signal // Attach the abort signal
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, { sender: 'bot', text: data.message || "No response generated.", sources: data.sources || [] }]);
            } else {
                setMessages(prev => [...prev, { sender: 'bot', text: t.chat_error_timeout || "Error: Connection timed out." }]);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setMessages(prev => [...prev, { sender: 'bot', text: "Query stopped by user." }]);
            } else {
                setMessages(prev => [...prev, { sender: 'bot', text: t.chat_error_network || "Network error." }]);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null; // Clear the controller
        }
    };

    // --- STOP REQUEST LOGIC ---
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const formatMessage = (text) => {
        if (!text) return null;
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-amber-700 dark:text-amber-500">{part.slice(2, -2)}</strong>;
            }
            return part.replace(/^\* /gm, '• ');
        });
    };

    const getPdfSearchHash = (content) => {
        if (!content) return "";
        const snippet = content.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, '');
        return `#search=${encodeURIComponent(snippet)}`;
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-300 font-sans overflow-hidden relative">

            {/* Background Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-40 dark:opacity-60 transition-opacity duration-700"></div>
            <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none z-0 transition-colors duration-700"></div>

            {/* HEADER */}
            <header className="h-14 md:h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Clean, borderless floating logo */}
                    <img
                        src={isDarkMode ? "/safewaylogo.png" : "/safewaylogoblack.png"}
                        alt="Logo"
                        className="w-18 h-18 md:w-20 md:h-20 object-contain dark:mix-blend-screen mix-blend-multiply shrink-0 hidden sm:block drop-shadow-sm transition-transform duration-500 hover:scale-105"
                    />
                    <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                        {t.chat_title}
                    </h1>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <button onClick={toggleLanguage} className="p-2 rounded-full bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:scale-105 transition-all flex items-center font-bold text-xs uppercase">
                        <Globe size={18} className="md:mr-1 text-blue-500" /><span className="hidden md:block">{lang}</span>
                    </button>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:scale-105 transition-all">
                        {isDarkMode ? <Sun size={18} className="text-amber-500"/> : <Moon size={18}/>}
                    </button>

                    <div className="relative" ref={profileBtnRef}>
                        <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white/80 px-3 py-2 rounded-xl transition-all">
                            <User size={18} className="text-amber-600 dark:text-amber-500" />
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-3 w-64 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-3xl saturate-150 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 p-6 flex flex-col items-center">
                                <div className="text-lg font-black text-slate-800 dark:text-white mt-2">{profile?.full_name}</div>
                                <div className="text-xs font-medium text-slate-500 mb-5">{userEmail}</div>
                                <button onClick={() => { setDropdownOpen(false); navigate('/profile'); }} className="w-full flex items-center justify-center gap-2 py-3 mb-3 text-sm text-slate-700 dark:text-slate-200 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold rounded-xl transition-all hover:bg-amber-200">
                                    <User size={16} /> {t.profile || 'Profile'}
                                </button>
                                {/* --- NEW: CONDITIONAL ADMIN DASHBOARD BUTTON --- */}
                                {userRole === 'admin' && (
                                    <button
                                        className="w-full flex items-center justify-center gap-2 py-3 mb-3 text-sm text-slate-700 dark:text-slate-200 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold rounded-xl transition-all hover:bg-blue-200"
                                        onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                                    >
                                        {t.admin_dash_btn || "Admin Dashboard"}
                                    </button>
                                )}
                                <button onClick={() => { localStorage.clear(); navigate('/'); }} className="w-full flex items-center justify-center gap-2 py-3 mb-3 text-sm text-slate-700 dark:text-slate-200 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold rounded-xl transition-all hover:bg-red-200">
                                    <LogOut size={16} /> {t.disconnect || "Logout"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 z-10 relative custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] md:max-w-2xl px-5 md:px-6 py-4 rounded-3xl shadow-md text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap flex flex-col ${
                            msg.sender === 'user'
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-200 font-medium rounded-tr-sm shadow-amber-500/20'
                                : 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]'
                        }`}>

                            <div className={msg.sender === 'bot' ? "space-y-3" : ""}>
                                {msg.sender === 'bot' ? (
                                    <ReactMarkdown components={{ p: ({node, ...props}) => <p {...props} />, strong: ({node, ...props}) => <strong className="font-black text-amber-700 dark:text-amber-500 tracking-wide" {...props} />, ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 my-3 marker:text-amber-500" {...props} /> }}>
                                        {msg.text || ''}
                                    </ReactMarkdown>
                                ) : ( msg.text )}
                            </div>

                            {/* --- SOURCE CITATION CHIPS --- */}
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 w-full flex flex-wrap gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mr-1">Sources:</span>
                                    {msg.sources.map((src, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => setDrawerSource(src)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-colors uppercase tracking-widest shadow-sm"
                                        >
                                            <FileText size={12} />
                                            [{sIdx + 1}] {src.title.substring(0, 15)}...
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md text-amber-600 border border-slate-200 dark:border-white/5 px-6 py-4 rounded-3xl rounded-tl-sm flex items-center gap-3 shadow-md text-sm font-bold tracking-wide">
                            <Loader2 className="animate-spin" size={18} />
                            <span>{t.chat_thinking || 'Querying database...'}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* --- INPUT AREA WITH STOP BUTTON --- */}
            <div className="p-4 md:p-6 bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 transition-colors duration-500 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-center relative">
                    <input
                        type="text"
                        className="flex-1 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 md:py-4 focus:ring-2 focus:ring-amber-500/50 outline-none bg-white/50 dark:bg-black/40 text-slate-900 dark:text-white placeholder-slate-400 shadow-inner backdrop-blur-sm"
                        placeholder={t.chat_input_placeholder || 'Ask a question...'}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                    />

                    {/* --- DYNAMIC SEND / STOP BUTTON --- */}
                    {isLoading ? (
                        <button
                            onClick={handleStop}
                            className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30 p-3.5 md:px-6 md:py-4 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all shadow-md flex items-center justify-center shrink-0 active:scale-[0.96]"
                        >
                            <XCircle size={20} className="md:mr-2" />
                            <span className="hidden md:inline uppercase tracking-widest text-xs">Stop</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleSend}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-200 p-3.5 md:px-8 md:py-4 rounded-2xl font-black hover:from-amber-400 shadow-lg active:scale-[0.96] flex items-center justify-center shrink-0 disabled:opacity-50"
                        >
                            <Send size={20} className="md:mr-2" />
                            <span className="hidden md:inline uppercase tracking-widest text-xs">{t.chat_btn_send || 'Send'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* --- DOCUMENT PREVIEW DRAWER (SLIDING SIDEBAR) --- */}
            <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${drawerSource ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Dark Backdrop (Click to close) */}
                <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setDrawerSource(null)}></div>

                {/* The Drawer Panel */}
                <div className={`relative w-full max-w-md md:max-w-xl h-full bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col transform transition-transform duration-500 border-l border-slate-200 dark:border-white/10 ${drawerSource ? 'translate-x-0' : 'translate-x-full'}`}>

                    {/* Drawer Header */}
                    <div className="p-4 md:p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 shrink-0">
                                <FileText size={24} />
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="font-black text-slate-800 dark:text-white text-lg truncate tracking-tight">{drawerSource?.title}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">{drawerSource?.category}</p>
                            </div>
                        </div>
                        <button onClick={() => setDrawerSource(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-full transition-colors shrink-0">
                            <X size={20}/>
                        </button>
                    </div>

                    {/* Extracted Text Insight */}
                    <div className="p-5 border-b border-amber-200 dark:border-amber-900/30 bg-amber-50/80 dark:bg-amber-900/10 shrink-0">
                        <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-500">
                            <Search size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">AI Extraction Highlight</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic border-l-[3px] border-amber-400 dark:border-amber-500 pl-4 max-h-32 overflow-y-auto custom-scrollbar">
                            "{drawerSource?.content}"
                        </p>
                    </div>

                    {/* PDF Viewer (iframe) */}
                    <div className="flex-1 bg-slate-200 dark:bg-slate-950 relative w-full h-full">
                        {drawerSource?.file_path?.endsWith('.pdf') ? (
                            <iframe
                                src={`${API_URL}/api/files/${drawerSource.file_path}${getPdfSearchHash(drawerSource.content)}`}
                                className="absolute inset-0 w-full h-full border-none"
                                title="Document Viewer"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-8 text-center">
                                <FileText size={48} className="mb-4 opacity-50" />
                                <p className="font-bold">Preview not available.</p>
                                <p className="text-xs mt-2">Only PDF files can be previewed directly in the terminal.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ChatPage;