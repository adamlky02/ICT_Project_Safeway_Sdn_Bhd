import { useCallback, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF Worker (loads PDF.js parsing in a separate Vite-compatible worker)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
).toString();

// PDF Viewer Types (describe component inputs and the text-layer items being rendered)
interface SmartPdfViewerProps {
    fileUrl: string;
    searchText: string;
}

interface PdfTextItem {
    str: string;
}

// Highlight Escaping (prevents PDF text from injecting markup into highlighted output)
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Smart PDF Viewer (renders every PDF page and highlights lines matching retrieved text)
const SmartPdfViewer = ({ fileUrl, searchText }: SmartPdfViewerProps) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Document Load Handler (records page count and dismisses the loading state)
    function onDocumentLoadSuccess(document: PDFDocumentProxy) {
        setNumPages(document.numPages);
        setLoading(false);
    }

    // Keyword Highlighter (scores significant shared words and marks strong line matches)
    const customTextRenderer = useCallback(
        (textItem: PdfTextItem) => {
            if (!searchText) return textItem.str;

            // Significant Query Words (normalizes the retrieved excerpt and removes short terms)
            const aiWords = searchText
                .toLowerCase()
                .replace(/[^a-z0-9 ]/g, '')
                .split(' ')
                .filter(word => word.length > 4);

            if (aiWords.length === 0) return textItem.str;

            // PDF Line Normalization (prepares the current text item for comparison)
            const pdfLine = textItem.str.toLowerCase();

            // Match Score (counts significant query words found in the current PDF line)
            let matchCount = 0;
            for (const word of aiWords) {
                if (pdfLine.includes(word)) {
                    matchCount++;
                }
            }

            // Highlight Threshold (marks lines containing at least five significant query words)
            if (matchCount >= 5) {
                return `<mark style="background-color: rgba(255, 165, 0, 0.4); color: inherit; padding: 0 2px">${escapeHtml(textItem.str)}</mark>`;
            }

            return textItem.str;
        },
        [searchText]
    );

    return (
        // Viewer Canvas (allows two-axis scrolling so wide PDF pages are never clipped)
        <div className="w-full h-full bg-slate-200 dark:bg-[#050505] overflow-auto p-4 custom-scrollbar">

            {/* Safe Page Centering (centers documents without preventing horizontal mobile scrolling) */}
            <div className="min-w-fit min-h-full flex flex-col items-center mx-auto">

                {/* Loading State (reports PDF parsing progress until page metadata is available) */}
                {loading && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                        <Loader2 className="animate-spin mb-3 text-amber-500" size={32} />
                        <p className="font-bold tracking-widest uppercase text-xs">Decrypting Document...</p>
                    </div>
                )}

                {/* PDF Document (renders every page with the custom searchable text layer) */}
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col items-center w-full"
                    loading={null}
                >
                    {Array.from({ length: numPages ?? 0 }, (_, index) => (
                        /* PDF Page (keeps each full-width rendered page visible and sharply scaled) */
                        <div key={`page_${index + 1}`} className="mb-6 shadow-xl w-fit bg-white rounded-lg border border-slate-200 dark:border-slate-800 relative z-10">
                            <Page
                                pageNumber={index + 1}
                                width={700}
                                renderTextLayer={true}
                                renderAnnotationLayer={false}
                                customTextRenderer={customTextRenderer}
                                className="dark:opacity-90"
                            />
                        </div>
                    ))}
                </Document>
            </div>
        </div>
    );
};

export default SmartPdfViewer;
