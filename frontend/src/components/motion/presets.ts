import type { Variants } from 'motion/react';

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
};

export const fadeScale: Variants = {
    hidden: { opacity: 0, scale: 0.97, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        y: 6,
        transition: { duration: 0.18, ease: 'easeIn' },
    },
};

export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            delayChildren: 0.08,
            staggerChildren: 0.09,
        },
    },
};

export const modalBackdrop: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
};
