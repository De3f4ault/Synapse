import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Lock,
  Unlock,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- 1. Warm Input Field ---
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
          className="text-overline font-medium text-muted-foreground uppercase tracking-wider"
        >
          {label}
        </label>
      </div>

      <div
        className={cn(
          "relative flex items-center w-full h-12 rounded-lg transition-all duration-200 border",
          focused
            ? "bg-card border-[#3898ec] shadow-ring-focus"
            : "bg-card border-border hover:border-border",
          error && "border-destructive shadow-ring-error",
        )}
      >
        <div
          className={cn(
            "px-4 transition-colors",
            focused ? "text-[#3898ec]" : "text-muted-foreground",
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
            text-foreground text-sm font-medium
            placeholder:text-muted-foreground
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
          className="flex items-center gap-1.5 mt-2 text-xs text-destructive font-medium ml-1"
        >
          <AlertTriangle size={12} />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
};

// --- 2. Warm Primary Button ---
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
        "w-full h-12 mt-6 rounded-xl font-medium tracking-wide text-sm flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden group",
        disabled
          ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-ring-brand active:scale-[0.98]",
      )}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <Lock size={18} />
          {label}
        </>
      )}
    </button>
  );
};

// --- 3. Security Status Icon ---
export const SecurityBadge = ({
  status,
}: {
  status: "idle" | "loading" | "success" | "error";
}) => {
  return (
    <div className="flex flex-col items-center justify-center mb-8 relative z-20">
      <div
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 bg-muted border border-border",
          status === "success"
            ? "border-accent-olive bg-accent-olive/10"
            : status === "error"
              ? "border-destructive bg-destructive/10"
              : "border-border",
        )}
      >
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-accent-olive"
            >
              <Unlock size={32} strokeWidth={1.5} />
            </motion.div>
          ) : status === "error" ? (
            <motion.div
              key="error"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-destructive"
            >
              <AlertTriangle size={32} strokeWidth={1.5} />
            </motion.div>
          ) : (
            <motion.div
              key="lock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground"
            >
              <Lock size={32} strokeWidth={1.5} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ring Animation for Loading */}
        {status === "loading" && (
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        )}
      </div>
    </div>
  );
};

// --- 4. Warm Layout ---
export const GatekeeperLayout = ({
  children,
  status,
}: {
  children: React.ReactNode;
  status: "idle" | "loading" | "success" | "error";
}) => {
  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[400px] p-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
              <ShieldCheck className="text-primary" size={24} />
            </div>
            <span className="font-serif text-3xl font-medium text-foreground tracking-tight">
              Synapse
            </span>
          </div>
          <p className="text-muted-foreground text-sm tracking-wider uppercase">
            authenticate to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden">
          {/* Status Top Line */}
          <div
            className={cn(
              "absolute top-0 left-0 w-full h-0.5 transition-all duration-500",
              status === "success"
                ? "bg-accent-olive"
                : status === "error"
                  ? "bg-destructive"
                  : "bg-primary",
            )}
          />

          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-overline text-muted-foreground uppercase tracking-widest">
          <p>Secured by Synapse Protocol v2.0</p>
        </div>
      </motion.div>
    </div>
  );
};
