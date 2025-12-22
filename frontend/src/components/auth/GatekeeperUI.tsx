import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Lock,
  Unlock,
  Scan,
  Fingerprint,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- 1. Synapse Input Field (Clean Glass Style) ---
export const QuantumInput = ({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  disabled,
  error,
  id,
}: any) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Toggle logic for password fields
  const isPasswordType = type === "password";
  const inputType = isPasswordType
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className="mb-5 font-sans">
      <div className="flex justify-between items-end mb-1.5 px-1">
        <label
          htmlFor={id || label}
          className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
        >
          {label}
        </label>
      </div>

      <div
        className={cn(
          "relative flex items-center w-full h-12 rounded-xl transition-all duration-300 border border-white/5",
          focused
            ? "bg-white/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            : "bg-black/20 hover:bg-white/5 hover:border-white/10",
          error && "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
        )}
      >
        <div
          className={cn(
            "px-4 transition-colors",
            focused ? "text-cyan-400" : "text-slate-500",
          )}
        >
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
                        text-white text-sm font-medium
                        placeholder:text-slate-600
                    "
          placeholder={focused ? "Enter value..." : ""}
          autoComplete="off"
        />

        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-3 text-slate-500 hover:text-cyan-400 transition-colors bg-transparent"
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
          className="flex items-center gap-1.5 mt-2 text-xs text-red-400 font-medium ml-1"
        >
          <AlertTriangle size={12} />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
};

// --- 2. Synapse Primary Button ---
export const BiometricScanner = ({
  onClick,
  loading,
  label,
  disabled,
}: any) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type="submit"
      className={cn(
        "w-full h-12 mt-6 rounded-xl font-bold tracking-wide text-sm flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group",
        disabled
          ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
          : "bg-cyan-500 text-black hover:bg-cyan-400 border border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-[0.98]",
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

      {/* Gloss Effect */}
      {!disabled && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
    </button>
  );
};

// --- 3. Synapse Security Icon ---
export const SecurityBadge = ({
  status,
}: {
  status: "idle" | "loading" | "success" | "error";
}) => {
  return (
    <div className="flex flex-col items-center justify-center mb-8 relative z-20">
      <div
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700 nm-inset",
          status === "success"
            ? "shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]"
            : status === "error"
              ? "shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]"
              : "shadow-[inset_4px_4px_8px_#050507,inset_-4px_-4px_8px_#15151e]",
        )}
      >
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
            >
              <Unlock size={32} strokeWidth={2.5} />
            </motion.div>
          ) : status === "error" ? (
            <motion.div
              key="error"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]"
            >
              <AlertTriangle size={32} strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.div
              key="lock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            >
              <Lock size={32} strokeWidth={2.5} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ring Animation for Loading */}
        {status === "loading" && (
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        )}
      </div>
    </div>
  );
};

// --- 4. Synapse Layout ---
export const GatekeeperLayout = ({
  children,
  status,
}: {
  children: React.ReactNode;
  status: "idle" | "loading" | "success" | "error";
}) => {
  return (
    <div className="w-full min-h-screen nm-bg nm-constellation-bg flex flex-col items-center justify-center relative overflow-hidden">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[400px] p-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl nm-inset flex items-center justify-center">
              <ShieldCheck className="text-cyan-400" size={24} />
            </div>
            <span className="font-sans text-3xl font-bold text-white tracking-tight">
              Synapse
            </span>
          </div>
          <p className="text-slate-400 text-sm tracking-widest uppercase">
            authenticate to continue
          </p>
        </div>

        {/* Glass Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Status Top Line (Glow) */}
          <div
            className={cn(
              "absolute top-0 left-0 w-full h-1 transition-all duration-500 shadow-[0_0_20px_ currentColor]",
              status === "success"
                ? "bg-emerald-500 shadow-emerald-500/50"
                : status === "error"
                  ? "bg-red-500 shadow-red-500/50"
                  : "bg-cyan-500 shadow-cyan-500/50",
            )}
          />

          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-500 uppercase tracking-widest">
          <p>Secured by Synapse Protocol v2.0</p>
        </div>
      </motion.div>
    </div>
  );
};
