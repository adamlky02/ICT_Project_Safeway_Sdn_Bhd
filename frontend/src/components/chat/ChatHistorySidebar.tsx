import { useState } from 'react';
import {
    History,
    MessageSquare,
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    ChevronLeft,
    Search,
    Clock,
} from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { ChatSessionSummary } from '../../types';

interface ChatHistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSessionSummary[];
    activeSessionId: string | null;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
    onDeleteSession: (sessionId: string) => void;
    onRenameSession: (sessionId: string, newTitle: string) => void;
    isLoading: boolean;
}

export function ChatHistorySidebar({
    isOpen,
    onClose,
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onRenameSession,
    isLoading,
}: ChatHistorySidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const filteredSessions = sessions.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.last_message && s.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const startEditing = (s: ChatSessionSummary, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(s.id);
        setEditTitle(s.title);
    };

    const confirmRename = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            onRenameSession(sessionId, editTitle.trim());
        }
        setEditingSessionId(null);
    };

    const cancelRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(null);
    };

    const handleDelete = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Delete this conversation history?')) {
            onDeleteSession(sessionId);
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            }
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <m.div
                        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Panel */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-40 flex w-72 md:w-80 flex-col
                    border-r border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-2xl
                    transition-all duration-300 ease-in-out
                    dark:border-white/10 dark:bg-slate-900/95
                    md:static md:z-10 md:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:-ml-72 md:w-0 md:opacity-0 md:pointer-events-none'}
                `}
            >
                {/* Sidebar Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-4 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                        <h2 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Chat History
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Close sidebar"
                        type="button"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="p-3">
                    <button
                        onClick={onNewChat}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-all hover:brightness-105 active:scale-98"
                        type="button"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Conversation</span>
                    </button>
                </div>

                {/* Search Input */}
                <div className="px-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search history..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-slate-800"
                        />
                    </div>
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                            <Clock className="h-6 w-6 animate-spin mb-2 opacity-60" />
                            <span className="text-xs">Loading conversations...</span>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-400 dark:text-slate-500">
                            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                            <span className="text-xs font-medium">
                                {searchQuery ? 'No matching conversations' : 'No conversation history yet'}
                            </span>
                            <span className="text-[11px] mt-1 opacity-70">
                                Send a message to start a conversation thread.
                            </span>
                        </div>
                    ) : (
                        filteredSessions.map((session) => {
                            const isActive = session.id === activeSessionId;
                            const isEditing = session.id === editingSessionId;

                            return (
                                <div
                                    key={session.id}
                                    onClick={() => !isEditing && onSelectSession(session.id)}
                                    className={`
                                        group relative flex cursor-pointer flex-col rounded-xl px-3 py-2.5 transition-all
                                        ${isActive
                                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200 shadow-xs'
                                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        {isEditing ? (
                                            <div className="flex flex-1 items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') confirmRename(session.id, e as unknown as React.MouseEvent);
                                                        if (e.key === 'Escape') cancelRename(e as unknown as React.MouseEvent);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    className="w-full rounded border border-amber-500 bg-white px-1.5 py-0.5 text-xs text-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none"
                                                />
                                                <button
                                                    onClick={(e) => confirmRename(session.id, e)}
                                                    className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                                    type="button"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={cancelRename}
                                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    type="button"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="truncate text-xs font-semibold leading-5">
                                                    {session.title}
                                                </span>
                                                <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                                                    {formatTime(session.updated_at || session.created_at)}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Snippet & Actions */}
                                    {!isEditing && (
                                        <div className="mt-1 flex items-center justify-between">
                                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 max-w-[190px]">
                                                {session.last_message || 'No messages'}
                                            </p>
                                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={(e) => startEditing(session, e)}
                                                    className="rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                                    title="Rename"
                                                    type="button"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(session.id, e)}
                                                    className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                                                    title="Delete"
                                                    type="button"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer status */}
                <div className="border-t border-slate-200/80 p-3 text-center dark:border-white/10">
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {sessions.length} conversation{sessions.length === 1 ? '' : 's'} saved
                    </span>
                </div>
            </aside>
        </>
    );
}
