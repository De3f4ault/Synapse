/**
 * AudioPlayerPopover - Neural Resonance Control Center
 * 
 * Orchestrates modular UI components for audio control.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAudioUIStore } from "../store/useAudioUIStore";
import { audioEngine, useAutonomy } from "@/platform/audio";
import { useAudioContext } from "../context/useAudioContext";
import { type AmbiencePreset, type MusicPreset } from "../presets";
import {
  PopoverHeader,
  PlaybackControls,
  MixerSection,
  TTSSection,
  AutonomySection,
  CrateSection,
} from "./components";

interface AudioPlayerPopoverProps {
  onClose: () => void;
}

export function AudioPlayerPopover({ onClose }: AudioPlayerPopoverProps) {
  const {
    playIntent,
    volume,
    mix,
    togglePlayPause,
    setVolume,
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
    ttsEnabled,
    ttsRate,
    setTtsEnabled,
    setTtsRate,
  } = useAudioUIStore();

  // Local state for tracking what's actually playing
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isAmbiencePlaying, setIsAmbiencePlaying] = useState(false);

  // Context and Autonomy
  const { context } = useAudioContext();
  const { globalEnabled, setGlobalEnabled } = useAutonomy();

  // Load crate on mount
  React.useEffect(() => {
    refreshCrate();
  }, []);

  // Sync with Engine on change
  React.useEffect(() => {
    audioEngine.syncVolume();
  }, [volume, mix]);

  // Handle Drag & Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("audio/")) {
        await addToCrate(file, "music");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const playCrateTrack = (trackId: string) => {
    setActiveTrack("music", trackId);
    audioEngine.playTrack("music", trackId);
    setIsMusicPlaying(true);
    if (!playIntent) togglePlayPause();
  };

  const handlePlayPause = async () => {
    if (!playIntent) {
      await audioEngine.init();
      if (!activeMusicId && crateTracks.length > 0 && crateTracks[0]) {
        playCrateTrack(crateTracks[0].id);
      } else if (activeMusicId) {
        audioEngine.playTrack("music", activeMusicId);
        setIsMusicPlaying(true);
        togglePlayPause();
      } else {
        togglePlayPause();
      }
    } else {
      await audioEngine.suspend();
      togglePlayPause();
    }
  };

  // Music preset handlers
  const handlePlayMusic = async (preset: MusicPreset) => {
    await audioEngine.init();
    setActiveTrack("music", preset.id);
    await audioEngine.playTrack("music", preset.url);
    setIsMusicPlaying(true);
    if (!playIntent) togglePlayPause();
  };

  const handleStopMusic = () => {
    audioEngine.stopTrack("music");
    setIsMusicPlaying(false);
  };

  // Ambience preset handlers
  const handlePlayAmbience = async (preset: AmbiencePreset) => {
    await audioEngine.init();
    setActiveTrack("ambience", preset.id);
    await audioEngine.playTrack("ambience", preset.url);
    setIsAmbiencePlaying(true);
    if (!playIntent) togglePlayPause();
  };

  const handleStopAmbience = () => {
    audioEngine.stopTrack("ambience");
    setIsAmbiencePlaying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-14 right-0 w-[320px] bg-[#0a0a0f]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-3xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <PopoverHeader
        context={context}
        synesthesiaEnabled={synesthesiaEnabled}
        onToggleSynesthesia={toggleSynesthesia}
        onClose={onClose}
      />

      <div className="p-6 space-y-6">
        <PlaybackControls
          playIntent={playIntent}
          volume={volume}
          onPlayPause={handlePlayPause}
          onVolumeChange={setVolume}
        />

        <MixerSection
          musicLevel={mix.music}
          ambienceLevel={mix.ambience}
          activeMusicId={activeMusicId}
          activeAmbienceId={activeAmbienceId}
          isMusicPlaying={isMusicPlaying}
          isAmbiencePlaying={isAmbiencePlaying}
          onMusicChange={(val) => setMix("music", val)}
          onAmbienceChange={(val) => setMix("ambience", val)}
          onPlayMusic={handlePlayMusic}
          onStopMusic={handleStopMusic}
          onPlayAmbience={handlePlayAmbience}
          onStopAmbience={handleStopAmbience}
        />

        <TTSSection
          enabled={ttsEnabled}
          rate={ttsRate}
          onEnabledChange={setTtsEnabled}
          onRateChange={setTtsRate}
        />

        <AutonomySection
          enabled={globalEnabled}
          onEnabledChange={setGlobalEnabled}
        />
      </div>

      <CrateSection
        tracks={crateTracks}
        activeTrackId={activeMusicId}
        onPlayTrack={playCrateTrack}
        onRemoveTrack={removeFromCrate}
      />
    </motion.div>
  );
}
