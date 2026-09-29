import { FileText, Search, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { API_URL } from '../../api/client';
import type { DocumentSource } from '../../types';
import SmartPdfViewer from '../SmartPdfViewer';

// Document Drawer Props (provides the selected source and close action)
interface DocumentDrawerProps {
    source: DocumentSource | null;
    onClose: () => void;
}

// Document Drawer (shows retrieved evidence beside an inline document preview)
export function DocumentDrawer({ source, onClose }: DocumentDrawerProps) {
    return (
        <AnimatePresence>
            {source && (
                <m.div
                    className="fixed inset-0 z-50 flex justify-end"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                >
                    {/* Drawer Backdrop (closes the preview when the shaded page area is selected) */}
                    <m.button
                        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-default"
                        onClick={onClose}
                        aria-label="Close document preview"
                        type="button"
                    />
                    {/* Preview Panel (contains source identity, matched text, and file rendering) */}
                    <m.aside
                        className="relative flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0a0a0a] sm:w-[92vw] sm:max-w-xl lg:max-w-3xl"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    >
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10 dark:bg-slate-900 sm:p-4 md:p-6">
                            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                <div className="shrink-0 rounded-xl bg-amber-100 p-2.5 text-amber-600 dark:bg-amber-500/20 dark:text-amber-500 sm:p-3">
                                    <FileText size={22} />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="truncate text-base font-black tracking-tight text-slate-800 dark:text-white sm:text-lg">{source.title}</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">{source.category}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-full transition-colors shrink-0" type="button" aria-label="Close document preview">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Retrieved Excerpt (shows the exact text used to ground the AI response) */}
                        <div className="shrink-0 border-b border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/30 dark:bg-amber-900/10 sm:p-5">
                            <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-500">
                                <Search size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">AI Extraction Highlight</span>
                            </div>
                            <p className="max-h-24 overflow-y-auto border-l-[3px] border-amber-400 pl-3 text-xs font-medium italic leading-relaxed text-slate-700 custom-scrollbar dark:border-amber-500 dark:text-slate-300 sm:max-h-32 sm:pl-4">
                                &quot;{source.content}&quot;
                            </p>
                        </div>

                        {/* File Preview (renders PDFs inline and explains unsupported preview formats) */}
                        <div className="flex-1 bg-slate-200 dark:bg-slate-950 relative w-full h-full overflow-hidden">
                            {source.file_path.endsWith('.pdf') ? (
                                <SmartPdfViewer fileUrl={`${API_URL}/api/files/${source.file_path}`} searchText={source.content} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-8 text-center">
                                    <FileText size={48} className="mb-4 opacity-50" />
                                    <p className="font-bold">Preview not available.</p>
                                    <p className="text-xs mt-2">Only PDF files can be previewed directly in the terminal.</p>
                                </div>
                            )}
                        </div>
                    </m.aside>
                </m.div>
            )}
        </AnimatePresence>
    );
}
