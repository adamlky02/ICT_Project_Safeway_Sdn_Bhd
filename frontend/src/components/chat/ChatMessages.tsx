import type { RefObject } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import type { Translation } from '../../translations';
import type { ChatMessage, DocumentSource } from '../../types';

interface ChatMessagesProps {
    messages: ChatMessage[];
    isLoading: boolean;
    t: Translation;
    messagesEndRef: RefObject<HTMLDivElement>;
    onOpenSource: (source: DocumentSource) => void;
}

export function ChatMessages({ messages, isLoading, t, messagesEndRef, onOpenSource }: ChatMessagesProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 z-10 relative custom-scrollbar">
            <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                    <m.div
                        key={`${message.sender}-${index}`}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 12, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.985 }}
                        transition={{ duration: 0.28 }}
                    >
                        <div className={`max-w-[85%] md:max-w-2xl px-5 md:px-6 py-4 rounded-3xl shadow-md text-sm md:text-[15px] leading-relaxed transition-colors duration-500 whitespace-pre-wrap flex flex-col ${
                        message.sender === 'user'
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-200 font-medium rounded-tr-sm shadow-amber-500/20'
                            : 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]'
                        }`}>
                            <div className={message.sender === 'bot' ? 'space-y-3' : ''}>
                                {message.sender === 'bot' ? (
                                    <ReactMarkdown
                                        components={{
                                            p: ({ node: _node, ...props }) => <p {...props} />,
                                            strong: ({ node: _node, ...props }) => <strong className="font-black text-amber-700 dark:text-amber-500 tracking-wide" {...props} />,
                                            ul: ({ node: _node, ...props }) => <ul className="list-disc pl-5 space-y-2 my-3 marker:text-amber-500" {...props} />,
                                            ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-5 space-y-2 my-3 marker:text-amber-500 font-bold" {...props} />,
                                            li: ({ node: _node, ...props }) => <li className="font-medium" {...props} />,
                                        }}
                                    >
                                        {message.text || ''}
                                    </ReactMarkdown>
                                ) : message.text}
                            </div>

                            {message.sources && message.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 w-full flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mr-1">Sources:</span>
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

            <AnimatePresence>
                {isLoading && (
                    <m.div
                        className="flex justify-start"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                    >
                        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md text-amber-600 dark:text-amber-500 border border-slate-200 dark:border-white/5 px-6 py-4 rounded-3xl rounded-tl-sm flex items-center gap-3 shadow-md text-sm font-bold tracking-wide">
                            <Loader2 className="animate-spin" size={18} />
                            <span>{t.chat_thinking || 'Querying database...'}</span>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-4" />
        </div>
    );
}
