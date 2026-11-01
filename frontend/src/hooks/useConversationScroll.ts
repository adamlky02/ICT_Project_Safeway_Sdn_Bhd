import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { ChatMessage } from '../types';

const BOTTOM_THRESHOLD = 80;

export function useConversationScroll(messages: ChatMessage[], isLoading: boolean, resetKey: number) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const followingRef = useRef(true);
    const previousRef = useRef({ messages, resetKey });
    const [awayFromBottom, setAwayFromBottom] = useState(false);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const reduceMotion = useReducedMotion();

    const updatePosition = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const atBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= BOTTOM_THRESHOLD;
        followingRef.current = atBottom;
        setAwayFromBottom(!atBottom);
        if (atBottom) setHasNewMessages(false);
    }, []);

    const scrollToLatest = useCallback((smooth = false) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        followingRef.current = true;
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: smooth && !reduceMotion ? 'smooth' : 'instant' });
        setHasNewMessages(false);
        if (!smooth || reduceMotion) setAwayFromBottom(false);
    }, [reduceMotion]);

    useLayoutEffect(() => {
        const previous = previousRef.current;
        const last = messages[messages.length - 1];
        const ownMessageAdded = messages.length > previous.messages.length && last?.sender === 'user';
        const conversationChanged = previous.resetKey !== resetKey;
        if (conversationChanged || ownMessageAdded || followingRef.current) {
            scrollToLatest();
        } else if (messages !== previous.messages && last?.sender === 'bot' && !last.isDefault) {
            setHasNewMessages(true);
        }
        previousRef.current = { messages, resetKey };
    }, [messages, isLoading, resetKey, scrollToLatest]);

    // Follow image/layout/viewport changes only while the reader is at the bottom.
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;
        const observer = new ResizeObserver(() => {
            if (followingRef.current) scrollToLatest();
            else updatePosition();
        });
        observer.observe(viewport);
        observer.observe(content);
        return () => observer.disconnect();
    }, [scrollToLatest, updatePosition]);

    return { viewportRef, contentRef, awayFromBottom, hasNewMessages, updatePosition, scrollToLatest };
}
