/**
 * PlaylistService - Intelligent Playlist Management
 *
 * Provides playlist CRUD operations and intelligent defaults based on
 * listening history. Enables "felt intelligence" without explicit UI.
 *
 * ## Smart Features
 * - Auto-resume last effective playlist
 * - Context-aware track suggestions
 * - History-driven recommendations
 */

import { audioDatabase, Playlist, ListeningHistoryEntry } from '../persistence/AudioDatabase';
import type { SessionContext } from '../policy/types';

class PlaylistService {
  /**
   * Create a new playlist.
   */
  async createPlaylist(name: string, context: SessionContext): Promise<Playlist> {
    return audioDatabase.createPlaylist(name, context);
  }

  /**
   * Get all playlists.
   */
  async getPlaylists(): Promise<Playlist[]> {
    return audioDatabase.getPlaylists();
  }

  /**
   * Add a track to a playlist.
   */
  async addTrack(playlistId: string, trackId: string): Promise<void> {
    await audioDatabase.addTrackToPlaylist(playlistId, trackId);
  }

  /**
   * Get tracks in a playlist.
   */
  async getPlaylistTracks(playlistId: string): Promise<string[]> {
    return audioDatabase.getPlaylistTracks(playlistId);
  }

  /**
   * Get the most recently played playlist with completed sessions.
   * This is the "smart resume" source.
   */
  async getLastEffectivePlaylist(): Promise<Playlist | null> {
    const history = await audioDatabase.getRecentHistory(50);
    
    // Find most recent session with a playlist that completed or reached >50%
    for (const entry of history) {
      if (entry.playlistId && (entry.endReason === 'completed' || entry.endReason === 'user_stop')) {
        const playlists = await audioDatabase.getPlaylists();
        return playlists.find(p => p.id === entry.playlistId) || null;
      }
    }
    
    return null;
  }

  /**
   * Get recommended context based on recent listening patterns.
   * Uses time of day and history to suggest context.
   */
  getRecommendedContext(): SessionContext {
    const hour = new Date().getHours();
    
    // Simple heuristic: night = ambient, day = study
    if (hour >= 22 || hour < 6) {
      return 'ambient';
    } else if (hour >= 6 && hour < 12) {
      return 'study';
    } else {
      return 'study';
    }
  }

  /**
   * Get frequently played tracks based on history.
   */
  async getFrequentlyPlayed(limit = 10): Promise<string[]> {
    const history = await audioDatabase.getRecentHistory(100);
    
    // Count track occurrences
    const counts = new Map<string, number>();
    for (const entry of history) {
      counts.set(entry.trackId, (counts.get(entry.trackId) || 0) + 1);
    }
    
    // Sort by frequency
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([trackId]) => trackId);
  }

  /**
   * Get tracks that were effective (played for long duration).
   */
  async getEffectiveTracks(limit = 10): Promise<string[]> {
    const history = await audioDatabase.getRecentHistory(100);
    
    // Score by position reached (longer listen = more effective)
    const scores = new Map<string, number>();
    for (const entry of history) {
      const current = scores.get(entry.trackId) || 0;
      scores.set(entry.trackId, current + entry.positionReached);
    }
    
    // Sort by total listen time
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([trackId]) => trackId);
  }

  /**
   * Get last session that can be resumed.
   */
  async getResumableSession(): Promise<ListeningHistoryEntry | null> {
    const history = await audioDatabase.getRecentHistory(1);
    const last = history[0];
    
    if (!last) return null;
    
    // Only resumable if it wasn't completed and has meaningful progress
    if (last.endReason !== 'completed' && last.positionReached > 10) {
      return last;
    }
    
    return null;
  }
}

export const playlistService = new PlaylistService();
