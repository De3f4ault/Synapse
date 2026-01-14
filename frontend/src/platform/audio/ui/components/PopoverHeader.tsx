/**
 * PopoverHeader - Neural Resonance title bar with context badge
 */

import { Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PopoverHeaderProps {
  context: string;
  synesthesiaEnabled: boolean;
  onToggleSynesthesia: () => void;
  onClose: () => void;
}

export function PopoverHeader({
  context,
  synesthesiaEnabled,
  onToggleSynesthesia,
  onClose,
}: PopoverHeaderProps) {
  return (
    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="font-semibold text-sm tracking-wide">Neural Resonance</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">
          {context}
        </span>
      </div>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className={cn("h-6 w-6", synesthesiaEnabled && "text-cyan-400")}
          onClick={onToggleSynesthesia}
          title="Toggle Synesthesia (Visuals)"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
