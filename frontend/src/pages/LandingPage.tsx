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

const LandingPage = () => {
    const navigate = useNavigate();
    const { lang, t, toggleLanguage } = useLanguage();
    const { isDarkMode, toggleTheme } = useTheme({ storage: 'session', syncLocalStorage: true });

    const handleSelectRole = (role: UserRole) => {
        navigate('/login', { state: { role } });
    };

    const titleParts = t.landing_title.split(' ');
    const titleStart = lang === 'zh' ? t.landing_title.slice(0, 7) : titleParts[0];
    const titleEnd = lang === 'zh' ? t.landing_title.slice(7) : titleParts.slice(1).join(' ');

    return (
        <div className="h-[100dvh] flex items-center justify-center bg-[#f0f2f5] dark:bg-[#050505] relative overflow-hidden font-sans p-4 md:p-8 transition-colors duration-700">
            <EngineeringBackground variant="landing" />
            <PageControls
                lang={lang}
                isDarkMode={isDarkMode}
                onLanguageToggle={toggleLanguage}
                onThemeToggle={toggleTheme}
            />

            <m.div
                className="relative z-10 flex flex-col items-center w-full max-w-5xl mt-8 md:mt-16"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
            >
                <m.div className="text-center mb-10 md:mb-16 flex flex-col items-center" variants={staggerContainer}>
                    <BrandLogo />

                    <m.h1 className="text-3xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-2 md:mb-4 tracking-tight transition-colors duration-500" variants={fadeUp}>
                        {titleStart}
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 ml-2">
                            {titleEnd}
                        </span>
                    </m.h1>
                    <m.p className="text-slate-600 dark:text-slate-400 text-[10px] md:text-base font-semibold tracking-widest uppercase transition-colors duration-500" variants={fadeUp}>
                        {t.landing_subtitle}
                    </m.p>
                </m.div>

                <m.div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 w-full max-w-4xl px-4 md:px-0" variants={staggerContainer}>
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
