import { useState } from 'react';
import {
    History,
    MessageSquare,
    Plus,
    Check,
    X,
    ChevronLeft,
    Search,
    Clock,
    LoaderCircle,
    ListChecks,
} from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { downloadSessionHistories } from '../../api/chatHistory';
import type { ChatSessionSummary } from '../../types';
import { ChatHistoryActions } from './ChatHistoryActions';

interface ChatHistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onEngage: () => void;
    sessions: ChatSessionSummary[];
    activeSessionId: string | null;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
    onDeleteSessions: (sessionIds: string[]) => Promise<void>;
    onRenameSession: (sessionId: string, newTitle: string) => void;
    isLoading: boolean;
}

export function ChatHistorySidebar({
    isOpen,
    onClose,
    onEngage,
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSessions,
    onRenameSession,
    isLoading,
}: ChatHistorySidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [busyAction, setBusyAction] = useState<'download' | 'delete' | null>(null);
    const [actionError, setActionError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const selectedSessions = sessions.filter((session) => selectedIds.has(session.id));

    const performAction = async (action: 'download' | 'delete', ids: string[]) => {
        if (busyAction || ids.length === 0) return;
        if (action === 'delete' && !window.confirm(`Delete ${ids.length === 1 ? 'this conversation' : `these ${ids.length} conversations`}? This cannot be undone.`)) return;
        setBusyAction(action);
        setActionError('');
        setActionMessage('');
        try {
            if (action === 'download') {
                await downloadSessionHistories(ids);
                setActionMessage(`${ids.length} conversation${ids.length === 1 ? '' : 's'} downloaded.`);
            } else {
                await onDeleteSessions(ids);
                setSelectedIds((current) => new Set([...current].filter((id) => !ids.includes(id))));
                setActionMessage(`${ids.length} conversation${ids.length === 1 ? '' : 's'} deleted.`);
            }
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'The action failed. Please try again.');
        } finally {
            setBusyAction(null);
        }
    };

    const toggleSelection = (id: string) => {
        if (busyAction) return;
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filteredSessions = sessions.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.last_message && s.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const startEditing = (s: ChatSessionSummary) => {
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
                onPointerEnter={onEngage}
                onPointerDown={onEngage}
                onFocusCapture={onEngage}
                className={`
                    fixed bottom-0 left-0 top-20 z-40 flex w-72 min-w-0 shrink-0 flex-col overflow-hidden
                    border-r border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-2xl
                    transition-all duration-300 ease-in-out
                    dark:border-white/10 dark:bg-slate-900/95
                    md:static md:col-start-1 md:row-start-1 md:row-span-2 md:min-h-0 md:z-10 md:shadow-none
                    ${isOpen ? 'translate-x-0 md:w-80' : '-translate-x-full md:w-0 md:translate-x-0 md:border-r-0 md:opacity-0 md:pointer-events-none'}
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
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                                setSelectedIds(new Set());
                            }}
                            disabled={busyAction !== null}
                            placeholder="Search history..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-slate-800"
                        />
                    </div>
                </div>

                <div className="shrink-0 space-y-2 px-3 pb-2">
                    <button type="button" disabled={busyAction !== null || isLoading}
                        onClick={() => {
                            setSelectionMode((current) => !current);
                            setSelectedIds(new Set());
                            setEditingSessionId(null);
                            setActionMessage('');
                            setActionError('');
                        }}
                        aria-pressed={selectionMode}
                        className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800">
                        {selectionMode ? <X className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                        {selectionMode ? 'Done selecting' : 'Select conversations'}
                    </button>
                    {selectionMode && <>
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <button type="button" disabled={busyAction !== null || filteredSessions.length === 0}
                                title="Select all conversations matching the search"
                                onClick={() => setSelectedIds(new Set(filteredSessions.map((session) => session.id)))}
                                className="min-h-8 rounded px-2 font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-500/10">Select all</button>
                            <button type="button" disabled={busyAction !== null || selectedSessions.length === 0}
                                onClick={() => setSelectedIds(new Set())}
                                className="min-h-8 rounded px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">Deselect all</button>
                        </div>
                        <ChatHistoryActions label="Actions for selected conversations"
                            summary={<span className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{selectedSessions.length} selected</span>}
                            disabled={busyAction !== null || selectedSessions.length === 0}
                            onDownload={() => void performAction('download', selectedSessions.map((session) => session.id))}
                            onDelete={() => void performAction('delete', selectedSessions.map((session) => session.id))} />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Selected conversations download together in one TXT file.</p>
                    </>}
                    {busyAction && <p role="status" className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-3 w-3 animate-spin" />{busyAction === 'download' ? 'Preparing download…' : 'Deleting conversations…'}</p>}
                    {actionError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{actionError}</p>}
                    {actionMessage && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{actionMessage}</p>}
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
                                    onClick={() => {
                                        if (isEditing || busyAction) return;
                                        if (selectionMode) toggleSelection(session.id);
                                        else onSelectSession(session.id);
                                    }}
                                    className={`
                                        group relative flex cursor-pointer flex-col rounded-xl px-3 py-2.5 transition-all
                                        ${isActive
                                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-200 shadow-xs'
                                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        {selectionMode && <input type="checkbox" checked={selectedIds.has(session.id)}
                                            disabled={busyAction !== null} aria-label={`Select ${session.title}`}
                                            onClick={(event) => event.stopPropagation()} onChange={() => toggleSelection(session.id)}
                                            className="mr-2 h-4 w-4 shrink-0 accent-amber-600" />}
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
                                                <button type="button" disabled={busyAction !== null}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if (selectionMode) toggleSelection(session.id);
                                                        else onSelectSession(session.id);
                                                    }}
                                                    className="min-w-0 flex-1 truncate text-left text-xs font-semibold leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                                                    {session.title}
                                                </button>
                                                <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                                                    {formatTime(session.updated_at || session.created_at)}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Snippet & Actions */}
                                    {!isEditing && (
                                        <div className="mt-1">
                                            {selectionMode ? <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{session.last_message || 'No messages'}</p>
                                                : <ChatHistoryActions label={`Actions for ${session.title}`} compact disabled={busyAction !== null}
                                                    summary={<p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">{session.last_message || 'No messages'}</p>}
                                                    onRename={() => startEditing(session)}
                                                    onDownload={() => void performAction('download', [session.id])}
                                                    onDelete={() => void performAction('delete', [session.id])} />}
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
