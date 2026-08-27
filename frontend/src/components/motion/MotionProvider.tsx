import type { ReactNode } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';

// Motion Provider Props (accepts the application tree that receives shared animation settings)
interface MotionProviderProps {
    children: ReactNode;
}

// Motion Provider (loads animation features and honors the user's reduced-motion preference)
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
