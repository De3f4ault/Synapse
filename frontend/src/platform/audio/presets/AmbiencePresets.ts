/**
 * AmbiencePresets - Built-in Ambient Sounds
 * 
 * Free ambient sound URLs for out-of-box experience.
 * Users can add their own via The Crate.
 */

export interface AmbiencePreset {
  id: string;
  name: string;
  icon: 'rain' | 'cafe' | 'forest' | 'fire' | 'waves' | 'wind';
  url: string;
  color: string;
}

/**
 * Default ambience presets using free CDN sources.
 * These are royalty-free ambient loops.
 */
export const AMBIENCE_PRESETS: AmbiencePreset[] = [
  {
    id: 'rain',
    name: 'Rain',
    icon: 'rain',
    url: 'https://cdn.pixabay.com/audio/2022/05/13/audio_257112efe5.mp3', // Light rain
    color: 'bg-blue-500',
  },
  {
    id: 'cafe',
    name: 'Café',
    icon: 'cafe',
    url: 'https://cdn.pixabay.com/audio/2024/11/29/audio_5b74e0e43f.mp3', // Café ambience
    color: 'bg-amber-500',
  },
  {
    id: 'forest',
    name: 'Forest',
    icon: 'forest',
    url: 'https://cdn.pixabay.com/audio/2022/08/31/audio_419263fc12.mp3', // Forest birds
    color: 'bg-emerald-500',
  },
  {
    id: 'fire',
    name: 'Fire',
    icon: 'fire',
    url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_3af62a881d.mp3', // Fireplace
    color: 'bg-orange-500',
  },
];

/**
 * Get preset by ID
 */
export function getAmbiencePreset(id: string): AmbiencePreset | undefined {
  return AMBIENCE_PRESETS.find(p => p.id === id);
}
