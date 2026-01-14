/**
 * PlaybackControls - Play/pause button and master volume
 */

import { Play, Pause, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface PlaybackControlsProps {
  playIntent: boolean;
  volume: number;
  onPlayPause: () => void;
  onVolumeChange: (value: number) => void;
}

export function PlaybackControls({
  playIntent,
  volume,
  onPlayPause,
  onVolumeChange,
}: PlaybackControlsProps) {
  return (
    <div className="space-y-6">
      {/* Playback Button (Center) */}
      <div className="flex justify-center">
        <button
          onClick={onPlayPause}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]",
            playIntent
              ? "bg-cyan-500 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)]"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
        >
          {playIntent ? (
            <Pause className="h-6 w-6 fill-current" />
          ) : (
            <Play className="h-6 w-6 ml-1 fill-current" />
          )}
        </button>
      </div>

      {/* Master Volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          <span>Master</span>
        </div>
        <Slider
          value={[volume]}
          max={1}
          step={0.01}
          onValueChange={(val) => onVolumeChange(val[0] ?? 0)}
          className="[&_.relative]:bg-white/10 [&_.absolute]:bg-cyan-500"
        />
      </div>
    </div>
  );
}
