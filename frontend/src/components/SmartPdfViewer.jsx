import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
).toString();

const SmartPdfViewer = ({ fileUrl, searchText }) => {
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(true);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
    }

    // --- THE CLASSIC HIGHLIGHTER (Word-Scoring Match) ---
    const customTextRenderer = useCallback(
        (textItem) => {
            if (!searchText) return textItem.str;

            // 1. Break the AI's search text into an array of important, long words
            const aiWords = searchText
                .toLowerCase()
                .replace(/[^a-z0-9 ]/g, '') // remove punctuation
                .split(' ')
                .filter(word => word.length > 4); // Only look for significant words

            if (aiWords.length === 0) return textItem.str;

            // 2. Break the current PDF line into an array of words
            const pdfLine = textItem.str.toLowerCase();

            // 3. Count how many of the AI's important words appear in this specific PDF line
            let matchCount = 0;
            for (const word of aiWords) {
                if (pdfLine.includes(word)) {
                    matchCount++;
                }
            }

            // 4. THE THRESHOLD: If this line contains enough keywords, apply the classic yellow highlight!
            if (matchCount >= 3) {
                return (
                    <mark style={{ backgroundColor: 'rgba(253, 224, 71, 0.7)', color: 'inherit', padding: '0 2px' }}>
                        {textItem.str}
                    </mark>
                );
            }

            return textItem.str;
        },
        [searchText]
    );

    return (
        // FIX 1: Changed "overflow-y-auto" to "overflow-auto" to allow horizontal scrolling
        // FIX 2: Removed "flex flex-col items-center" from here to prevent the flexbox clipping bug
        <div className="w-full h-full bg-slate-200 dark:bg-[#050505] overflow-auto p-4 custom-scrollbar">

            {/* FIX 3: Added a wrapper that handles safe centering without breaking mobile scroll */}
            <div className="min-w-fit min-h-full flex flex-col items-center mx-auto">

                {loading && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                        <Loader2 className="animate-spin mb-3 text-amber-500" size={32} />
                        <p className="font-bold tracking-widest uppercase text-xs">Decrypting Document...</p>
                    </div>
                )}

                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col items-center w-full"
                    loading={null}
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        // FIX 4: Removed "max-w-[600px] overflow-hidden". Changed to "w-fit".
                        <div key={`page_${index + 1}`} className="mb-6 shadow-xl w-fit bg-white rounded-lg border border-slate-200 dark:border-slate-800 relative z-10">
                            <Page
                                pageNumber={index + 1}
                                width={700} // Increased slightly for crisp text quality
                                renderTextLayer={true}
                                renderAnnotationLayer={false}
                                customTextRenderer={customTextRenderer}
                                className="dark:opacity-90" // Dims the bright white PDF slightly in dark mode so it isn't blinding
                            />
                        </div>
                    ))}
                </Document>
            </div>
        </div>
    );
};

export default SmartPdfViewer;