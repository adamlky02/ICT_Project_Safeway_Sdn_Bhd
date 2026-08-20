interface EngineeringBackgroundProps {
    variant?: 'landing' | 'login' | 'workspace';
}

export function EngineeringBackground({ variant = 'workspace' }: EngineeringBackgroundProps) {
    if (variant === 'landing') {
        return (
            <>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-40 dark:opacity-60" />
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-[100px] pointer-events-none z-0" />
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-amber-400/30 dark:bg-amber-600/20 blur-[100px] md:blur-[140px] mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
                    <div className="absolute top-[20%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-orange-400/30 dark:bg-orange-600/20 blur-[100px] md:blur-[140px] mix-blend-multiply dark:mix-blend-screen transition-all duration-1000 delay-300" />
                    <div className="absolute -bottom-[20%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-300/30 dark:bg-blue-900/20 blur-[100px] md:blur-[140px] mix-blend-multiply dark:mix-blend-screen transition-all duration-1000 delay-500" />
                </div>
            </>
        );
    }

    if (variant === 'login') {
        return (
            <>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 dark:opacity-100 pointer-events-none z-0 transition-opacity duration-700" />
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-400/20 dark:bg-amber-600/10 rounded-full blur-[120px] pointer-events-none transition-colors duration-700" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-orange-400/20 dark:bg-orange-600/10 rounded-full blur-[100px] pointer-events-none transition-colors duration-700" />
            </>
        );
    }

    return (
        <>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-40 dark:opacity-60 transition-opacity duration-700" />
            <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-600/10 rounded-full blur-[100px] pointer-events-none z-0 transition-colors duration-700" />
            <div className="absolute bottom-[20%] right-[-5%] w-[300px] h-[300px] bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-[80px] pointer-events-none z-0 transition-colors duration-700" />
        </>
    );
}
