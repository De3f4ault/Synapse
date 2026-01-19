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
 * Using Soundsnap/FMA for reliable URLs.
 */
export const AMBIENCE_PRESETS: AmbiencePreset[] = [
  {
    id: 'rain',
    name: 'Rain',
    icon: 'rain',
    // Gentle rain loop
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/A_A_Aalto/Naturesound/A_A_Aalto_-_02_-_Rain.mp3',
    color: 'bg-blue-500',
  },
  {
    id: 'cafe',
    name: 'Café',
    icon: 'cafe',
    // Coffee shop ambience
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Podington_Bear/Solo_Instruments/Podington_Bear_-_Rubber_Plant.mp3',
    color: 'bg-amber-500',
  },
  {
    id: 'forest',
    name: 'Forest',
    icon: 'forest',
    // Nature sounds
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/A_A_Aalto/Naturesound/A_A_Aalto_-_01_-_Forest.mp3',
    color: 'bg-emerald-500',
  },
  {
    id: 'fire',
    name: 'Fire',
    icon: 'fire',
    // Fireplace crackling
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/A_A_Aalto/Naturesound/A_A_Aalto_-_03_-_Fire.mp3',
    color: 'bg-orange-500',
  },
];

/**
 * Get preset by ID
 */
export function getAmbiencePreset(id: string): AmbiencePreset | undefined {
  return AMBIENCE_PRESETS.find(p => p.id === id);
}
