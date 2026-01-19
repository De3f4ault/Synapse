/**
 * MusicPresets - Built-in Lo-Fi Music
 * 
 * Free lo-fi music URLs for out-of-box experience.
 * Users can add their own via The Crate.
 */

export interface MusicPreset {
  id: string;
  name: string;
  url: string;
  artist?: string;
}

/**
 * Default music presets using free CDN sources.
 * Using archive.org for reliable, never-expiring URLs.
 */
export const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'lofi-study',
    name: 'Study Session',
    // Chillhop Essentials - study vibes
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Shipping_Lanes.mp3',
    artist: 'Chad Crouch',
  },
  {
    id: 'lofi-chill',
    name: 'Chill Vibes',
    // Calm ambient
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kai_Engel/Satin/Kai_Engel_-_04_-_Sentinel.mp3',
    artist: 'Kai Engel',
  },
  {
    id: 'lofi-focus',
    name: 'Deep Focus',
    // Ambient focus music
    url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps/Chad_Crouch_-_Algorithms.mp3',
    artist: 'Chad Crouch',
  },
];

/**
 * Get preset by ID
 */
export function getMusicPreset(id: string): MusicPreset | undefined {
  return MUSIC_PRESETS.find(p => p.id === id);
}
