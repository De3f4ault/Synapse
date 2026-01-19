/**
 * CommandBarCollapsed - The Always-Visible Tier 1 Bar
 * 
 * Shows: Context, Track, Play/Pause, Prev/Next, Music/Rain sliders, Settings cog
 */

import { Play, Pause, SkipBack, SkipForward, Settings, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommandBarCollapsedProps {
  // Context
  context: string;
  
  // Track
  trackName: string | null;
  
  // Playback
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  
  // Mixer
  musicLevel: number;
  rainLevel: number;
  onMusicChange: (value: number) => void;
  onRainChange: (value: number) => void;
  
  // Expansion
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function CommandBarCollapsed({
  context,
  trackName,
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  musicLevel,
  rainLevel,
  onMusicChange,
  onRainChange,
  isExpanded,
  onToggleExpand,
}: CommandBarCollapsedProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 h-14">
      {/* Context Badge */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          {context}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Track Name */}
      <div className="flex-shrink-0 max-w-[140px]">
        <span className="text-sm text-slate-300 truncate block">
          {trackName ?? "No track"}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Playback Controls */}
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-slate-400 hover:text-white"
          onClick={onPrev}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-10 w-10 rounded-full transition-all",
            isPlaying
              ? "bg-cyan-500 text-white hover:bg-cyan-400"
              : "bg-white/10 text-white hover:bg-white/20"
          )}
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 ml-0.5 fill-current" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-slate-400 hover:text-white"
          onClick={onNext}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Mixer Sliders */}
      <div className="flex items-center gap-4 min-w-[200px]">
        {/* Music */}
        <div className="flex items-center gap-2 flex-1">
          <Volume2 className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
          <Slider
            value={[musicLevel]}
            max={1}
            step={0.01}
            onValueChange={(val) => onMusicChange(val[0] ?? 0)}
            className="w-20 [&_.absolute]:bg-purple-500"
          />
        </div>

        {/* Rain */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-blue-400">🌧</span>
          <Slider
            value={[rainLevel]}
            max={1}
            step={0.01}
            onValueChange={(val) => onRainChange(val[0] ?? 0)}
            className="w-20 [&_.absolute]:bg-blue-500"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Settings Cog */}
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-8 w-8 transition-transform",
          isExpanded && "rotate-90 text-cyan-400"
        )}
        onClick={onToggleExpand}
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}
