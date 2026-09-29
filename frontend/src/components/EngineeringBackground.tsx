import { AuroraBackground } from './landing/AuroraBackground';

// Engineering Background Props (selects the visual treatment for each page context)
interface EngineeringBackgroundProps {
    variant?: 'landing' | 'login' | 'workspace';
}

// Engineering Background (renders landing, login, or workspace ambient layers)
export function EngineeringBackground({ variant = 'workspace' }: EngineeringBackgroundProps) {
    // Landing Background (delegates the animated hero backdrop to the aurora component)
    if (variant === 'landing') {
        return <AuroraBackground />;
    }

    // Login Background (renders a grid with warm corner glows)
    if (variant === 'login') {
        return (
            <>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 dark:opacity-100 pointer-events-none z-0 transition-opacity duration-700" />
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-400/20 dark:bg-amber-600/10 rounded-full blur-[120px] pointer-events-none transition-colors duration-700" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-orange-400/20 dark:bg-orange-600/10 rounded-full blur-[100px] pointer-events-none transition-colors duration-700" />
            </>
        );
    }

    // Workspace Background (renders restrained ambient layers behind working screens)
    return (
        <>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-40 dark:opacity-60 transition-opacity duration-700" />
            <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none z-0 transition-colors duration-700" />
            <div className="absolute bottom-[20%] right-[-5%] w-[300px] h-[300px] bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-[80px] pointer-events-none z-0 transition-colors duration-700" />
        </>
    );
}
