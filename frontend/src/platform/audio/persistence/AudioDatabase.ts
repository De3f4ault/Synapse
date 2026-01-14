/**
 * AudioDatabase - Platform Audio Persistence Layer
 *
 * IndexedDB wrapper for all audio-related persistence.
 * Extends the original crate service with session, playlist, and history support.
 *
 * ## Migration Strategy
 * - v1: tracks, blobs (original)
 * - v2: playlists, playlist_tracks, track_tags
 * - v3: listening_history, playback_state
 *
 * ## Design Decisions
 * - Audio lives in IndexedDB (not backend) for offline, low-latency, privacy
 * - Sessions and history enable intelligent UX without explicit UI
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { SessionEndReason, SessionContext } from '../policy/types';

const DB_NAME = 'synapse-audio-platform';
const DB_VERSION = 3;

// =============================================================================
// SCHEMA TYPES
// =============================================================================

export interface TrackMeta {
  id: string;
  name: string;
  category: 'music' | 'ambience';
  duration: number;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  context: SessionContext;
  defaultVolume: number;
  createdAt: number;
  sortOrder: number;
}

export interface PlaylistTrack {
  playlistId: string;
  trackId: string;
  order: number;
}

export interface TrackTag {
  trackId: string;
  tag: string;
}

export interface ListeningHistoryEntry {
  sessionId: string;
  trackId: string;
  playlistId: string | null;
  startedAt: number;
  endedAt: number | null;
  endReason: SessionEndReason | null;
  context: SessionContext;
  positionReached: number;
}

export interface PersistedPlaybackState {
  sourceId: string;
  trackId: string;
  playlistId: string | null;
  position: number;
  updatedAt: number;
}

// =============================================================================
// IDB SCHEMA
// =============================================================================

interface AudioDatabaseSchema extends DBSchema {
  tracks: {
    key: string;
    value: TrackMeta;
  };
  blobs: {
    key: string;
    value: { id: string; blob: Blob };
  };
  playlists: {
    key: string;
    value: Playlist;
  };
  playlist_tracks: {
    key: [string, string]; // [playlistId, trackId]
    value: PlaylistTrack;
    indexes: { byPlaylist: string };
  };
  track_tags: {
    key: [string, string]; // [trackId, tag]
    value: TrackTag;
    indexes: { byTrack: string };
  };
  listening_history: {
    key: string;
    value: ListeningHistoryEntry;
    indexes: { byTrack: string; byStartedAt: number };
  };
  playback_state: {
    key: string;
    value: PersistedPlaybackState;
  };
}

// =============================================================================
// DATABASE SERVICE
// =============================================================================

class AudioDatabase {
  private dbPromise: Promise<IDBPDatabase<AudioDatabaseSchema>>;

  constructor() {
    this.dbPromise = openDB<AudioDatabaseSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // v1: Core track storage
        if (oldVersion < 1) {
          db.createObjectStore('tracks', { keyPath: 'id' });
          db.createObjectStore('blobs', { keyPath: 'id' });
        }

        // v2: Playlists and tags
        if (oldVersion < 2) {
          db.createObjectStore('playlists', { keyPath: 'id' });

          const playlistTracks = db.createObjectStore('playlist_tracks', {
            keyPath: ['playlistId', 'trackId'],
          });
          playlistTracks.createIndex('byPlaylist', 'playlistId');

          const trackTags = db.createObjectStore('track_tags', {
            keyPath: ['trackId', 'tag'],
          });
          trackTags.createIndex('byTrack', 'trackId');
        }

        // v3: Session history and resume state
        if (oldVersion < 3) {
          const history = db.createObjectStore('listening_history', {
            keyPath: 'sessionId',
          });
          history.createIndex('byTrack', 'trackId');
          history.createIndex('byStartedAt', 'startedAt');

          db.createObjectStore('playback_state', { keyPath: 'sourceId' });
        }

        // Suppress unused variable warning
        void transaction;
      },
    });
  }

  // ===========================================================================
  // TRACKS (v1)
  // ===========================================================================

  async addTrack(file: File, category: 'music' | 'ambience' = 'music'): Promise<TrackMeta> {
    const id = crypto.randomUUID();
    const db = await this.dbPromise;

    const track: TrackMeta = {
      id,
      name: file.name.replace(/\.[^/.]+$/, ''),
      category,
      duration: 0, // TODO: decode for real duration
      addedAt: Date.now(),
    };

    const tx = db.transaction(['tracks', 'blobs'], 'readwrite');
    await Promise.all([
      tx.objectStore('tracks').add(track),
      tx.objectStore('blobs').add({ id, blob: file }),
      tx.done,
    ]);

    return track;
  }

  async getTracks(): Promise<TrackMeta[]> {
    const db = await this.dbPromise;
    return db.getAll('tracks');
  }

  async getTrackBlob(id: string): Promise<Blob | undefined> {
    const db = await this.dbPromise;
    const entry = await db.get('blobs', id);
    return entry?.blob;
  }

  async removeTrack(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['tracks', 'blobs'], 'readwrite');
    await Promise.all([
      tx.objectStore('tracks').delete(id),
      tx.objectStore('blobs').delete(id),
      tx.done,
    ]);
  }

  // ===========================================================================
  // PLAYLISTS (v2)
  // ===========================================================================

  async createPlaylist(name: string, context: SessionContext): Promise<Playlist> {
    const db = await this.dbPromise;
    const playlists = await db.getAll('playlists');

    const playlist: Playlist = {
      id: crypto.randomUUID(),
      name,
      context,
      defaultVolume: 0.8,
      createdAt: Date.now(),
      sortOrder: playlists.length,
    };

    await db.add('playlists', playlist);
    return playlist;
  }

  async getPlaylists(): Promise<Playlist[]> {
    const db = await this.dbPromise;
    return db.getAll('playlists');
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    const db = await this.dbPromise;
    const existing = await db.getAllFromIndex('playlist_tracks', 'byPlaylist', playlistId);
    await db.add('playlist_tracks', {
      playlistId,
      trackId,
      order: existing.length,
    });
  }

  async getPlaylistTracks(playlistId: string): Promise<string[]> {
    const db = await this.dbPromise;
    const entries = await db.getAllFromIndex('playlist_tracks', 'byPlaylist', playlistId);
    return entries.sort((a, b) => a.order - b.order).map(e => e.trackId);
  }

  // ===========================================================================
  // LISTENING HISTORY (v3)
  // ===========================================================================

  async recordSessionStart(entry: Omit<ListeningHistoryEntry, 'endedAt' | 'endReason' | 'positionReached'>): Promise<void> {
    const db = await this.dbPromise;
    await db.add('listening_history', {
      ...entry,
      endedAt: null,
      endReason: null,
      positionReached: 0,
    });
  }

  async recordSessionEnd(
    sessionId: string,
    endReason: SessionEndReason,
    positionReached: number
  ): Promise<void> {
    const db = await this.dbPromise;
    const entry = await db.get('listening_history', sessionId);
    if (entry) {
      entry.endedAt = Date.now();
      entry.endReason = endReason;
      entry.positionReached = positionReached;
      await db.put('listening_history', entry);
    }
  }

  async getRecentHistory(limit = 20): Promise<ListeningHistoryEntry[]> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('listening_history', 'byStartedAt');
    return all.slice(-limit).reverse();
  }

  // ===========================================================================
  // PLAYBACK STATE (v3) - Resume Support
  // ===========================================================================

  async savePlaybackState(state: PersistedPlaybackState): Promise<void> {
    const db = await this.dbPromise;
    await db.put('playback_state', state);
  }

  async getPlaybackState(sourceId: string): Promise<PersistedPlaybackState | undefined> {
    const db = await this.dbPromise;
    return db.get('playback_state', sourceId);
  }

  async clearPlaybackState(sourceId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('playback_state', sourceId);
  }
}

export const audioDatabase = new AudioDatabase();
