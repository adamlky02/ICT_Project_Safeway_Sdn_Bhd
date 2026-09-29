import type { FormEvent } from 'react';
import { Ban, CheckCircle2, CircleAlert, Cloud, File, LoaderCircle, Square, Trash2, Upload, X } from 'lucide-react';
import type { Translation } from '../../translations';
import type { AccountForm, AdminDocument, AdminUploadItem } from '../../types';
import { cardStyle, inputStyle, primaryButtonStyle } from './styles';

// Documents Panel Props (provides repository data, upload state, and document actions)
interface DocumentsPanelProps {
    documents: AdminDocument[];
    form: AccountForm;
    uploadItems: AdminUploadItem[];
    isUploading: boolean;
    t: Translation;
    onFormChange: (form: AccountForm) => void;
    onFilesSelected: (files: File[]) => void;
    onUploadTitleChange: (id: string, title: string) => void;
    onUploadItemRemove: (id: string) => void;
    onUpload: (event: FormEvent<HTMLFormElement>) => void;
    onForceStopUpload: () => void;
    onDeleteDocument: (id: number) => void;
}

// Documents Panel (uploads new source files and manages indexed repository records)
export function DocumentsPanel({
    documents,
    form,
    uploadItems,
    isUploading,
    t,
    onFormChange,
    onFilesSelected,
    onUploadTitleChange,
    onUploadItemRemove,
    onUpload,
    onForceStopUpload,
    onDeleteDocument,
}: DocumentsPanelProps) {
    const pendingCount = uploadItems.filter((item) => item.status !== 'success').length;
    const completedCount = uploadItems.filter((item) => item.status === 'success' || item.status === 'error' || item.status === 'cancelled').length;

    return (
        <div className="space-y-6">
            {/* Document Upload Form (collects shared metadata and a batch of source files for AI indexing) */}
            <form onSubmit={onUpload} className={`${cardStyle} p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6`}>
                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                <div className="relative z-10">
                    <div className="space-y-1.5 max-w-md">
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
                </div>

                {/* Batch File Picker (accepts multiple supported documents in one selection) */}
                <div className="border border-dashed border-slate-300 dark:border-white/20 p-6 sm:p-10 rounded-2xl sm:rounded-3xl flex min-h-40 flex-col items-center justify-center bg-slate-50/50 dark:bg-white/5 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer relative text-center shadow-inner z-10">
                    <input
                        id="file-upload"
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(event) => {
                            onFilesSelected(Array.from(event.target.files ?? []));
                            event.target.value = '';
                        }}
                        accept=".pdf,.txt"
                        multiple
                        disabled={isUploading}
                    />
                    <Upload className="text-amber-500 mb-3" size={28} />
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-bold tracking-wide">
                        {uploadItems.length > 0 ? `${uploadItems.length} ${t.files_selected}` : t.choose_files}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">{t.batch_upload_notice}</p>
                </div>

                {/* Upload Queue (shows editable titles and live status for every selected file) */}
                {uploadItems.length > 0 && (
                    <div className="relative z-10 space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.upload_queue}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{uploadItems.length} {t.files}</p>
                        </div>
                        {uploadItems.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/20 p-3 sm:p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-2 shrink-0">
                                        {item.status === 'success' && <CheckCircle2 className="text-emerald-500" size={20} />}
                                        {item.status === 'error' && <CircleAlert className="text-red-500" size={20} />}
                                        {item.status === 'cancelled' && <Ban className="text-slate-400" size={20} />}
                                        {item.status === 'uploading' && <LoaderCircle className="text-amber-500 animate-spin" size={20} />}
                                        {item.status === 'ready' && <File className="text-slate-400" size={20} />}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{item.file.name}</p>
                                            <span className="shrink-0 text-[10px] font-semibold text-slate-400">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                        <input
                                            className={`${inputStyle} py-2`}
                                            value={item.title}
                                            onChange={(event) => onUploadTitleChange(item.id, event.target.value)}
                                            placeholder={t.doc_title}
                                            aria-label={`${t.doc_title}: ${item.file.name}`}
                                            disabled={isUploading || item.status === 'success'}
                                            required
                                        />
                                        {item.status === 'success' && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{t.upload_success}</p>}
                                        {item.status === 'error' && <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">{t.upload_failed}: {item.error}</p>}
                                        {item.status === 'cancelled' && <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t.upload_cancelled}</p>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onUploadItemRemove(item.id)}
                                        className="mt-0 flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label={`${t.remove_file}: ${item.file.name}`}
                                        disabled={isUploading}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className={`relative z-10 ${isUploading ? 'grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3' : ''}`}>
                    <button
                        className={`${primaryButtonStyle} disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
                        type="submit"
                        disabled={isUploading || pendingCount === 0}
                    >
                        {isUploading ? <LoaderCircle className="animate-spin" size={18} /> : <Cloud size={18} />}
                        {isUploading ? `${t.uploading_files} (${completedCount}/${uploadItems.length})` : `${t.upload_repo} (${pendingCount})`}
                    </button>
                    {isUploading && (
                        <button
                            className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-black text-red-700 shadow-sm transition-all hover:border-red-400 hover:bg-red-100 active:scale-[0.98] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            type="button"
                            onClick={onForceStopUpload}
                        >
                            <Square size={16} fill="currentColor" />
                            {t.force_stop_upload}
                        </button>
                    )}
                </div>
            </form>

            {/* Stored Documents (lists indexed files with their category and deletion action) */}
            <div className={`${cardStyle} overflow-hidden`}>
                <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                <div className="relative z-10">
                    <div className="bg-slate-50 dark:bg-white/5 p-4 border-b border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{t.stored_docs}</div>
                    {documents.map((document) => (
                        <div key={document.id} className="p-3 sm:p-4 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                                <div className="bg-orange-50 dark:bg-orange-500/10 p-2.5 rounded-xl text-orange-600 dark:text-orange-500 border border-orange-200/50 dark:border-orange-500/20 shrink-0"><File size={18} /></div>
                                <div className="overflow-hidden">
                                    <p className="font-bold truncate text-slate-800 dark:text-white tracking-tight">{document.title}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{document.category} • {document.file_type}</p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteDocument(document.id)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-slate-400 hover:text-red-500 dark:hover:bg-white/5 rounded-xl transition-colors" type="button" aria-label={`Delete ${document.title}`}><Trash2 size={18} /></button>
                        </div>
                    ))}
                    {documents.length === 0 && <p className="p-8 text-center text-slate-500 italic text-sm">{t.no_matches}</p>}
                </div>
            </div>
        </div>
    );
}
