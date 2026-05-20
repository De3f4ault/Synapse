/**
 * MixerSection - Music and Ambience Controls
 * 
 * Dual-channel mixer with preset selection and level controls.
 */

import { useState } from "react";
import { Play, Pause, Sliders, CloudRain, Coffee, TreeDeciduous, Flame, Music } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AMBIENCE_PRESETS, MUSIC_PRESETS, type AmbiencePreset, type MusicPreset } from "../../presets";

interface MixerSectionProps {
  musicLevel: number;
  ambienceLevel: number;
  activeMusicId: string | null;
  activeAmbienceId: string | null;
  isMusicPlaying: boolean;
  isAmbiencePlaying: boolean;
  onMusicChange: (value: number) => void;
  onAmbienceChange: (value: number) => void;
  onPlayMusic: (preset: MusicPreset) => void;
  onStopMusic: () => void;
  onPlayAmbience: (preset: AmbiencePreset) => void;
  onStopAmbience: () => void;
}

const ambienceIcons = {
  rain: CloudRain,
  cafe: Coffee,
  forest: TreeDeciduous,
  fire: Flame,
  waves: CloudRain, // fallback
  wind: CloudRain, // fallback
};

export function MixerSection({
  musicLevel,
  ambienceLevel,
  activeMusicId,
  activeAmbienceId,
  isMusicPlaying,
  isAmbiencePlaying,
  onMusicChange,
  onAmbienceChange,
  onPlayMusic,
  onStopMusic,
  onPlayAmbience,
  onStopAmbience,
}: MixerSectionProps) {
  const [showMusicPresets, setShowMusicPresets] = useState(false);
  const [showAmbiencePresets, setShowAmbiencePresets] = useState(false);

  const activeMusic = MUSIC_PRESETS.find(p => p.id === activeMusicId);
  const activeAmbience = AMBIENCE_PRESETS.find(p => p.id === activeAmbienceId);

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sliders className="h-3 w-3" />
        <span>Mixer</span>
      </div>

      {/* Music Track */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-6 w-6",
                isMusicPlaying ? "text-accent" : "text-muted-foreground"
              )}
              onClick={() => {
                if (isMusicPlaying) {
                  onStopMusic();
                } else if (activeMusic) {
                  onPlayMusic(activeMusic);
                } else {
                  setShowMusicPresets(!showMusicPresets);
                }
              }}
            >
              {isMusicPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
            </Button>
            <button
              onClick={() => setShowMusicPresets(!showMusicPresets)}
              className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              {activeMusic?.name ?? "Select Track"}
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {Math.round(musicLevel * 100)}%
          </span>
        </div>
        
        <Slider
          value={[musicLevel]}
          max={1}
          step={0.01}
          onValueChange={(val) => onMusicChange(val[0] ?? 0)}
          className="[&_.absolute]:bg-accent"
        />

        {/* Music Presets Dropdown */}
        {showMusicPresets && (
          <div className="grid grid-cols-3 gap-1 p-2 bg-foreground/5 rounded-lg">
            {MUSIC_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  onPlayMusic(preset);
                  setShowMusicPresets(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded text-[10px] transition-colors",
                  activeMusicId === preset.id
                    ? "bg-accent/20 text-accent"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <Music className="h-4 w-4" />
                <span className="truncate w-full text-center">{preset.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ambience Track */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-6 w-6",
                isAmbiencePlaying ? "text-info" : "text-muted-foreground"
              )}
              onClick={() => {
                if (isAmbiencePlaying) {
                  onStopAmbience();
                } else if (activeAmbience) {
                  onPlayAmbience(activeAmbience);
                } else {
                  setShowAmbiencePresets(!showAmbiencePresets);
                }
              }}
            >
              {isAmbiencePlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
            </Button>
            <button
              onClick={() => setShowAmbiencePresets(!showAmbiencePresets)}
              className="text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
            >
              {activeAmbience?.name ?? "Select Ambience"}
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {Math.round(ambienceLevel * 100)}%
          </span>
        </div>

        <Slider
          value={[ambienceLevel]}
          max={1}
          step={0.01}
          onValueChange={(val) => onAmbienceChange(val[0] ?? 0)}
          className="[&_.absolute]:bg-blue-500"
        />

        {/* Ambience Presets Dropdown */}
        {showAmbiencePresets && (
          <div className="grid grid-cols-4 gap-1 p-2 bg-foreground/5 rounded-lg">
            {AMBIENCE_PRESETS.map((preset) => {
              const Icon = ambienceIcons[preset.icon];
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    onPlayAmbience(preset);
                    setShowAmbiencePresets(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded text-[10px] transition-colors",
                    activeAmbienceId === preset.id
                      ? "bg-blue-500/20 text-info"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
