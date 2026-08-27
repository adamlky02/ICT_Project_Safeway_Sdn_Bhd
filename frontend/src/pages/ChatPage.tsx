import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getStoredUser, readJson } from '../api/client';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatMessages } from '../components/chat/ChatMessages';
import { DocumentDrawer } from '../components/chat/DocumentDrawer';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type { ChatHistoryItem, ChatMessage, ChatResponse, DocumentSource, UserProfile, UserRole } from '../types';

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
    const profileButtonRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Welcome Translation (updates only the untouched default message when language changes)
    useEffect(() => {
        setMessages((currentMessages) => currentMessages.map((message, index) => (
            index === 0 && message.isDefault
                ? { ...message, text: t.chat_initial_msg || 'System Initialized. I am the Safeway Internal Assistant.' }
                : message
        )));
    }, [t.chat_initial_msg]);

    // Profile Loading (restores the session, role, and account details for the header)
    useEffect(() => {
        const loadProfile = async () => {
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
            } catch (error) {
                console.error('Failed to load profile:', error);
            }
        };

        void loadProfile();
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
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.text, history: conversationHistory }),
                signal: abortControllerRef.current.signal,
            });

            if (response.ok) {
                const data = await readJson<ChatResponse>(response);
                setMessages((current) => [...current, {
                    sender: 'bot',
                    text: data.message || 'No response generated.',
                    sources: data.sources || [],
                }]);
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
            {/* Chat Header (provides branding, display controls, and account actions) */}
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
            />
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
            {/* Source Drawer (previews the document excerpt grounding a selected response) */}
            <DocumentDrawer source={drawerSource} onClose={() => setDrawerSource(null)} />
        </m.div>
    );
};

export default ChatPage;
