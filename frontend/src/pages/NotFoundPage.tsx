import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Terminal,
    WifiOff, ShieldAlert, Activity,
    Ban, Search, RefreshCw, ZapOff, Home,
    AlertOctagon, FileWarning
} from 'lucide-react';

// Reuse your existing Gatekeeper components for consistency
import { GatekeeperLayout, SecurityBadge } from '@/components/auth/GatekeeperUI';

// --- 1. Glitch Text Component (Critical Failure Mode) ---
const GlitchText = ({ text }: { text: string }) => {
    return (
        <div className="relative inline-block group select-none">
        <motion.span
        className="absolute top-0 left-0 -ml-1 text-red-600 opacity-80 mix-blend-color-dodge blur-[1px]"
        animate={{ x: [-3, 3, -1, 0], y: [2, -2, 0], opacity: [0.8, 0.4, 0.8] }}
        transition={{ repeat: Infinity, duration: 0.15, repeatType: "mirror" }}
        >
        {text}
        </motion.span>
        <motion.span
        className="absolute top-0 left-0 ml-1 text-amber-600 opacity-80 mix-blend-color-dodge blur-[1px]"
        animate={{ x: [3, -3, 1, 0], y: [-2, 2, 0], opacity: [0.8, 0.4, 0.8] }}
        transition={{ repeat: Infinity, duration: 0.2, repeatType: "mirror" }}
        >
        {text}
        </motion.span>
        <span className="relative text-[#E0E0E0] font-black tracking-widest text-7xl md:text-9xl drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
        {text}
        </span>
        {/* Burn-in effect */}
        <span className="absolute inset-0 text-transparent stroke-2 stroke-white/10 pointer-events-none" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}>
        {text}
        </span>
        </div>
    );
};

