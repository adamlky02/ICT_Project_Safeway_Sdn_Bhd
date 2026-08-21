import type { ReactNode } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';

interface MotionProviderProps {
    children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
    return (
        <MotionConfig
            reducedMotion="user"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
            <LazyMotion features={domAnimation} strict>
                {children}
            </LazyMotion>
        </MotionConfig>
    );
}
