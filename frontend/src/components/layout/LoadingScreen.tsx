import { Atom } from 'lucide-react';

export const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 nm-bg nm-constellation-bg flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-6">
                <div className="relative w-24 h-24 rounded-full nm-inset flex items-center justify-center">
                    {/* Spinning Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />

                    {/* Inner Glow */}
                    <div className="absolute inset-4 rounded-full bg-cyan-500/10 blur-xl animate-pulse" />

                    {/* Icon */}
                    <Atom className="w-8 h-8 text-cyan-400 animate-pulse relative z-10" />
                </div>

                <div className="flex flex-col items-center gap-1">
                    <span className="text-cyan-400 font-mono font-bold tracking-[0.3em] text-sm animate-pulse">
                        SYNAPSE
                    </span>
                    <span className="text-slate-500 text-[10px] tracking-widest uppercase">
                        Initializing
                    </span>
                </div>
            </div>
        </div>
    );
};
