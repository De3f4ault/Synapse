/**
 * CommandBarExpanded - The Tier 2 Expansion Panel
 * 
 * Shows: Mixer (Music/Rain presets), Settings (TTS, Autonomy), The Crate
 */

import { useState } from "react";
import { Pin, PinOff, Plus, Play, Pause, Trash2, MessageSquare, Brain, Sparkles, Music, CloudRain, Coffee, TreeDeciduous, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MUSIC_PRESETS, AMBIENCE_PRESETS, type MusicPreset, type AmbiencePreset } from "../../presets";
import type { TrackMeta } from "../../persistence/AudioDatabase";

interface CommandBarExpandedProps {
  // Pin state
  isPinned: boolean;
  onTogglePin: () => void;
  
  // Mixer - Music
  musicLevel: number;
  activeMusicId: string | null;
  isMusicPlaying: boolean;
  onMusicLevelChange: (value: number) => void;
  onPlayMusic: (preset: MusicPreset) => void;
  onStopMusic: () => void;
  
  // Mixer - Ambience
  ambienceLevel: number;
  activeAmbienceId: string | null;
  isAmbiencePlaying: boolean;
  onAmbienceLevelChange: (value: number) => void;
  onPlayAmbience: (preset: AmbiencePreset) => void;
  onStopAmbience: () => void;
  
  // Crate
  tracks: TrackMeta[];
  activeTrackId: string | null;
  onPlayTrack: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
  onAddTrack: () => void;
  
  // TTS
  ttsEnabled: boolean;
  ttsRate: number;
  onTtsEnabledChange: (enabled: boolean) => void;
  onTtsRateChange: (rate: number) => void;
  
  // Autonomy
  autonomyEnabled: boolean;
  onAutonomyChange: (enabled: boolean) => void;
  
  // Synesthesia
  synesthesiaEnabled: boolean;
  onSynesthesiaChange: (enabled: boolean) => void;
}

const ambienceIcons: Record<string, typeof CloudRain> = {
  rain: CloudRain,
  cafe: Coffee,
  forest: TreeDeciduous,
  fire: Flame,
  waves: CloudRain,
  wind: CloudRain,
};

export function CommandBarExpanded({
  isPinned,
  onTogglePin,
  musicLevel,
  activeMusicId,
  isMusicPlaying,
  onMusicLevelChange,
  onPlayMusic,
  onStopMusic,
  ambienceLevel,
  activeAmbienceId,
  isAmbiencePlaying,
  onAmbienceLevelChange,
  onPlayAmbience,
  onStopAmbience,
  tracks,
  activeTrackId,
  onPlayTrack,
  onRemoveTrack,
  onAddTrack,
  ttsEnabled,
  ttsRate,
  onTtsEnabledChange,
  onTtsRateChange,
  autonomyEnabled,
  onAutonomyChange,
  synesthesiaEnabled,
  onSynesthesiaChange,
}: CommandBarExpandedProps) {
  const [showMusicPresets, setShowMusicPresets] = useState(false);
  const [showAmbiencePresets, setShowAmbiencePresets] = useState(false);

  const activeMusic = MUSIC_PRESETS.find(p => p.id === activeMusicId);
  const activeAmbience = AMBIENCE_PRESETS.find(p => p.id === activeAmbienceId);

  return (
    <div className="border-b border-border bg-background/50">
      {/* Header with Pin */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Neural Resonance
        </span>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-6 w-6",
            isPinned ? "text-primary" : "text-muted-foreground"
          )}
          onClick={onTogglePin}
          title={isPinned ? "Unpin (click outside will collapse)" : "Pin open"}
        >
          {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Content: Two Columns */}
      <div className="grid grid-cols-2 gap-6 p-5">
        {/* Column 1: Mixer */}
        <div className="space-y-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Mixer
          </span>

          {/* Music Channel */}
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
              onValueChange={(val) => onMusicLevelChange(val[0] ?? 0)}
              className="[&_.absolute]:bg-accent"
            />

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

          {/* Rain/Ambience Channel */}
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
                  {activeAmbience?.name ?? "Rain / Ambience"}
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
              onValueChange={(val) => onAmbienceLevelChange(val[0] ?? 0)}
              className="[&_.absolute]:bg-blue-500"
            />

            {showAmbiencePresets && (
              <div className="grid grid-cols-4 gap-1 p-2 bg-foreground/5 rounded-lg">
                {AMBIENCE_PRESETS.map((preset) => {
                  const Icon = ambienceIcons[preset.icon] ?? CloudRain;
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

        {/* Column 2: Settings */}
        <div className="space-y-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Settings
          </span>

          {/* TTS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-accent-olive" />
                <span className="text-xs text-foreground/80">Text-to-Speech</span>
              </div>
              <Switch
                checked={ttsEnabled}
                onCheckedChange={onTtsEnabledChange}
                className="h-4 w-7"
              />
            </div>
            {ttsEnabled && (
              <div className="flex items-center gap-2 pl-5">
                <span className="text-[10px] text-muted-foreground w-8">{ttsRate.toFixed(1)}x</span>
                <Slider
                  value={[ttsRate]}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onValueChange={(val) => onTtsRateChange(val[0] ?? 1)}
                  className="flex-1 [&_.absolute]:bg-accent-olive"
                />
              </div>
            )}
          </div>

          {/* Autonomy */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs text-foreground/80">Autonomy</span>
            </div>
            <Switch
              checked={autonomyEnabled}
              onCheckedChange={onAutonomyChange}
              className="h-4 w-7"
            />
          </div>

          {/* Synesthesia */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-xs text-foreground/80">Synesthesia</span>
            </div>
            <Switch
              checked={synesthesiaEnabled}
              onCheckedChange={onSynesthesiaChange}
              className="h-4 w-7"
            />
          </div>
        </div>
      </div>

      {/* The Crate (User Tracks Only) */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            The Crate
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-primary"
            onClick={onAddTrack}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="h-[80px]">
          <div className="space-y-1.5 pr-2">
            {tracks.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-2">
                Drop audio files here to add your music
              </div>
            ) : (
              tracks.map((track) => (
                <div
                  key={track.id}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                    activeTrackId === track.id && "bg-primary/10"
                  )}
                  onClick={() => onPlayTrack(track.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Play
                      className={cn(
                        "h-3 w-3 flex-shrink-0",
                        activeTrackId === track.id ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs truncate",
                        activeTrackId === track.id ? "text-primary" : "text-foreground/80"
                      )}
                    >
                      {track.name}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(track.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
