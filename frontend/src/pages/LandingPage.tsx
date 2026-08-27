import { ShieldCheck, Users } from 'lucide-react';
import { m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { PageControls } from '../components/PageControls';
import { BrandLogo } from '../components/landing/BrandLogo';
import { RoleCard } from '../components/landing/RoleCard';
import { fadeUp, staggerContainer } from '../components/motion/presets';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import type { UserRole } from '../types';

// Landing Page (introduces the assistant and routes users to the selected portal)
const LandingPage = () => {
    // Page Controls (connect navigation, localization, and theme state)
    const navigate = useNavigate();
    const { lang, t, toggleLanguage } = useLanguage();
    const { isDarkMode, toggleTheme } = useTheme({ storage: 'session', syncLocalStorage: true });

    // Role Selection (opens the login page with the chosen portal role)
    const handleSelectRole = (role: UserRole) => {
        navigate('/login', { state: { role } });
    };

    // Localized Title Split (separates the brand title for gradient emphasis)
    const titleParts = t.landing_title.split(' ');
    const titleStart = lang === 'zh' ? t.landing_title.slice(0, 7) : titleParts[0];
    const titleEnd = lang === 'zh' ? t.landing_title.slice(7) : titleParts.slice(1).join(' ');

    return (
        <div className="min-h-[100svh] min-h-[100dvh] flex items-center justify-center bg-[#f0f2f5] dark:bg-[#050505] relative overflow-x-hidden overflow-y-auto font-sans px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(5.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-12 lg:px-8 transition-colors duration-700">
            {/* Page Background and Controls (provide ambient visuals plus language and theme actions) */}
            <EngineeringBackground variant="landing" />
            <PageControls
                lang={lang}
                isDarkMode={isDarkMode}
                onLanguageToggle={toggleLanguage}
                onThemeToggle={toggleTheme}
            />

            {/* Landing Content (reveals the brand introduction and portal choices in sequence) */}
            <m.div
                className="relative z-10 flex w-full max-w-5xl flex-col items-center"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
            >
                {/* Brand Introduction (shows the animated logo, company name, and product subtitle) */}
                <m.div className="mb-7 flex flex-col items-center text-center sm:mb-10 lg:mb-12" variants={staggerContainer}>
                    <BrandLogo />

                    <m.h1 className="mb-2 text-[clamp(1.875rem,6vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-slate-900 transition-colors duration-500 dark:text-white sm:mb-4" variants={fadeUp}>
                        {titleStart}
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 ml-2">
                            {titleEnd}
                        </span>
                    </m.h1>
                    <m.p className="max-w-2xl px-2 text-[clamp(0.65rem,1.8vw,1rem)] font-semibold uppercase leading-relaxed tracking-[0.16em] text-slate-600 transition-colors duration-500 dark:text-slate-400 sm:tracking-widest" variants={fadeUp}>
                        {t.landing_subtitle}
                    </m.p>
                </m.div>

                {/* Portal Choices (offers administrator and staff authentication paths) */}
                <m.div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:gap-8" variants={staggerContainer}>
                    <RoleCard
                        role="admin"
                        title={t.admin_role}
                        description={t.admin_desc}
                        icon={ShieldCheck}
                        accent="amber"
                        onSelect={handleSelectRole}
                    />
                    <RoleCard
                        role="staff"
                        title={t.staff_role}
                        description={t.staff_desc}
                        icon={Users}
                        accent="orange"
                        onSelect={handleSelectRole}
                    />
                </m.div>
            </m.div>
        </div>
    );
};

export default LandingPage;
