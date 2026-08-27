import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import type { UserRole } from '../../types';
import { fadeUp } from '../motion/presets';

// Role Card Props (defines the copy, icon, accent, and selection callback)
interface RoleCardProps {
    role: UserRole;
    title: string;
    description: string;
    icon: LucideIcon;
    accent: 'amber' | 'orange';
    onSelect: (role: UserRole) => void;
}

// Role Card (renders an animated administrator or staff portal choice)
export function RoleCard({ role, title, description, icon: Icon, accent, onSelect }: RoleCardProps) {
    // Accent Selection (maps the role accent to its visual treatment)
    const isAdmin = accent === 'amber';

    return (
        <m.button
            onClick={() => onSelect(role)}
            variants={fadeUp}
            whileHover={{ y: -6, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            className={`group p-5 md:p-10 text-left flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 relative overflow-hidden transition-shadow duration-500
            bg-white/40 dark:bg-white/5
            backdrop-blur-3xl saturate-150
            border border-white/60 dark:border-white/10
            shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            ${isAdmin ? 'hover:shadow-[0_16px_48px_rgba(245,158,11,0.15)] dark:hover:shadow-[0_16px_48px_rgba(245,158,11,0.1)]' : 'hover:shadow-[0_16px_48px_rgba(234,88,12,0.15)] dark:hover:shadow-[0_16px_48px_rgba(234,88,12,0.1)]'}
            rounded-3xl md:rounded-[2.5rem]`}
            type="button"
        >
            {/* Card Surface (adds glass depth without intercepting clicks) */}
            <div className="absolute inset-0 rounded-3xl md:rounded-[2.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
            {/* Role Icon (shows the portal identity with its selected accent) */}
            <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 flex items-center justify-center md:mb-8 relative z-10 transition-transform duration-500 group-hover:scale-110 bg-gradient-to-br from-white/80 to-white/20 dark:from-white/10 dark:to-transparent backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] rounded-2xl md:rounded-[1.25rem]">
                <Icon className={`w-7 h-7 md:w-8 md:h-8 ${isAdmin ? 'text-amber-600 dark:text-amber-500' : 'text-orange-600 dark:text-orange-500'} drop-shadow-sm`} />
            </div>
            {/* Role Copy (explains the portal and indicates that the card is actionable) */}
            <div className="flex flex-col flex-1 relative z-10 w-full">
                <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white mb-1 md:mb-3 tracking-tight flex items-center w-full justify-between transition-colors">
                    {title}
                    <ChevronRight className={`w-5 h-5 md:w-6 md:h-6 text-slate-400 dark:text-slate-500 ${isAdmin ? 'group-hover:text-amber-500' : 'group-hover:text-orange-500'} transition-all transform group-hover:translate-x-1 shrink-0`} />
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-snug md:leading-relaxed font-medium transition-colors">
                    {description}
                </p>
            </div>
        </m.button>
    );
}
