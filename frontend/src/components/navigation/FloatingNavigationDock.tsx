import type { ReactNode } from 'react';
import { m } from 'motion/react';

interface FloatingNavigationDockProps {
    isDarkMode: boolean;
    children: ReactNode;
    ariaLabel: string;
    className?: string;
}

// Floating Navigation Dock (keeps the shared Safeway navigation visible across workspaces)
export function FloatingNavigationDock({
    isDarkMode,
    children,
    ariaLabel,
    className = 'w-[calc(100vw-1.5rem)] lg:w-[min(64rem,calc(100vw-2rem))]',
}: FloatingNavigationDockProps) {
    return (
        <m.nav
            className={`pointer-events-auto relative h-20 overflow-visible ${className}`}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            aria-label={ariaLabel}
        >
            <div className="absolute inset-0 overflow-hidden rounded-b-[1.65rem] border-x-[0.5px] border-b-[0.5px] border-slate-300/45 bg-white/58 shadow-[0_18px_55px_rgba(15,23,42,0.11)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#090a0d]/68 dark:shadow-[0_22px_60px_rgba(0,0,0,0.28)]" />

            <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex h-20 w-28 -translate-x-1/2 items-center justify-center" aria-hidden="true">
                <img
                    src={isDarkMode ? '/safewaylogo.png' : '/safewaylogoblack.png'}
                    alt=""
                    className="h-28 w-36 max-w-none shrink-0 object-contain drop-shadow-[0_7px_16px_rgba(15,23,42,0.14)] dark:drop-shadow-[0_8px_18px_rgba(0,0,0,0.42)]"
                />
            </div>

            <div className="relative z-10 h-full">{children}</div>
        </m.nav>
    );
}
