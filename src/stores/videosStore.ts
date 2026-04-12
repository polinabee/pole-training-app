import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDb } from '../db';
import type { Video } from '../types';

interface VideosState {
  videos: Video[];
  load: () => void;
  addVideo: (video: Omit<Video, 'id' | 'createdAt'>) => void;
  removeVideo: (videoId: string) => void;
  getVideosForTrick: (trickId: string) => Video[];
  getVideosForSession: (sessionId: string) => Video[];
  updateVideoNotes: (videoId: string, notes: string) => void;
}

function rowToVideo(row: Record<string, unknown>): Video {
  return {
    id: row.id as string,
    localUri: row.localUri as string,
    trickId: (row.trickId as string | null) ?? null,
    sessionId: (row.sessionId as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.createdAt as string,
  };
}

export const useVideosStore = create<VideosState>((set, get) => ({
  videos: [],

  load() {
    const db = getDb();
    const rows = db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM videos ORDER BY createdAt DESC'
    );
    set({ videos: rows.map(rowToVideo) });
  },

  addVideo(video) {
    const db = getDb();
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();
    db.runSync(
      'INSERT INTO videos (id, localUri, trickId, sessionId, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, video.localUri, video.trickId ?? null, video.sessionId ?? null, video.notes ?? null, createdAt]
    );
    const newVideo: Video = { ...video, id, createdAt };
    set((state) => ({ videos: [newVideo, ...state.videos] }));
  },

  removeVideo(videoId) {
    const db = getDb();
    db.runSync('DELETE FROM videos WHERE id = ?', [videoId]);
    set((state) => ({ videos: state.videos.filter((v) => v.id !== videoId) }));
  },

  getVideosForTrick(trickId) {
    return get().videos.filter((v) => v.trickId === trickId);
  },

  getVideosForSession(sessionId) {
    return get().videos.filter((v) => v.sessionId === sessionId);
  },

  updateVideoNotes(videoId, notes) {
    const db = getDb();
    db.runSync('UPDATE videos SET notes = ? WHERE id = ?', [notes, videoId]);
    set((state) => ({
      videos: state.videos.map((v) => (v.id === videoId ? { ...v, notes } : v)),
    }));
  },
}));
