import type { FormEvent } from 'react';
import { Cloud, File, Trash2, Upload } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AccountForm, AdminDocument } from '../../types';
import { cardStyle, inputStyle, primaryButtonStyle } from './styles';

// Documents Panel Props (provides repository data, upload state, and document actions)
interface DocumentsPanelProps {
    documents: AdminDocument[];
    form: AccountForm;
    selectedFile: File | null;
    t: Translation;
    onFormChange: (form: AccountForm) => void;
    onFileChange: (file: File | null) => void;
    onUpload: (event: FormEvent<HTMLFormElement>) => void;
    onDeleteDocument: (id: number) => void;
}

// Documents Panel (uploads new source files and manages indexed repository records)
export function DocumentsPanel({
    documents,
    form,
    selectedFile,
    t,
    onFormChange,
    onFileChange,
    onUpload,
    onDeleteDocument,
}: DocumentsPanelProps) {
    return (
        <div className="space-y-6">
            {/* Document Upload Form (collects metadata and a source file for AI indexing) */}
            <form onSubmit={onUpload} className={`${cardStyle} p-6 md:p-8 space-y-6`}>
                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.doc_title}</label>
                        <input className={inputStyle} placeholder="e.g. Employee Handbook" value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t.category}</label>
                        <select className={`${inputStyle} appearance-none`} value={form.category} onChange={(event) => onFormChange({ ...form, category: event.target.value })}>
                            <option value="HR">HR / Policies</option>
                            <option value="Safety">Safety / Warehouse</option>
                            <option value="IT">IT / Security</option>
                            <option value="General">General Manuals</option>
                        </select>
                    </div>
                </div>

                {/* File Picker (accepts supported documents and displays the selected filename) */}
                <div className="border border-dashed border-slate-300 dark:border-white/20 p-10 rounded-3xl flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/5 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer relative text-center shadow-inner z-10">
                    <input
                        id="file-upload"
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                        accept=".pdf,.docx,.doc,.txt"
                    />
                    <Upload className="text-amber-500 mb-3" size={28} />
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-bold tracking-wide">{selectedFile ? selectedFile.name : t.choose_file}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">{t.auto_embed_notice}</p>
                </div>
                <div className="relative z-10">
                    <button className={primaryButtonStyle} type="submit"><Cloud size={18} /> {t.upload_repo}</button>
                </div>
            </form>

            {/* Stored Documents (lists indexed files with their category and deletion action) */}
            <div className={`${cardStyle} overflow-hidden`}>
                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                <div className="relative z-10">
                    <div className="bg-slate-50 dark:bg-white/5 p-4 border-b border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t.stored_docs}</div>
                    {documents.map((document) => (
                        <div key={document.id} className="p-4 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-orange-50 dark:bg-orange-500/10 p-2.5 rounded-xl text-orange-600 dark:text-orange-500 border border-orange-200/50 dark:border-orange-500/20 shrink-0"><File size={18} /></div>
                                <div className="overflow-hidden">
                                    <p className="font-bold truncate text-slate-800 dark:text-white tracking-tight">{document.title}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{document.category} • {document.file_type}</p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteDocument(document.id)} className="p-2 text-slate-400 hover:text-red-500 dark:hover:bg-white/5 rounded-xl transition-colors" type="button"><Trash2 size={18} /></button>
                        </div>
                    ))}
                    {documents.length === 0 && <p className="p-8 text-center text-slate-500 italic text-sm">{t.no_matches}</p>}
                </div>
            </div>
        </div>
    );
}
