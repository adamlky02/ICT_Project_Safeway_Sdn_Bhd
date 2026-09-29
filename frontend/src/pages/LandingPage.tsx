import { ArrowRight } from 'lucide-react';
import { m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { EngineeringBackground } from '../components/EngineeringBackground';
import { PageControls } from '../components/PageControls';
import { BrandLogo } from '../components/landing/BrandLogo';
import { fadeUp, staggerContainer } from '../components/motion/presets';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';

// Landing Page (introduces the assistant and routes users to the selected portal)
const LandingPage = () => {
    // Page Controls (connect navigation, localization, and theme state)
    const navigate = useNavigate();
    const { lang, t, toggleLanguage } = useLanguage();
    const { isDarkMode, toggleTheme } = useTheme({ storage: 'session', syncLocalStorage: true });

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
                onAdminSelect={() => navigate('/login', { state: { role: 'admin' } })}
                adminLabel={t.admin_login || 'Administrator login'}
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

                {/* Staff Entry (keeps the primary journey to one clear line of action) */}
                <m.button
                    onClick={() => navigate('/login', { state: { role: 'staff' } })}
                    className="group relative inline-flex min-h-12 items-center gap-3 px-2 py-2 text-lg font-black tracking-tight text-slate-800 transition-colors hover:text-orange-600 dark:text-white dark:hover:text-amber-400 sm:text-xl"
                    variants={fadeUp}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                >
                    <span>{t.get_started || "Let's get started"}</span>
                    <ArrowRight size={21} className="transition-transform duration-300 group-hover:translate-x-1" />
                    <span className="absolute inset-x-2 bottom-1 h-px origin-left scale-x-50 bg-gradient-to-r from-amber-500 to-orange-500 transition-transform duration-300 group-hover:scale-x-100" />
                </m.button>
            </m.div>
        </div>
    );
};

export default LandingPage;
