import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Lock,
    Unlock,
    Scan,
    Fingerprint,
    Globe,
    Eye,
    EyeOff,
    Terminal,
    Cpu,
    ShieldCheck
} from 'lucide-react';

// --- 1. Quantum Input Field (High Contrast Industrial Style) ---
export const QuantumInput = ({
    label,
    icon: Icon,
    type = "text",
    value,
    onChange,
    disabled,
    error,
    id
}: any) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Toggle logic for password fields
    const isPasswordType = type === 'password';
    const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="mb-8 relative font-mono">
        {/* Label - Floating Above, Digital Style */}
        <div className="flex justify-between items-end mb-2 px-1">
        <label
        htmlFor={id || label}
        className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${focused ? 'text-cyan-400' : 'text-slate-500'}`}
        >
        {label}
        </label>
        {error && (
            <span className="text-[9px] text-red-500 flex items-center gap-1 animate-pulse">
            <AlertTriangle size={10} /> ERROR
            </span>
        )}
        </div>

        {/* The Physical Input Block */}
        <div className={`
            relative flex h-14 w-full transition-transform duration-200
            ${focused ? 'translate-x-1' : ''}
            `}>

            {/* A. Dark Icon Module */}
            <div className={`
                w-14 h-full flex items-center justify-center shrink-0
                bg-[#0F1115] border-y border-l
                ${focused ? 'border-cyan-500 text-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]' : 'border-white/10 text-slate-600'}
                transition-all duration-300
                `}>
                <Icon size={20} />
                </div>

                {/* B. Solid Light Input Module (The "Paper" look) */}
                <div className={`
                    flex-1 relative h-full
                    bg-[#FFFDE7] /* Specific Cream Color */
                    border-y border-r
                    ${focused ? 'border-cyan-500' : 'border-white/10'}
                    transition-colors duration-300
                    `}>
                    <input
                    id={id || label}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={disabled}
                    className="
                    w-full h-full bg-transparent border-none outline-none
                    text-black font-bold text-base px-4 font-mono
                    placeholder-slate-400/50
                    "
                    placeholder={focused ? "" : "..."}
                    autoComplete="off"
                    style={{ caretColor: 'black' }}
                    />

                    {/* Password Toggle (Dark on Light) */}
                    {isPasswordType && (
                        <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-slate-400 hover:text-black transition-colors bg-transparent z-20"
                        tabIndex={-1}
                        >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                    </div>

                    {/* C. Focus Glow Bracket (The "Cyber" accent) */}
                    <div className={`
                        absolute -bottom-2 -left-1 w-[calc(100%+8px)] h-[calc(100%+16px)]
                        border-b-2 border-cyan-500/0 pointer-events-none
                        transition-all duration-500
                        ${focused ? 'opacity-100 border-cyan-500 shadow-[0_10px_20px_-5px_rgba(6,182,212,0.3)]' : 'opacity-0'}
                        `}>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500" />
                        </div>
                        </div>

                        {/* Error Message Detail */}
                        {error && (
                            <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -bottom-6 left-0 text-[10px] text-red-400 font-mono"
                            >
                            {error}
                            </motion.div>
                        )}
                        </div>
    );
};

// --- 2. Holographic Submit Button ---
export const BiometricScanner = ({ onClick, loading, label, disabled }: any) => {
    return (
        <button
        onClick={onClick}
        disabled={disabled || loading}
        type="submit"
        className="group relative w-full h-16 mt-4 overflow-hidden bg-black border border-white/20 transition-all hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1"
        >
        {/* Striped Background */}
        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#06b6d4_10px,#06b6d4_11px)] group-hover:opacity-30 transition-opacity" />

        <div className="relative z-10 flex items-center justify-center gap-3 font-black tracking-[0.2em] text-sm uppercase text-white group-hover:text-cyan-50 transition-colors">
        {loading ? (
            <>
            <Scan size={20} className="animate-spin text-cyan-400" />
            <span className="animate-pulse">VERIFYING...</span>
            </>
        ) : (
            <>
            <Fingerprint size={20} className="text-cyan-500 group-hover:text-white transition-colors" />
            {label}
            </>
        )}
        </div>

        {/* Tech Corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50 group-hover:border-cyan-400 transition-colors" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50 group-hover:border-cyan-400 transition-colors" />
        </button>
    );
};

// --- 3. Security Badge (Updated for darker theme) ---
export const SecurityBadge = ({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) => {
    return (
        <div className="flex flex-col items-center justify-center mb-12 relative z-20">
        {/* Main Circle */}
        <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 bg-black/50 backdrop-blur-sm border-2 ${
            status === 'success' ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)]' :
            status === 'error' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' :
            'border-cyan-900 shadow-[0_0_30px_rgba(6,182,212,0.1)]'
        }`}>

        {/* Inner Icon */}
        <AnimatePresence mode="wait">
        {status === 'success' ? (
            <motion.div key="success" initial={{scale:0}} animate={{scale:1}} className="text-emerald-400"><Unlock size={36} strokeWidth={1.5} /></motion.div>
        ) : status === 'error' ? (
            <motion.div key="error" initial={{scale:0}} animate={{scale:1}} className="text-red-500"><AlertTriangle size={36} strokeWidth={1.5} /></motion.div>
        ) : (
            <motion.div key="lock" initial={{opacity: 0}} animate={{opacity: 1}} className="text-cyan-500/80"><Lock size={36} strokeWidth={1.5} /></motion.div>
        )}
        </AnimatePresence>

        {/* Orbiting Dot */}
        {status === 'loading' && (
            <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
        )}
        </div>

        {/* Text Status */}
        <div className="mt-4 flex items-center gap-2 px-4 py-1 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
        <div className={`w-2 h-2 rounded-full ${status === 'success' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-cyan-500'} animate-pulse`} />
        <span className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase">
        {status === 'success' ? 'ACCESS GRANTED' : status === 'error' ? 'ACCESS DENIED' : 'SECURE GATEWAY v8.2'}
        </span>
        </div>
        </div>
    );
};

