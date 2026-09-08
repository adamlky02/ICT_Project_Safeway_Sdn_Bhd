import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getStoredUser, readJson } from '../api/client';
import {
    deleteSession,
    fetchSessionDetail,
    fetchUserSessions,
    updateSessionTitle,
} from '../api/chatHistory';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatHistorySidebar } from '../components/chat/ChatHistorySidebar';
import { ChatMessages } from '../components/chat/ChatMessages';
import { DocumentDrawer } from '../components/chat/DocumentDrawer';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type {
    ChatHistoryItem,
    ChatMessage,
    ChatResponse,
    ChatSessionSummary,
    DocumentSource,
    UserProfile,
    UserRole,
} from '../types';

// Chat Page (manages the authenticated conversation and its retrieved document evidence)
const ChatPage = () => {
    // Chat State (tracks display settings, conversation, account menu, requests, and source preview)
    const navigate = useNavigate();
    const { lang, t, toggleLanguage } = useLanguage();
    const { isDarkMode, toggleTheme } = useTheme({ broadcastChanges: true });
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            sender: 'bot',
            text: t.chat_initial_msg || 'System Initialized. I am the Safeway Internal Assistant.',
            isDefault: true,
            sources: [],
        },
    ]);
    const [input, setInput] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>('staff');
    const [drawerSource, setDrawerSource] = useState<DocumentSource | null>(null);

    // Chat History & Session State
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));

    const profileButtonRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load Sessions from Database
    const loadSessions = async (userId: string, autoSelectLatest: boolean = false) => {
        setIsLoadingSessions(true);
        try {
            const list = await fetchUserSessions(userId);
            setSessions(list);
            if (autoSelectLatest && list.length > 0 && !currentSessionId) {
                await handleSelectSession(list[0].id);
            }
        } catch (error) {
            console.warn('Failed to load chat sessions:', error);
        } finally {
            setIsLoadingSessions(false);
        }
    };

    // Select and Switch to an Existing Session
    const handleSelectSession = async (sessionId: string) => {
        const user = getStoredUser();
        if (!user?.id) return;
        try {
            const detail = await fetchSessionDetail(sessionId, user.id);
            setCurrentSessionId(sessionId);
            if (detail.messages && detail.messages.length > 0) {
                setMessages(detail.messages.map((m) => ({
                    sender: m.sender,
                    text: m.content,
                    sources: m.sources || [],
                })));
            } else {
                setMessages([
                    {
                        sender: 'bot',
                        text: t.chat_initial_msg || 'System Initialized. I am the Safeway Internal Assistant.',
                        isDefault: true,
                        sources: [],
                    },
                ]);
            }
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            }
        } catch (error) {
            console.error('Failed to load session messages:', error);
        }
    };

    // Start a Fresh New Chat
    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([
            {
                sender: 'bot',
                text: t.chat_initial_msg || 'System Initialized. I am the Safeway Internal Assistant.',
                isDefault: true,
                sources: [],
            },
        ]);
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    // Delete a Chat Session
    const handleDeleteSession = async (sessionId: string) => {
        const user = getStoredUser();
        if (!user?.id) return;
        try {
            await deleteSession(sessionId, user.id);
            if (currentSessionId === sessionId) {
                handleNewChat();
            }
            await loadSessions(user.id, false);
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    };

    // Rename a Chat Session
    const handleRenameSession = async (sessionId: string, newTitle: string) => {
        const user = getStoredUser();
        if (!user?.id) return;
        try {
            await updateSessionTitle(sessionId, user.id, newTitle);
            await loadSessions(user.id, false);
        } catch (error) {
            console.error('Failed to rename session:', error);
        }
    };

    // Welcome Translation (updates only the untouched default message when language changes)
    useEffect(() => {
        setMessages((currentMessages) => currentMessages.map((message, index) => (
            index === 0 && message.isDefault
                ? { ...message, text: t.chat_initial_msg || 'System Initialized. I am the Safeway Internal Assistant.' }
                : message
        )));
    }, [t.chat_initial_msg]);

    // Profile & Sessions Loading
    useEffect(() => {
        const loadProfileAndHistory = async () => {
            try {
                const user = getStoredUser();
                if (!user) {
                    navigate('/login');
                    return;
                }

                setUserRole(user.role);
                const response = await fetch(`${API_URL}/api/profile/${user.id}`);
                if (!response.ok) {
                    throw new Error('Failed to load profile');
                }
                setProfile(await readJson<UserProfile>(response));
                void loadSessions(user.id, true);
            } catch (error) {
                console.error('Failed to load profile or history:', error);
            }
        };

        void loadProfileAndHistory();
    }, [navigate]);

    // Conversation Scrolling (keeps the newest message or loading indicator visible)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Account Menu Dismissal (closes the dropdown when the user clicks elsewhere)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileButtonRef.current && !profileButtonRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    // Chat Submission (sends recent history, appends the grounded reply, and supports cancellation)
    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) {
            return;
        }

        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages((current) => [...current, userMessage]);
        setInput('');
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
            const conversationHistory: ChatHistoryItem[] = messages.slice(-10).map((message) => ({
                role: message.sender === 'user' ? 'user' : 'assistant',
                content: message.text,
            }));
            const user = getStoredUser();
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.text,
                    history: conversationHistory,
                    user_id: user?.id,
                    session_id: currentSessionId,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (response.ok) {
                const data = await readJson<ChatResponse>(response);
                if (data.session_id) {
                    setCurrentSessionId(data.session_id);
                }
                setMessages((current) => [...current, {
                    sender: 'bot',
                    text: data.message || 'No response generated.',
                    sources: data.sources || [],
                }]);

                if (user?.id) {
                    void loadSessions(user.id, false);
                }
            } else {
                setMessages((current) => [...current, { sender: 'bot', text: t.chat_error_timeout || 'Error: Connection timed out.' }]);
            }
        } catch (error) {
            const wasAborted = error instanceof DOMException && error.name === 'AbortError';
            setMessages((current) => [...current, {
                sender: 'bot',
                text: wasAborted ? 'Query stopped by user.' : (t.chat_error_network || 'Network error.'),
            }]);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    // Menu Navigation (closes account actions before changing pages)
    const closeDropdownAndNavigate = (path: string) => {
        setDropdownOpen(false);
        navigate(path);
    };

    // Chat Logout (clears the browser session and returns to the landing page)
    const handleLogout = () => {
        localStorage.clear();
        setDropdownOpen(false);
        navigate('/');
    };

    return (
        <m.div
            className="fixed inset-0 flex h-[100dvh] min-h-[100svh] w-full min-w-0 flex-col overflow-hidden bg-slate-50 font-sans transition-colors duration-300 dark:bg-[#0a0a0a]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Workspace Background (adds restrained visual depth behind the conversation) */}
            <EngineeringBackground />

            {/* Chat Header (provides branding, history toggle, controls, and account menu) */}
            <ChatHeader
                lang={lang}
                t={t}
                isDarkMode={isDarkMode}
                profile={profile}
                userRole={userRole}
                dropdownOpen={dropdownOpen}
                profileButtonRef={profileButtonRef}
                onLanguageToggle={toggleLanguage}
                onThemeToggle={toggleTheme}
                onDropdownToggle={() => setDropdownOpen((current) => !current)}
                onProfile={() => closeDropdownAndNavigate('/profile')}
                onAdminDashboard={() => closeDropdownAndNavigate('/admin')}
                onLogout={handleLogout}
                onToggleSidebar={() => setSidebarOpen((curr) => !curr)}
                onNewChat={handleNewChat}
            />

            {/* Workspace Main (History Sidebar + Conversation Workspace) */}
            <div className="relative flex flex-1 w-full min-h-0 overflow-hidden">
                <ChatHistorySidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    sessions={sessions}
                    activeSessionId={currentSessionId}
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                    onDeleteSession={handleDeleteSession}
                    onRenameSession={handleRenameSession}
                    isLoading={isLoadingSessions}
                />

                <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
                    {/* Conversation Feed (shows messages, sources, and request progress) */}
                    <ChatMessages
                        messages={messages}
                        isLoading={isLoading}
                        t={t}
                        messagesEndRef={messagesEndRef}
                        onOpenSource={setDrawerSource}
                    />

                    {/* Message Composer (collects, sends, or cancels the current question) */}
                    <ChatComposer
                        input={input}
                        isLoading={isLoading}
                        language={lang}
                        t={t}
                        onInputChange={setInput}
                        onSend={() => void handleSend()}
                        onStop={() => abortControllerRef.current?.abort()}
                    />
                </div>
            </div>

            {/* Source Drawer (previews the document excerpt grounding a selected response) */}
            <DocumentDrawer source={drawerSource} onClose={() => setDrawerSource(null)} />
        </m.div>
    );
};

export default ChatPage;
