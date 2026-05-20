import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Compass } from "lucide-react";
import {
  SecurityBadge,
  GatekeeperLayout,
} from "@/components/auth/GatekeeperUI";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <GatekeeperLayout status="error">
      {/* Badge */}
      <SecurityBadge status="error" />

      {/* Content */}
      <div className="text-center space-y-6 relative z-10 py-4">
        {/* 404 number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative inline-block"
        >
          <span className="text-8xl md:text-9xl font-black tracking-tighter text-foreground/10 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Compass
              size={52}
              className="text-destructive/70"
              strokeWidth={1.25}
            />
          </div>
        </motion.div>

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="space-y-2"
        >
          <p className="text-xs font-mono tracking-[0.3em] uppercase text-destructive/70">
            Page not found
          </p>
          <h1 className="text-xl font-bold text-foreground">
            Nothing here
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="space-y-3 pt-2"
      >
        <button
          onClick={() => navigate("/")}
          className="group relative w-full h-12 overflow-hidden border border-destructive/30 hover:border-primary/50 bg-card hover:bg-muted rounded-lg transition-all active:translate-y-px flex items-center justify-center gap-3 shadow-sm"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-destructive/40 to-transparent" />
          <Home size={15} className="text-destructive group-hover:text-primary transition-colors" />
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-foreground group-hover:text-primary transition-colors">
            Go Home
          </span>
        </button>

        <button
          onClick={() => window.history.back()}
          className="w-full h-12 border border-border hover:border-foreground/20 hover:bg-muted/40 rounded-lg transition-all active:translate-y-px flex items-center justify-center gap-3 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} />
          <span className="text-xs font-bold tracking-[0.2em] uppercase">
            Go Back
          </span>
        </button>
      </motion.div>
    </GatekeeperLayout>
  );
}
