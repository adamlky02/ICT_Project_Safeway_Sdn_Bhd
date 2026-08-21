import { m, useReducedMotion } from 'motion/react';

export function AuroraBackground() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#fff7ed] transition-colors duration-700 dark:bg-[#05070c]">
            <m.div
                aria-hidden="true"
                className="aurora-field absolute -inset-[22%]"
                initial={false}
                animate={shouldReduceMotion
                    ? { backgroundPosition: '20% 30%' }
                    : {
                        backgroundPosition: ['10% 20%', '90% 35%', '55% 90%', '10% 20%'],
                    }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div aria-hidden="true" className="engineering-grid absolute inset-0 opacity-35 dark:opacity-45" />
            <div aria-hidden="true" className="aurora-vignette absolute inset-0" />
        </div>
    );
}
