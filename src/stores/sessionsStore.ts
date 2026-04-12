import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDb } from '../db';
import { useTricksStore } from './tricksStore';
import type { TrainingSession, SessionTrick, SessionSide } from '../types';

interface SessionsState {
  sessions: TrainingSession[];
  sessionTricks: SessionTrick[];
  load: () => void;
  createSession: (date: string, notes?: string) => string;
  updateSessionNotes: (sessionId: string, notes: string) => void;
  addSessionTrick: (sessionId: string, trickId: string, side: SessionSide) => void;
  removeSessionTrick: (sessionTrickId: string) => void;
  getSessionTricks: (sessionId: string) => SessionTrick[];
  deleteSession: (sessionId: string) => void;
}

function rowToSession(row: Record<string, unknown>): TrainingSession {
  return {
    id: row.id as string,
    date: row.date as string,
    notes: (row.notes as string | null) ?? null,
  };
}

function rowToSessionTrick(row: Record<string, unknown>): SessionTrick {
  return {
    id: row.id as string,
    sessionId: row.sessionId as string,
    trickId: row.trickId as string,
    side: row.side as SessionSide,
  };
}

function updateLastPracticed(trickId: string, side: SessionSide) {
  const today = new Date().toISOString().split('T')[0];
  const patch: Partial<Omit<import('../types').UserTrick, 'id' | 'trickId'>> = {};

  if (side === 'left' || side === 'both') {
    patch.lastPracticed_left = today;
  }
  if (side === 'right' || side === 'both') {
    patch.lastPracticed_right = today;
  }
  if (side === 'none') {
    // For no-side tricks, update a neutral field — we reuse lastPracticed_left as the proxy
    patch.lastPracticed_left = today;
  }

  useTricksStore.getState().upsertUserTrick(trickId, patch);
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  sessionTricks: [],

  load() {
    const db = getDb();
    const sessionRows = db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM training_sessions ORDER BY date DESC'
    );
    const stRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM session_tricks');
    set({
      sessions: sessionRows.map(rowToSession),
      sessionTricks: stRows.map(rowToSessionTrick),
    });
  },

  createSession(date, notes) {
    const db = getDb();
    const id = Crypto.randomUUID();
    db.runSync(
      'INSERT INTO training_sessions (id, date, notes) VALUES (?, ?, ?)',
      [id, date, notes ?? null]
    );
    const newSession: TrainingSession = { id, date, notes: notes ?? null };
    set((state) => ({
      sessions: [newSession, ...state.sessions],
    }));
    return id;
  },

  updateSessionNotes(sessionId, notes) {
    const db = getDb();
    db.runSync('UPDATE training_sessions SET notes = ? WHERE id = ?', [notes, sessionId]);
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, notes } : s)),
    }));
  },

  addSessionTrick(sessionId, trickId, side) {
    const db = getDb();
    const id = Crypto.randomUUID();
    db.runSync(
      'INSERT INTO session_tricks (id, sessionId, trickId, side) VALUES (?, ?, ?, ?)',
      [id, sessionId, trickId, side]
    );
    const newST: SessionTrick = { id, sessionId, trickId, side };
    set((state) => ({ sessionTricks: [...state.sessionTricks, newST] }));
    updateLastPracticed(trickId, side);
  },

  removeSessionTrick(sessionTrickId) {
    const db = getDb();
    db.runSync('DELETE FROM session_tricks WHERE id = ?', [sessionTrickId]);
    set((state) => ({
      sessionTricks: state.sessionTricks.filter((st) => st.id !== sessionTrickId),
    }));
  },

  getSessionTricks(sessionId) {
    return get().sessionTricks.filter((st) => st.sessionId === sessionId);
  },

  deleteSession(sessionId) {
    const db = getDb();
    db.runSync('DELETE FROM session_tricks WHERE sessionId = ?', [sessionId]);
    db.runSync('DELETE FROM training_sessions WHERE id = ?', [sessionId]);
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      sessionTricks: state.sessionTricks.filter((st) => st.sessionId !== sessionId),
    }));
  },
}));
