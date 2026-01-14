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
 * These are royalty-free lo-fi tracks.
 */
export const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'lofi-study',
    name: 'Study Session',
    url: 'https://cdn.pixabay.com/audio/2024/09/10/audio_6e5f72e993.mp3',
    artist: 'Pixabay',
  },
  {
    id: 'lofi-chill',
    name: 'Chill Vibes',
    url: 'https://cdn.pixabay.com/audio/2024/11/13/audio_8006069a96.mp3',
    artist: 'Pixabay',
  },
  {
    id: 'lofi-focus',
    name: 'Deep Focus',
    url: 'https://cdn.pixabay.com/audio/2023/10/01/audio_88ebef6f2c.mp3',
    artist: 'Pixabay',
  },
];

/**
 * Get preset by ID
 */
export function getMusicPreset(id: string): MusicPreset | undefined {
  return MUSIC_PRESETS.find(p => p.id === id);
}
