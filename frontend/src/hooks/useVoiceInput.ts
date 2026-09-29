import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types';

// Speech Recognition Types (covers the browser API and its WebKit-prefixed variant)
interface BrowserSpeechRecognitionAlternative {
    transcript: string;
}

interface BrowserSpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    readonly [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
    readonly length: number;
    readonly [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
    readonly results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}

interface BrowserSpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend: (() => void) | null;
    onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
    onstart: (() => void) | null;
    abort: () => void;
    start: () => void;
    stop: () => void;
}

interface SpeechRecognitionConstructor {
    new (): BrowserSpeechRecognition;
}

interface SpeechRecognitionWindow extends Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export type VoiceInputError =
    | 'permission-denied'
    | 'microphone-unavailable'
    | 'network'
    | 'no-speech'
    | 'start-failed'
    | null;

interface UseVoiceInputOptions {
    disabled: boolean;
    language: Language;
    value: string;
    onTranscriptChange: (value: string) => void;
}

interface VoiceInputControls {
    abortListening: () => void;
    error: VoiceInputError;
    isListening: boolean;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
}

// Recognition Languages (aligns transcription with the language selected in the app)
const recognitionLanguages: Record<Language, string> = {
    en: 'en-MY',
    ms: 'ms-MY',
    zh: 'zh-CN',
};

// API Detection (supports both the standard and WebKit browser implementations)
function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

// Error Normalization (turns browser-specific failure names into UI-safe states)
function normalizeRecognitionError(error: string): VoiceInputError {
    switch (error) {
        case 'not-allowed':
        case 'service-not-allowed':
            return 'permission-denied';
        case 'audio-capture':
            return 'microphone-unavailable';
        case 'network':
            return 'network';
        case 'no-speech':
            return 'no-speech';
        case 'aborted':
            return null;
        default:
            return 'start-failed';
    }
}

// Voice Input Hook (streams recognized speech into an existing text draft)
export function useVoiceInput({
    disabled,
    language,
    value,
    onTranscriptChange,
}: UseVoiceInputOptions): VoiceInputControls {
    const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
    const baseDraftRef = useRef('');
    const onTranscriptChangeRef = useRef(onTranscriptChange);
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<VoiceInputError>(null);
    const isSupported = getSpeechRecognitionConstructor() !== null
        && (typeof window === 'undefined' || window.isSecureContext);

    useEffect(() => {
        onTranscriptChangeRef.current = onTranscriptChange;
    }, [onTranscriptChange]);

    // Session Disposal (prevents late recognition events from changing a sent message)
    const abortListening = useCallback(() => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            setIsListening(false);
            return;
        }

        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognitionRef.current = null;
        recognition.abort();
        setIsListening(false);
    }, []);

    // Graceful Stop (keeps the most recent final recognition result in the draft)
    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    // Session Start (captures the current draft and appends live speech to it)
    const startListening = useCallback(() => {
        if (disabled || recognitionRef.current) {
            return;
        }

        const SpeechRecognition = getSpeechRecognitionConstructor();
        if (!SpeechRecognition || !window.isSecureContext) {
            setError('start-failed');
            return;
        }

        const recognition = new SpeechRecognition();
        baseDraftRef.current = value.trimEnd();
        setError(null);

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = recognitionLanguages[language];

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
            let spokenText = '';

            for (let index = 0; index < event.results.length; index += 1) {
                spokenText += event.results[index][0]?.transcript ?? '';
            }

            const nextDraft = [baseDraftRef.current, spokenText.trim()]
                .filter(Boolean)
                .join(' ');
            onTranscriptChangeRef.current(nextDraft);
        };
        recognition.onerror = (event) => {
            setError(normalizeRecognitionError(event.error));
        };
        recognition.onend = () => {
            recognitionRef.current = null;
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch {
            recognitionRef.current = null;
            setError('start-failed');
            setIsListening(false);
        }
    }, [disabled, language, value]);

    // Request and Lifecycle Cleanup (stops capture while sending and after unmounting)
    useEffect(() => {
        if (disabled && recognitionRef.current) {
            abortListening();
        }
    }, [abortListening, disabled]);

    useEffect(() => abortListening, [abortListening]);

    return {
        abortListening,
        error,
        isListening,
        isSupported,
        startListening,
        stopListening,
    };
}
