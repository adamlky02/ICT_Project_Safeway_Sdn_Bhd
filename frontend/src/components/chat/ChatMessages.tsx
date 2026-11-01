import { memo } from 'react';
import { ArrowDown, FileText, Loader2 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useConversationScroll } from '../../hooks/useConversationScroll';
import ReactMarkdown from 'react-markdown';
import type { Translation } from '../../translations';
import type { ChatMessage, DocumentSource } from '../../types';

// Chat Messages Props (provides conversation content, loading state, and source actions)
interface ChatMessagesProps {
    messages: ChatMessage[];
    isLoading: boolean;
    t: Translation;
    scrollResetKey: number;
    onOpenSource: (source: DocumentSource) => void;
}

// Chat Messages (renders animated conversation bubbles, evidence links, and request status)
export const ChatMessages = memo(function ChatMessages({ messages, isLoading, t, scrollResetKey, onOpenSource }: ChatMessagesProps) {
    const { viewportRef, contentRef, awayFromBottom, hasNewMessages, updatePosition, scrollToLatest } = useConversationScroll(messages, isLoading, scrollResetKey);
    return (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div ref={viewportRef} onScroll={updatePosition} tabIndex={0} aria-label={t.chat_conversation} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 custom-scrollbar sm:px-5 md:px-8 md:py-6">
            {/* Conversation Column (anchors each role to the nearest outer edge of the workspace) */}
            <div ref={contentRef} className="flex w-full flex-col gap-4 md:gap-6">
                {/* Conversation List (renders each user or assistant message with role-specific styling) */}
                <AnimatePresence initial={false}>
                    {messages.map((message, index) => (
                        <m.div
                            key={`${message.sender}-${index}`}
                            className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            initial={{ opacity: 0, y: 12, scale: 0.985 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.985 }}
                            transition={{ duration: 0.28 }}
                        >
                            <div className={`max-w-[92%] sm:max-w-[82%] md:max-w-2xl break-words px-4 sm:px-5 md:px-6 py-3.5 md:py-4 rounded-2xl sm:rounded-3xl text-sm md:text-[15px] leading-[1.75] transition-colors duration-500 flex flex-col ${
                            message.sender === 'user'
                                ? 'message-user whitespace-pre-wrap bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 dark:text-white font-medium rounded-tr-sm shadow-amber-500/20'
                                : 'glass-message bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]'
                            }`}>
                            <div className={message.sender === 'bot' ? 'space-y-3' : ''}>
                                {message.sender === 'bot' ? (
                                    <ReactMarkdown
                                        components={{
                                            p: ({ node: _node, ...props }) => <p {...props} />,
                                            strong: ({ node: _node, ...props }) => <strong className="font-semibold text-amber-700 dark:text-amber-500 tracking-wide" {...props} />,
                                            ul: ({ node: _node, ...props }) => <ul className="list-disc pl-5 space-y-2 my-3 marker:text-amber-500" {...props} />,
                                            ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-5 space-y-2 my-3 marker:text-amber-500 font-bold" {...props} />,
                                            li: ({ node: _node, ...props }) => <li className="font-medium" {...props} />,
                                        }}
                                    >
                                        {message.text || ''}
                                    </ReactMarkdown>
                                ) : message.text}
                            </div>

                            {/* Evidence Links (opens the source drawer for retrieved document excerpts) */}
                            {message.sources && message.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 w-full flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wide flex items-center mr-1">Sources:</span>
                                    {message.sources.map((source, sourceIndex) => (
                                        <m.button
                                            key={sourceIndex}
                                            onClick={() => onOpenSource(source)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1.5 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/40 transition-colors shadow-sm"
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            title={source.title}
                                            type="button"
                                        >
                                            <FileText size={12} />
                                            [{sourceIndex + 1}] {source.title.length > 20 ? `${source.title.substring(0, 20)}...` : source.title}
                                        </m.button>
                                    ))}
                                </div>
                            )}
                            </div>
                        </m.div>
                    ))}
                </AnimatePresence>

            {/* Thinking Indicator (shows retrieval progress while the API request is active) */}
                <AnimatePresence>
                    {isLoading && (
                        <m.div
                            className="flex w-full justify-start"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                        >
                            <div className="glass-message flex items-center gap-3 rounded-2xl rounded-tl-sm border border-slate-200 bg-white/90 px-4 py-3.5 text-sm font-bold tracking-wide text-amber-600 shadow-md backdrop-blur-md dark:border-white/5 dark:bg-slate-900/80 dark:text-amber-500 sm:rounded-3xl sm:px-6 sm:py-4">
                                <Loader2 className="animate-spin" size={18} />
                                <span role="status">{t.chat_thinking || 'Querying database...'}</span>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
                {/* Scroll Anchor (provides the target used to keep the newest message visible) */}
                <div className="h-4" aria-hidden="true" />
            </div>
        </div>
        {awayFromBottom && <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
            <button type="button" onClick={() => { scrollToLatest(true); viewportRef.current?.focus({ preventScroll: true }); }} className="glass-panel pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-lg">
                <ArrowDown size={16} aria-hidden="true" />
                {hasNewMessages ? t.chat_new_messages : t.chat_jump_latest}
            </button>
        </div>}
        <span className="sr-only" role="status">{hasNewMessages ? t.chat_new_messages : ''}</span>
        </div>
    );
});