// --- 4. Layout Container ---
export const GatekeeperLayout = ({ children, status }: { children: React.ReactNode, status: 'idle' | 'loading' | 'success' | 'error' }) => {
    return (
        <div className="w-full min-h-screen bg-[#050505] text-slate-200 font-sans flex flex-col items-center relative overflow-hidden selection:bg-cyan-500/30 selection:text-white">

        {/* --- BACKGROUND LAYERS --- */}
        <div className="absolute inset-0 z-0">
        {/* Deep Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#111827_0%,#000000_70%)]" />

        {/* Grid Floor */}
        <div className="absolute bottom-0 w-full h-[40vh] bg-[linear-gradient(transparent,rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,transparent,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:30px_30px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom" />

        {/* Floating Particles */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
        </div>

        {/* --- CONTENT --- */}
        <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[440px] px-6 pt-[8vh]"
        >
        {/* Header */}
        <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-2">
        <ShieldCheck className="text-cyan-500" size={28} />
        <span className="font-sans text-3xl font-black text-white tracking-[0.2em]">NEXUS</span>
        </div>
        <div className="h-px w-full max-w-[120px] mx-auto bg-gradient-to-r from-transparent via-cyan-900 to-transparent" />
        </div>

        {/* The Form Card - Glass + Border */}
        <div className="relative">
        {/* Status Border Top */}
        <div className={`absolute -top-px left-0 w-full h-1 z-20 transition-all duration-500 ${
            status === 'success' ? 'bg-emerald-500 shadow-[0_0_20px_#10b981]' :
            status === 'error' ? 'bg-red-500 shadow-[0_0_20px_#ef4444]' :
            'bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50'
        }`} />

        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 shadow-2xl relative">
        {children}
        </div>

        {/* Decorative Bottom Bar */}
        <div className="h-2 w-full bg-[#0F1115] border-t border-white/10 flex items-center gap-1 px-2">
        <div className="w-1 h-1 bg-cyan-900 rounded-full" />
        <div className="w-1 h-1 bg-cyan-900 rounded-full" />
        <div className="w-1 h-1 bg-cyan-900 rounded-full" />
        <div className="flex-1" />
        <span className="text-[8px] font-mono text-cyan-900">ENCRYPTED</span>
        </div>
        </div>

        {/* Footer Text */}
        <div className="mt-8 text-center">
        <div className="text-[9px] font-mono text-slate-600 flex justify-center items-center gap-2">
        <Terminal size={10} />
        <span>ESTABLISHING SECURE UPLINK...</span>
        </div>
        </div>

        </motion.div>
        </div>
    );
};
