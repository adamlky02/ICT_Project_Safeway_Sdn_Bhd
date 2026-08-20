import { FileText, Search, X } from 'lucide-react';
import { API_URL } from '../../api/client';
import type { DocumentSource } from '../../types';
import SmartPdfViewer from '../SmartPdfViewer';

interface DocumentDrawerProps {
    source: DocumentSource | null;
    onClose: () => void;
}

export function DocumentDrawer({ source, onClose }: DocumentDrawerProps) {
    return (
        <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${source ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md md:max-w-xl h-full bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col transform transition-transform duration-500 border-l border-slate-200 dark:border-white/10 ${source ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 md:p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 shrink-0">
                            <FileText size={24} />
                        </div>
                        <div className="overflow-hidden">
                            <h3 className="font-black text-slate-800 dark:text-white text-lg truncate tracking-tight">{source?.title}</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">{source?.category}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-full transition-colors shrink-0" type="button">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 border-b border-amber-200 dark:border-amber-900/30 bg-amber-50/80 dark:bg-amber-900/10 shrink-0">
                    <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-500">
                        <Search size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">AI Extraction Highlight</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic border-l-[3px] border-amber-400 dark:border-amber-500 pl-4 max-h-32 overflow-y-auto custom-scrollbar">
                        &quot;{source?.content}&quot;
                    </p>
                </div>

                <div className="flex-1 bg-slate-200 dark:bg-slate-950 relative w-full h-full overflow-hidden">
                    {source?.file_path.endsWith('.pdf') ? (
                        <SmartPdfViewer fileUrl={`${API_URL}/api/files/${source.file_path}`} searchText={source.content} />
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
    );
}
