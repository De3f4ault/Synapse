import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertOctagon, Terminal, Home, RefreshCw, ZapOff } from "lucide-react";
import {
  SecurityBadge,
  GatekeeperLayout,
} from "@/components/auth/GatekeeperUI";

// --- 1. Glitch Text Component (Critical Failure Mode) ---
const GlitchText = ({ text }: { text: string }) => {
  return (
    <div className="relative inline-block group select-none">
      <motion.span
        className="absolute top-0 left-0 -ml-1 text-destructive opacity-80 mix-blend-color-dodge blur-[1px]"
        animate={{ x: [-3, 3, -1, 0], y: [2, -2, 0], opacity: [0.8, 0.4, 0.8] }}
        transition={{ repeat: Infinity, duration: 0.15, repeatType: "mirror" }}
      >
        {text}
      </motion.span>
      <motion.span
        className="absolute top-0 left-0 ml-1 text-primary opacity-80 mix-blend-color-dodge blur-[1px]"
        animate={{ x: [3, -3, 1, 0], y: [-2, 2, 0], opacity: [0.8, 0.4, 0.8] }}
        transition={{ repeat: Infinity, duration: 0.2, repeatType: "mirror" }}
      >
        {text}
      </motion.span>
      <span className="relative text-foreground font-black tracking-widest text-7xl md:text-9xl drop-shadow-2xl">
        {text}
      </span>
      {/* Burn-in effect */}
      <span
        className="absolute inset-0 text-transparent stroke-2 stroke-foreground/10 pointer-events-none"
        style={{ WebkitTextStroke: "1px currentColor" }}
      >
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
    <div className="absolute inset-0 bg-gradient-to-br from-destructive/20 via-background to-destructive/20 blur-[60px] rounded-full opacity-50" />

    <div className="relative w-full h-full flex items-center justify-center">
      {/* The Event Horizon (Collapsed Core) */}
      <motion.div
        className="relative z-20 w-32 h-32 rounded-full bg-black shadow-[inset_0_0_40px_rgba(0,0,0,1),0_0_50px_hsl(var(--destructive)/0.4)] border border-destructive/50 flex items-center justify-center overflow-hidden"
        animate={{ scale: [1, 0.98, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,hsl(var(--destructive))_100%)] opacity-60" />
        <ZapOff size={48} className="text-destructive relative z-10" />
      </motion.div>

      {/* Accretion Disk (Heavy Particles) */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-dashed border-input"
          style={{
            width: `${140 + i * 50}px`,
            height: `${140 + i * 50}px`,
            borderWidth: i === 1 ? "2px" : "1px",
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{
            duration: 60 + i * 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Heavy Debris */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-1 bg-destructive/60 shadow-[0_0_10px_hsl(var(--destructive)/0.5)] blur-[1px]" />
        </motion.div>
      ))}

      {/* Gravitational Lensing (Distortion) */}
      <div className="absolute inset-0 rounded-full border border-foreground/5 opacity-20 scale-125 animate-pulse" />
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
      "Please manual evac...",
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        const nextLine = logs[i];
        if (nextLine) {
          setLines((prev) => [...prev, nextLine]);
        }
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
      <div className="rounded-sm border border-destructive/30 bg-card overflow-hidden shadow-inner">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              BLACKBOX_RECORDER
            </span>
          </div>
          <div className="flex gap-1.5 opacity-50">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
          </div>
        </div>

        <div className="p-4 text-xs h-32 overflow-hidden flex flex-col justify-end relative">
          {/* Scanline */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-destructive/5 to-transparent h-[4px] w-full animate-[scan_4s_linear_infinite] opacity-30 pointer-events-none" />

          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-1.5 border-l-2 border-transparent pl-2"
            >
              <span className="text-muted-foreground mr-2 text-[10px]">{`>>`}</span>
              <span
                className={
                  line.includes("FAILED") || line.includes("CRITICAL")
                    ? "text-destructive font-bold"
                    : "text-muted-foreground"
                }
              >
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
const IndustrialButton = ({
  onClick,
  icon: Icon,
  label,
  variant = "primary",
}: any) => (
  <button
    onClick={onClick}
    className={`group relative w-full h-14 mt-3 overflow-hidden border transition-all active:translate-y-1 flex items-center justify-center gap-3 rounded-lg ${
      variant === "primary"
        ? "bg-card border-destructive/40 hover:border-primary/50 hover:bg-muted shadow-lg"
        : "bg-transparent border-border hover:border-foreground/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
    }`}
  >
    {/* Texture */}
    <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

    {/* Highlight */}
    {variant === "primary" && (
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-destructive/50 to-transparent opacity-50" />
    )}

    <div
      className={`relative z-10 flex items-center gap-3 font-bold tracking-[0.25em] text-xs uppercase transition-colors ${
        variant === "primary"
          ? "text-foreground group-hover:text-primary"
          : "text-muted-foreground group-hover:text-foreground"
      }`}
    >
      <Icon
        size={16}
        className={
          variant === "primary"
            ? "text-destructive group-hover:text-primary transition-colors"
            : "opacity-50"
        }
      />
      {label}
    </div>

    {/* Corners */}
    {variant === "primary" && (
      <>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-destructive/60" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-destructive/60" />
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
        <div className="mb-4 flex items-center justify-center gap-3 text-destructive font-mono text-xs tracking-[0.3em] uppercase opacity-80">
          <AlertOctagon size={16} />
          <span>Protocol 404 // Breach</span>
        </div>

        <div className="relative inline-block mb-6">
          <GlitchText text="VOID" />
          <div className="absolute -bottom-4 right-0 text-[10px] font-mono text-muted-foreground bg-background px-2 py-0.5 border border-border rotate-3">
            SECTOR_NULL
          </div>
        </div>

        <p className="text-muted-foreground text-sm font-mono leading-relaxed max-w-sm mx-auto border-l-2 border-destructive/30 pl-4 mb-8">
          Coordinates valid but empty. The local reality anchor has failed.
        </p>
      </div>

      {/* 3. The Gravity Well (Visual Centerpiece) */}
      <GravityWell />

      {/* 4. Controls: Negated Action Buttons */}
      <div className="space-y-3">
        <IndustrialButton
          onClick={() => navigate("/")}
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
            className="absolute w-1 h-1 bg-destructive/10 rounded-full blur-[1px]"
            style={{
              left: `${Math.random() * 100}%`,
              top: -20,
            }}
            animate={{
              y: ["0vh", "100vh"],
              x: [0, (Math.random() - 0.5) * 50],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>
    </GatekeeperLayout>
  );
}
