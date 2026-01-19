/**
 * AudioCommandBar - The Main Orchestrator
 * 
 * A horizontal command bar rendered as a dropdown below the trigger.
 * Expands downward to reveal Mixer, Settings, and Crate.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioUIStore } from "../../store/useAudioUIStore";
import { audioEngine, useAutonomy } from "@/platform/audio";
import { useAudioContext } from "../../context/useAudioContext";
import { CommandBarCollapsed } from "./CommandBarCollapsed";
import { CommandBarExpanded } from "./CommandBarExpanded";
import { MUSIC_PRESETS, AMBIENCE_PRESETS, type MusicPreset, type AmbiencePreset } from "../../presets";

export function AudioCommandBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Store state
  const {
    playIntent,
    volume,
    mix,
    togglePlayPause,
    setMix,
    synesthesiaEnabled,
    toggleSynesthesia,
    crateTracks,
    refreshCrate,
    addToCrate,
    removeFromCrate,
    activeMusicId,
    activeAmbienceId,
    setActiveTrack,
    isMusicPlaying,
    isAmbiencePlaying,
    setMusicPlaying,
    setAmbiencePlaying,
    ttsEnabled,
    ttsRate,
    setTtsEnabled,
    setTtsRate,
  } = useAudioUIStore();

  // Context and Autonomy
  const { context } = useAudioContext();
  const { globalEnabled, setGlobalEnabled } = useAutonomy();

  // Load crate on mount
  useEffect(() => {
    refreshCrate();
  }, [refreshCrate]);

  // Sync volume with engine
  useEffect(() => {
    audioEngine.syncVolume();
  }, [volume, mix]);

  // Click-outside detection
  useEffect(() => {
    if (!isExpanded || isPinned) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, isPinned]);

  // Get current track name
  const getCurrentTrackName = useCallback(() => {
    const crateTrack = crateTracks.find(t => t.id === activeMusicId);
    if (crateTrack) return crateTrack.name;

    const musicPreset = MUSIC_PRESETS.find(p => p.id === activeMusicId);
    if (musicPreset) return musicPreset.name;

    const ambienceTrack = AMBIENCE_PRESETS.find(p => p.id === activeAmbienceId);
    if (ambienceTrack) return ambienceTrack.name;

    return null;
  }, [activeMusicId, activeAmbienceId, crateTracks]);

  // Main Play/Pause handler
  const handlePlayPause = async () => {
    if (!playIntent) {
      await audioEngine.init();
      if (!activeMusicId && MUSIC_PRESETS[0]) {
        handlePlayMusic(MUSIC_PRESETS[0]);
        return;
      }
      togglePlayPause();
    } else {
      await audioEngine.suspend();
      togglePlayPause();
    }
  };

  // Skip handlers (cycle through crate tracks only)
  const handlePrev = () => {
    if (crateTracks.length === 0) return;
    const currentIndex = crateTracks.findIndex(t => t.id === activeMusicId);
    if (currentIndex > 0 && crateTracks[currentIndex - 1]) {
      handlePlayCrateTrack(crateTracks[currentIndex - 1]!.id);
    }
  };

  const handleNext = () => {
    if (crateTracks.length === 0) return;
    const currentIndex = crateTracks.findIndex(t => t.id === activeMusicId);
    if (currentIndex < crateTracks.length - 1 && crateTracks[currentIndex + 1]) {
      handlePlayCrateTrack(crateTracks[currentIndex + 1]!.id);
    }
  };

  // Play crate track (user-uploaded)
  const handlePlayCrateTrack = async (trackId: string) => {
    await audioEngine.init();
    setActiveTrack("music", trackId);
    await audioEngine.playTrack("music", trackId);
    setMusicPlaying(true);
    if (!playIntent) togglePlayPause();
  };

  // Music preset handlers
  const handlePlayMusic = async (preset: MusicPreset) => {
    await audioEngine.init();
    setActiveTrack("music", preset.id);
    await audioEngine.playTrack("music", preset.url);
    setMusicPlaying(true);
    if (!playIntent) togglePlayPause();
  };

  const handleStopMusic = () => {
    audioEngine.stopTrack("music");
    setMusicPlaying(false);
  };

  // Ambience preset handlers
  const handlePlayAmbience = async (preset: AmbiencePreset) => {
    await audioEngine.init();
    setActiveTrack("ambience", preset.id);
    await audioEngine.playTrack("ambience", preset.url);
    setAmbiencePlaying(true);
    if (!playIntent) togglePlayPause();
  };

  const handleStopAmbience = () => {
    audioEngine.stopTrack("ambience");
    setAmbiencePlaying(false);
  };

  // File input for adding tracks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAddTrack = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await addToCrate(files[0], "music");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* The Command Bar - Dropdown at right edge */}
      <motion.div
        ref={barRef}
        className="fixed top-16 right-4 z-50"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <div className="bg-[#0a0a0f]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Expanded Panel (appears above collapsed bar) */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <CommandBarExpanded
                  isPinned={isPinned}
                  onTogglePin={() => setIsPinned(!isPinned)}
                  // Mixer - Music
                  musicLevel={mix.music}
                  activeMusicId={activeMusicId}
                  isMusicPlaying={isMusicPlaying}
                  onMusicLevelChange={(val) => setMix("music", val)}
                  onPlayMusic={handlePlayMusic}
                  onStopMusic={handleStopMusic}
                  // Mixer - Ambience
                  ambienceLevel={mix.ambience}
                  activeAmbienceId={activeAmbienceId}
                  isAmbiencePlaying={isAmbiencePlaying}
                  onAmbienceLevelChange={(val) => setMix("ambience", val)}
                  onPlayAmbience={handlePlayAmbience}
                  onStopAmbience={handleStopAmbience}
                  // Crate
                  tracks={crateTracks}
                  activeTrackId={activeMusicId}
                  onPlayTrack={handlePlayCrateTrack}
                  onRemoveTrack={removeFromCrate}
                  onAddTrack={handleAddTrack}
                  // Settings
                  ttsEnabled={ttsEnabled}
                  ttsRate={ttsRate}
                  onTtsEnabledChange={setTtsEnabled}
                  onTtsRateChange={setTtsRate}
                  autonomyEnabled={globalEnabled}
                  onAutonomyChange={setGlobalEnabled}
                  synesthesiaEnabled={synesthesiaEnabled}
                  onSynesthesiaChange={toggleSynesthesia}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed Bar (always visible) */}
          <CommandBarCollapsed
            context={context}
            trackName={getCurrentTrackName()}
            isPlaying={playIntent}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            musicLevel={mix.music}
            rainLevel={mix.ambience}
            onMusicChange={(val) => setMix("music", val)}
            onRainChange={(val) => setMix("ambience", val)}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
          />
        </div>
      </motion.div>
    </>
  );
}
