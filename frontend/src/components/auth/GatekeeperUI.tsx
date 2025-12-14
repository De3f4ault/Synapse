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
import { GridPattern } from '@/components/ui/grid-pattern';
import { cn } from '@/lib/utils';

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
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                    {label}
                </label>
            </div>

            <div className={cn(
                "relative flex items-center w-full h-12 rounded-lg transition-all duration-300 border",
                focused
                    ? "bg-background border-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
                    : "bg-muted/50 border-input hover:bg-muted hover:border-input/80",
                error && "border-destructive/50"
            )}>
                <div className={cn("px-3 transition-colors", focused ? "text-primary" : "text-muted-foreground")}>
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
                        text-foreground text-sm font-medium
                        placeholder:text-muted-foreground/50
                    "
                    placeholder={focused ? "Enter value..." : ""}
                    autoComplete="off"
                />

                {isPasswordType && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-3 text-muted-foreground hover:text-foreground transition-colors bg-transparent"
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
                    className="flex items-center gap-1.5 mt-2 text-xs text-destructive"
                >
                    <AlertTriangle size={12} />
                    <span>{error}</span>
                </motion.div>
            )}
        </div>
    );
};

// --- 2. Synapse Primary Button ---
export const BiometricScanner = ({ onClick, loading, label, disabled }: any) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            type="submit"
            className={cn(
                "w-full h-12 mt-6 rounded-lg font-bold tracking-wide text-sm flex items-center justify-center gap-2 transition-all duration-300",
                disabled
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
            )}
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

// --- 3. Synapse Security Icon ---
export const SecurityBadge = ({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) => {
    return (
        <div className="flex flex-col items-center justify-center mb-8 relative z-20">
            <div className={cn(
                "relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-700 backdrop-blur-xl border",
                status === 'success' ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]" :
                    status === 'error' ? "bg-destructive/10 border-destructive/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]" :
                        "bg-primary/10 border-primary/20 shadow-[0_0_40px_hsl(var(--primary)/0.2)]"
            )}>
                <AnimatePresence mode="wait">
                    {status === 'success' ? (
                        <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                            <Unlock size={32} />
                        </motion.div>
                    ) : status === 'error' ? (
                        <motion.div key="error" initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-destructive">
                            <AlertTriangle size={32} />
                        </motion.div>
                    ) : (
                        <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary">
                            <Lock size={32} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- 4. Synapse Layout ---
export const GatekeeperLayout = ({ children, status }: { children: React.ReactNode, status: 'idle' | 'loading' | 'success' | 'error' }) => {
    return (
        <div className="w-full min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden">
            <GridPattern className="opacity-50" />

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
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <ShieldCheck className="text-primary-foreground" size={24} />
                        </div>
                        <span className="font-sans text-2xl font-bold text-foreground tracking-tight">Synapse</span>
                    </div>
                    <p className="text-muted-foreground text-sm">authenticate to continue</p>
                </div>

                {/* Glass Card */}
                <div className="backdrop-blur-xl bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    {/* Status Top Line */}
                    <div className={cn(
                        "absolute top-0 left-0 w-full h-1 transition-colors duration-500",
                        status === 'success' ? "bg-emerald-500" :
                            status === 'error' ? "bg-destructive" :
                                "bg-primary"
                    )} />

                    {children}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-muted-foreground">
                    <p>Secured by Synapse Protocol v2.0</p>
                </div>

            </motion.div>
        </div>
    );
};
