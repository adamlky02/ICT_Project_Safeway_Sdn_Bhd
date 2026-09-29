import type { KeyboardEvent } from 'react';
import { Mic, MicOff, Send, XCircle } from 'lucide-react';
import type { Translation } from '../../translations';
import type { Language } from '../../types';
import { useVoiceInput, type VoiceInputError } from '../../hooks/useVoiceInput';

// Chat Composer Props (provides draft state and send or stop actions)
interface ChatComposerProps {
    input: string;
    isLoading: boolean;
    language: Language;
    t: Translation;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
}

// Voice Error Copy (maps recognition failures to the active interface language)
function getVoiceErrorMessage(error: VoiceInputError, t: Translation): string | null {
    switch (error) {
        case 'permission-denied':
            return t.voice_error_permission;
        case 'microphone-unavailable':
            return t.voice_error_no_microphone;
        case 'network':
            return t.voice_error_network;
        case 'no-speech':
            return t.voice_error_no_speech;
        case 'start-failed':
            return t.voice_error_generic;
        default:
            return null;
    }
}

// Chat Composer (collects a question and switches between submit and cancel controls)
export function ChatComposer({ input, isLoading, language, t, onInputChange, onSend, onStop }: ChatComposerProps) {
    const {
        abortListening,
        error: voiceError,
        isListening,
        isSupported: isVoiceSupported,
        startListening,
        stopListening,
    } = useVoiceInput({
        disabled: isLoading,
        language,
        value: input,
        onTranscriptChange: onInputChange,
    });
    const voiceErrorMessage = getVoiceErrorMessage(voiceError, t);
    const voiceStatusMessage = voiceErrorMessage
        || (isListening ? t.voice_listening : null)
        || (!isVoiceSupported ? t.voice_unsupported : null);

    // Chat Submission (ends microphone capture before handing the draft to the page)
    const handleSend = () => {
        abortListening();
        onSend();
    };

    // Enter-key Submission (sends the current draft when the user presses Enter)
    const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="z-20 shrink-0 border-t border-slate-200 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-2xl transition-colors duration-500 dark:border-white/5 dark:bg-[#0a0a0a]/90 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] sm:px-5 md:p-5 lg:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex gap-2 md:gap-3 items-center relative">
                    {/* Question Input (captures typed text and displays the live transcript) */}
                    <input
                        type="text"
                        className={`h-12 flex-1 min-w-0 border rounded-xl px-3 sm:px-4 md:px-5 focus:ring-2 outline-none bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all duration-300 text-base disabled:opacity-50 shadow-inner backdrop-blur-sm md:h-14 ${
                            isListening
                                ? 'border-red-400 dark:border-red-500/70 focus:ring-red-500/30'
                                : 'border-slate-300 dark:border-slate-700 focus:ring-amber-500/50 focus:border-amber-500'
                        }`}
                        placeholder={t.chat_input_placeholder || 'Ask a question...'}
                        value={input}
                        onChange={(event) => onInputChange(event.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isLoading}
                        readOnly={isListening}
                    />

                    {/* Voice Control (starts or stops live browser speech recognition) */}
                    <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        disabled={isLoading || !isVoiceSupported}
                        aria-label={isListening ? t.voice_stop : t.voice_start}
                        aria-pressed={isListening}
                        title={isVoiceSupported ? (isListening ? t.voice_stop : t.voice_start) : t.voice_unsupported}
                        className={`relative h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl border transition-all shadow-md flex items-center justify-center shrink-0 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 ${
                            isListening
                                ? 'bg-red-500 text-white border-red-400 shadow-red-500/25 hover:bg-red-600'
                                : 'bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:text-amber-600 hover:border-amber-400 dark:hover:text-amber-400 dark:hover:border-amber-500/60'
                        }`}
                    >
                        {isListening && <span className="absolute inset-0 rounded-2xl bg-red-500 animate-ping opacity-20" aria-hidden="true" />}
                        {isListening ? <MicOff size={20} className="relative" /> : <Mic size={20} />}
                    </button>

                    {/* Request Control (offers cancellation during a request and submission otherwise) */}
                    {isLoading ? (
                        <button onClick={onStop} className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-500/10 px-3 font-black text-red-600 shadow-md transition-all hover:bg-red-500 hover:text-white active:scale-[0.96] dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-400 md:h-14 md:rounded-2xl md:px-6" type="button">
                            <XCircle size={20} className="md:mr-2" />
                            <span className="hidden md:inline uppercase tracking-widest text-xs">Stop</span>
                        </button>
                    ) : (
                        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 font-black text-slate-200 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-500 active:scale-[0.96] disabled:opacity-50 disabled:grayscale md:h-14 md:rounded-2xl md:px-8" type="button">
                            <Send size={20} className="md:mr-2" />
                            <span className="hidden md:inline uppercase tracking-widest text-xs">{t.chat_btn_send || 'Send'}</span>
                        </button>
                    )}
                </div>

                {/* Voice Status (announces recording and actionable speech-recognition errors) */}
                {voiceStatusMessage && (
                    <p
                        className={`mt-2 px-1 text-xs font-semibold flex items-center gap-2 ${
                            voiceErrorMessage
                                ? 'text-red-600 dark:text-red-400'
                                : isListening
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-slate-500 dark:text-slate-400'
                        }`}
                        role={voiceErrorMessage ? 'alert' : 'status'}
                        aria-live="polite"
                    >
                        {isListening && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />}
                        {voiceStatusMessage}
                    </p>
                )}
            </div>
        </div>
    );
}
