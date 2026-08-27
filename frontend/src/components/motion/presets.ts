import type { Variants } from 'motion/react';

// Fade-up Motion (reveals content with a short upward transition)
export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
};

// Fade-scale Motion (animates panels and dialogs entering or leaving)
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

// Staggered Motion (delays child reveals to create a readable sequence)
export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            delayChildren: 0.08,
            staggerChildren: 0.09,
        },
    },
};

// Modal Backdrop Motion (fades the page overlay behind dialogs)
export const modalBackdrop: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
};
