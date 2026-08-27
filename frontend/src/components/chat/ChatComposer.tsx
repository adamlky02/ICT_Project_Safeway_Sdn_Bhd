import type { KeyboardEvent } from 'react';
import { Send, XCircle } from 'lucide-react';
import type { Translation } from '../../translations';

// Chat Composer Props (provides draft state and send or stop actions)
interface ChatComposerProps {
    input: string;
    isLoading: boolean;
    t: Translation;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
}

// Chat Composer (collects a question and switches between submit and cancel controls)
export function ChatComposer({ input, isLoading, t, onInputChange, onSend, onStop }: ChatComposerProps) {
    // Enter-key Submission (sends the current draft when the user presses Enter)
    const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            onSend();
        }
    };

    return (
        <div className="pt-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 transition-colors duration-500 shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
            <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-center relative">
                {/* Question Input (captures the next message while no request is running) */}
                <input
                    type="text"
                    className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-5 py-3.5 md:py-4 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all duration-300 text-sm md:text-base disabled:opacity-50 shadow-inner backdrop-blur-sm"
                    placeholder={t.chat_input_placeholder || 'Ask a question...'}
                    value={input}
                    onChange={(event) => onInputChange(event.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />

                {/* Request Control (offers cancellation during a request and submission otherwise) */}
                {isLoading ? (
                    <button onClick={onStop} className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30 p-3.5 md:px-6 md:py-4 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all shadow-md flex items-center justify-center shrink-0 active:scale-[0.96]" type="button">
                        <XCircle size={20} className="md:mr-2" />
                        <span className="hidden md:inline uppercase tracking-widest text-xs">Stop</span>
                    </button>
                ) : (
                    <button onClick={onSend} disabled={isLoading} className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-200 p-3.5 md:px-8 md:py-4 rounded-2xl font-black hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:grayscale active:scale-[0.96]" type="button">
                        <Send size={20} className="md:mr-2" />
                        <span className="hidden md:inline uppercase tracking-widest text-xs">{t.chat_btn_send || 'Send'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
