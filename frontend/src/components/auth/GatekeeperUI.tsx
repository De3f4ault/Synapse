import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Lock,
    Unlock,
    Scan,
    Fingerprint,
    Eye,
    EyeOff,
    ShieldCheck
} from 'lucide-react';

// --- 1. Quantum Input Field (High Contrast Industrial Style) ---
// --- 1. Synapse Input Field (Clean Glass Style) ---
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
        <div className="mb-6 font-sans">
            <div className="flex justify-between items-end mb-2 px-1">
                <label
                    htmlFor={id || label}
                    className="text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                    {label}
                </label>
            </div>

            <div className={`
                relative flex items-center w-full h-12
                bg-[#ffffff08] border border-white/10 rounded-lg
                transition-all duration-300
                ${focused ? 'bg-[#ffffff0c] border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'hover:bg-[#ffffff0c] hover:border-white/20'}
                ${error ? 'border-red-500/50' : ''}
            `}>
                <div className={`px-3 ${focused ? 'text-cyan-400' : 'text-slate-500'}`}>
                    <Icon size={18} />
                </div>

                <input
                    id={id || label}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={disabled}
                    className="
                        flex-1 h-full bg-transparent border-none outline-none
                        text-slate-200 text-sm font-medium
                        placeholder-slate-600
                    "
                    placeholder={focused ? "Enter value..." : ""}
                    autoComplete="off"
                />

                {isPasswordType && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-3 text-slate-500 hover:text-slate-300 transition-colors bg-transparent"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 mt-2 text-xs text-red-400"
                >
                    <AlertTriangle size={12} />
                    <span>{error}</span>
                </motion.div>
            )}
        </div>
    );
};

// --- 2. Holographic Submit Button ---
// --- 2. Synapse Primary Button ---
export const BiometricScanner = ({ onClick, loading, label, disabled }: any) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            type="submit"
            className={`
                w-full h-12 mt-6 rounded-lg font-bold tracking-wide text-sm
                flex items-center justify-center gap-2
                transition-all duration-300
                ${disabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5'
                }
            `}
        >
            {loading ? (
                <>
                    <Scan size={18} className="animate-spin" />
                    <span>PROCESSING...</span>
                </>
            ) : (
                <>
                    <Fingerprint size={18} />
                    {label}
                </>
            )}
        </button>
    );
};

// --- 3. Security Badge (Updated for darker theme) ---
// --- 3. Synapse Security Icon ---
export const SecurityBadge = ({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) => {
    return (
        <div className="flex flex-col items-center justify-center mb-8 relative z-20">
            <div className={`
                relative w-20 h-20 rounded-2xl flex items-center justify-center
                transition-all duration-700
                bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                border border-white/10
                ${status === 'success' ? 'shadow-[0_0_40px_rgba(16,185,129,0.3)] border-emerald-500/50' :
                    status === 'error' ? 'shadow-[0_0_40px_rgba(239,68,68,0.3)] border-red-500/50' :
                        'shadow-[0_0_40px_rgba(6,182,212,0.2)] border-white/10'
                }
            `}>
                <AnimatePresence mode="wait">
                    {status === 'success' ? (
                        <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400">
                            <Unlock size={32} />
                        </motion.div>
                    ) : status === 'error' ? (
                        <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-red-400">
                            <AlertTriangle size={32} />
                        </motion.div>
                    ) : (
                        <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-cyan-400">
                            <Lock size={32} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- 4. Layout Container ---
// --- 4. Synapse Layout ---
export const GatekeeperLayout = ({ children, status }: { children: React.ReactNode, status: 'idle' | 'loading' | 'success' | 'error' }) => {
    return (
        <div className="w-full min-h-screen bg-[#020408] text-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-[400px] p-6"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <ShieldCheck className="text-white" size={24} />
                        </div>
                        <span className="font-sans text-2xl font-bold text-white tracking-tight">Synapse</span>
                    </div>
                    <p className="text-slate-400 text-sm">authenticate to continue</p>
                </div>

                {/* Glass Card */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    {/* Status Top Line */}
                    <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${status === 'success' ? 'bg-emerald-500' :
                        status === 'error' ? 'bg-red-500' :
                            'bg-gradient-to-r from-cyan-500 to-blue-500'
                        }`} />

                    {children}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-slate-500">
                    <p>Secured by Synapse Protocol v2.0</p>
                </div>

            </motion.div>
        </div>
    );
};
