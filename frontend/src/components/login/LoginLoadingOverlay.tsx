import { Loader2 } from 'lucide-react';
import { m } from 'motion/react';
import { fadeScale, modalBackdrop } from '../motion/presets';

interface LoginLoadingOverlayProps {
    title: string;
    description: string;
    warning: string;
}

export function LoginLoadingOverlay({ title, description, warning }: LoginLoadingOverlayProps) {
    return (
        <m.div
            className="absolute inset-0 z-50 bg-slate-100/60 dark:bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-center"
            variants={modalBackdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            <m.div
                className="bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 p-8 rounded-3xl shadow-2xl dark:shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col items-center max-w-sm w-full mx-4 text-center"
                variants={fadeScale}
            >
                <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-wide uppercase">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    {description}
                    <br /><br />
                    <span className="italic text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/20 font-bold uppercase tracking-widest">
                        {warning}
                    </span>
                </p>
            </m.div>
        </m.div>
    );
}
