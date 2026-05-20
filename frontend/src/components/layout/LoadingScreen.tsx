import { Loader2 } from "lucide-react";

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background text-foreground flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center">
          {/* Spinning Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />

          {/* Icon */}
          <Loader2 className="w-8 h-8 text-primary animate-spin relative z-10" />
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-foreground font-serif font-medium tracking-wider text-lg">
            Synapse
          </span>
          <span className="text-muted-foreground text-overline tracking-widest uppercase">
            Initializing
          </span>
        </div>
      </div>
    </div>
  );
};