// --- 2. Gravity Well (The "Negated" Core) ---
// This replaces the biometric scanner with a "Collapsed" visual
const GravityWell = () => (
    <div className="relative w-full h-64 flex items-center justify-center pointer-events-none select-none my-8">
    {/* Dark Matter Haze */}
    <div className="absolute inset-0 bg-gradient-to-br from-black via-red-950/20 to-black blur-[60px] rounded-full opacity-80" />

    <div className="relative w-full h-full flex items-center justify-center">
    {/* The Event Horizon (Collapsed Core) */}
    <motion.div
    className="relative z-20 w-32 h-32 rounded-full bg-black shadow-[inset_0_0_40px_rgba(0,0,0,1),0_0_50px_rgba(220,38,38,0.4)] border border-red-900/50 flex items-center justify-center overflow-hidden"
    animate={{ scale: [1, 0.98, 1] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#450a0a_100%)] opacity-60" />
    <ZapOff size={48} className="text-red-900/50 relative z-10" />
    </motion.div>

    {/* Accretion Disk (Heavy Particles) */}
    {[1, 2, 3].map((i) => (
        <motion.div
        key={i}
        className="absolute rounded-full border border-dashed border-amber-900/30"
        style={{
            width: `${140 + i * 50}px`,
            height: `${140 + i * 50}px`,
            borderWidth: i === 1 ? '2px' : '1px'
        }}
        animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
        transition={{ duration: 60 + i * 20, repeat: Infinity, ease: "linear" }}
        >
        {/* Heavy Debris */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-1 bg-red-800/60 shadow-[0_0_10px_rgba(180,50,50,0.5)] blur-[1px]" />
        </motion.div>
    ))}

    {/* Gravitational Lensing (Distortion) */}
    <div className="absolute inset-0 rounded-full border border-white/5 opacity-20 scale-125 animate-pulse" />
    </div>
    </div>
);

// --- 3. Corrupted Log (Negated Data Stream) ---
const CorruptedLog = () => {
    const [lines, setLines] = useState<string[]>([]);

    useEffect(() => {
        const logs = [
            "SYSTEM_FAILURE: Sector 7 collapsed.",
            "WARNING: Structural integrity < 12%",
            "ERROR: Gravity anchors failing...",
            "CRITICAL: Reality bleed detected.",
            "Attempting containment...",
            "CONTAINMENT FAILED.",
            "Please manual evac..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < logs.length) {
                setLines(prev => [...prev, logs[i]]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 600);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full relative mt-8 group font-mono">
        {/* Container */}
        <div className="rounded-sm border border-red-900/30 bg-[#080202] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a0505] border-b border-red-900/20">
        <div className="flex items-center gap-2">
        <Terminal size={12} className="text-amber-700"/>
        <span className="text-[10px] uppercase tracking-wider text-red-900/60">BLACKBOX_RECORDER</span>
        </div>
        <div className="flex gap-1.5 opacity-50">
        <div className="w-1.5 h-1.5 rounded-full bg-red-900" />
        <div className="w-1.5 h-1.5 rounded-full bg-red-900" />
        </div>
        </div>

        <div className="p-4 text-xs h-32 overflow-hidden flex flex-col justify-end relative">
        {/* Scanline */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent h-[4px] w-full animate-[scan_4s_linear_infinite] opacity-30 pointer-events-none" />

        {lines.map((line, i) => (
            <motion.div
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-1.5 border-l-2 border-transparent pl-2"
            >
            <span className="text-red-900/50 mr-2 text-[10px]">{`>>`}</span>
            <span className={line.includes("FAILED") || line.includes("CRITICAL") ? "text-red-500 text-shadow-sm shadow-red-900/50" : "text-amber-700/70"}>
            {line}
            </span>
            </motion.div>
        ))}
        </div>
        </div>
        </div>
    );
};

// --- 4. Industrial Action Button (Matches Login Style) ---
const IndustrialButton = ({ onClick, icon: Icon, label, variant = 'primary' }: any) => (
    <button
    onClick={onClick}
    className={`group relative w-full h-14 mt-3 overflow-hidden border transition-all active:translate-y-1 flex items-center justify-center gap-3 ${
        variant === 'primary'
        ? 'bg-[#120505] border-red-900/40 hover:border-amber-600/50 hover:bg-[#1a0808] shadow-[0_4px_20px_rgba(0,0,0,0.8)]'
        : 'bg-transparent border-white/5 hover:border-white/20 hover:bg-white/5 text-slate-500 hover:text-slate-300'
    }`}
    >
    {/* Texture */}
    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

    {/* Highlight */}
    {variant === 'primary' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-900/50 to-transparent opacity-50" />
    )}

    <div className={`relative z-10 flex items-center gap-3 font-bold tracking-[0.25em] text-xs uppercase transition-colors ${
        variant === 'primary' ? 'text-amber-700/80 group-hover:text-amber-500' : 'text-slate-600 group-hover:text-slate-400'
    }`}>
    <Icon size={16} className={variant === 'primary' ? "text-red-800 group-hover:text-amber-600 transition-colors" : "opacity-50"} />
    {label}
    </div>

    {/* Corners */}
    {variant === 'primary' && (
        <>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-900/60" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-900/60" />
        </>
    )}
    </button>
);

// --- MAIN PAGE ---

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <GatekeeperLayout status="error">
        {/* 1. Header: Uses Gatekeeper's SecurityBadge in Error Mode */}
        <SecurityBadge status="error" />

        {/* 2. Visualizer: Replaces the Login Form with the Gravity Well */}
        <div className="text-center relative z-10">
        <div className="mb-4 flex items-center justify-center gap-3 text-red-600/80 font-mono text-xs tracking-[0.3em] uppercase opacity-80">
        <AlertOctagon size={16} />
        <span>Protocol 404 // Breach</span>
        </div>

        <div className="relative inline-block mb-6">
        <GlitchText text="VOID" />
        <div className="absolute -bottom-4 right-0 text-[10px] font-mono text-amber-700/60 bg-black/80 px-2 py-0.5 border border-red-900/30 rotate-3">
        SECTOR_NULL
        </div>
        </div>

        <p className="text-slate-500 text-sm font-mono leading-relaxed max-w-sm mx-auto border-l-2 border-red-900/30 pl-4 mb-8">
        Coordinates valid but empty. The local reality anchor has failed.
        </p>
        </div>

        {/* 3. The Gravity Well (Visual Centerpiece) */}
        <GravityWell />

        {/* 4. Controls: Negated Action Buttons */}
        <div className="space-y-3">
        <IndustrialButton
        onClick={() => navigate('/')}
        icon={Home}
        label="Emergency Evac (Home)"
        variant="primary"
        />
        <IndustrialButton
        onClick={() => window.history.back()}
        icon={RefreshCw}
        label="Retry Signal Handshake"
        variant="secondary"
        />
        </div>

        {/* 5. Footer: System Logs */}
        <CorruptedLog />

        {/* Floating Ash Particles (Overlay) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
            <motion.div
            key={i}
            className="absolute w-1 h-1 bg-red-500/10 rounded-full blur-[1px]"
            style={{
                left: `${Math.random() * 100}%`,
                                      top: -20
            }}
            animate={{
                y: ['0vh', '100vh'],
                x: [0, (Math.random() - 0.5) * 50],
                                      opacity: [0, 0.5, 0]
            }}
            transition={{
                duration: Math.random() * 10 + 10,
                                      repeat: Infinity,
                                      ease: "linear",
                                      delay: Math.random() * 10
            }}
            />
        ))}
        </div>

        </GatekeeperLayout>
    );
}
