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

const ChatPage = () => {
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

    useEffect(() => {
        setMessages((currentMessages) => currentMessages.map((message, index) => (
            index === 0 && message.isDefault
                ? { ...message, text: t.chat_initial_msg || 'System Initialized. I am the Safeway Internal Assistant.' }
                : message
        )));
    }, [t.chat_initial_msg]);

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

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

    const closeDropdownAndNavigate = (path: string) => {
        setDropdownOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        localStorage.clear();
        setDropdownOpen(false);
        navigate('/');
    };

    return (
        <m.div
            className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-300 font-sans overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <EngineeringBackground />
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
            <ChatMessages
                messages={messages}
                isLoading={isLoading}
                t={t}
                messagesEndRef={messagesEndRef}
                onOpenSource={setDrawerSource}
            />
            <ChatComposer
                input={input}
                isLoading={isLoading}
                t={t}
                onInputChange={setInput}
                onSend={() => void handleSend()}
                onStop={() => abortControllerRef.current?.abort()}
            />
            <DocumentDrawer source={drawerSource} onClose={() => setDrawerSource(null)} />
        </m.div>
    );
};

export default ChatPage;
