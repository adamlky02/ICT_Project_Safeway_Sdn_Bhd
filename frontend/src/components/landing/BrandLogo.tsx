import { m, useReducedMotion } from 'motion/react';
import { fadeUp } from '../motion/presets';

export function BrandLogo() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <m.div className="relative mb-4 md:mb-7" variants={fadeUp}>
            <m.div
                className="will-change-transform"
                animate={shouldReduceMotion ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.035, y: -7 }}
            >
                <img
                    src="/safewaylogo.png"
                    alt="Safeway Logo"
                    className="brand-logo-aurora h-60 w-60 object-contain md:h-68 md:w-68"
                />
            </m.div>
        </m.div>
    );
}
