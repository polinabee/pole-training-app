import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDb } from '../db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Trick, UserTrick, TrickStatus } from '../types';

interface TricksState {
  tricks: Trick[];
  userTricks: UserTrick[];
  communityTricks: Trick[];
  load: () => void;
  loadCommunityTricks: () => Promise<void>;
  getUserTrick: (trickId: string) => UserTrick | undefined;
  upsertUserTrick: (trickId: string, patch: Partial<Omit<UserTrick, 'id' | 'trickId'>>) => void;
  addCustomTrick: (trick: Omit<Trick, 'id' | 'isCustom' | 'prerequisiteIds'>) => void;
  deleteCustomTrick: (trickId: string) => void;
  adminDeleteTrick: (trickId: string) => Promise<void>;
  updateTrickTags: (trickId: string, tags: string[]) => void;
}

function rowToTrick(row: Record<string, unknown>): Trick {
  return {
    id: row.id as string,
    name: row.name as string,
    poleType: row.poleType as Trick['poleType'],
    difficulty: row.difficulty as number,
    diagramUrl: (row.diagramUrl as string | null) ?? null,
    referenceVideoUrl: (row.referenceVideoUrl as string | null) ?? null,
    tags: JSON.parse((row.tags as string) || '[]') as string[],
    hasSides: Boolean(row.hasSides),
    isCustom: Boolean(row.isCustom),
    prerequisiteIds: JSON.parse((row.prerequisiteIds as string) || '[]') as string[],
  };
}

function rowToUserTrick(row: Record<string, unknown>): UserTrick {
  return {
    id: row.id as string,
    trickId: row.trickId as string,
    status_left: (row.status_left as TrickStatus) ?? null,
    status_right: (row.status_right as TrickStatus) ?? null,
    status: (row.status as TrickStatus) ?? null,
    notes_left: (row.notes_left as string | null) ?? null,
    notes_right: (row.notes_right as string | null) ?? null,
    lastPracticed_left: (row.lastPracticed_left as string | null) ?? null,
    lastPracticed_right: (row.lastPracticed_right as string | null) ?? null,
  };
}

export const useTricksStore = create<TricksState>((set, get) => ({
  tricks: [],
  userTricks: [],
  communityTricks: [],

  load() {
    const db = getDb();
    const trickRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM tricks ORDER BY name ASC');
    const userTrickRows = db.getAllSync<Record<string, unknown>>('SELECT * FROM user_tricks');
    set({
      tricks: trickRows.map(rowToTrick),
      userTricks: userTrickRows.map(rowToUserTrick),
    });
  },

  async loadCommunityTricks() {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase
      .from('trick_submissions')
      .select('id, name, pole_type, difficulty, has_sides, tags')
      .eq('status', 'approved');
    if (error || !data) return;
    const community: Trick[] = data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      poleType: row.pole_type as Trick['poleType'],
      difficulty: row.difficulty as number,
      hasSides: Boolean(row.has_sides),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      diagramUrl: null,
      referenceVideoUrl: null,
      isCustom: false,
      prerequisiteIds: [],
      source: 'community',
    }));
    set({ communityTricks: community });
  },

  getUserTrick(trickId) {
    return get().userTricks.find((ut) => ut.trickId === trickId);
  },

  upsertUserTrick(trickId, patch) {
    const db = getDb();
    const existing = get().getUserTrick(trickId);

    if (existing) {
      const fields = Object.keys(patch) as (keyof typeof patch)[];
      const setClauses = fields.map((f) => `${f} = ?`).join(', ');
      const values = fields.map((f) => patch[f] ?? null);
      db.runSync(`UPDATE user_tricks SET ${setClauses} WHERE trickId = ?`, [...values, trickId]);

      set((state) => ({
        userTricks: state.userTricks.map((ut) =>
          ut.trickId === trickId ? { ...ut, ...patch } : ut
        ),
      }));
    } else {
      const id = Crypto.randomUUID();
      const newRow: UserTrick = {
        id,
        trickId,
        status_left: null,
        status_right: null,
        status: null,
        notes_left: null,
        notes_right: null,
        lastPracticed_left: null,
        lastPracticed_right: null,
        ...patch,
      };
      db.runSync(
        `INSERT INTO user_tricks (id, trickId, status_left, status_right, status, notes_left, notes_right, lastPracticed_left, lastPracticed_right)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRow.id,
          newRow.trickId,
          newRow.status_left,
          newRow.status_right,
          newRow.status,
          newRow.notes_left,
          newRow.notes_right,
          newRow.lastPracticed_left,
          newRow.lastPracticed_right,
        ]
      );
      set((state) => ({ userTricks: [...state.userTricks, newRow] }));
    }
  },

  addCustomTrick(trick) {
    const db = getDb();
    const id = Crypto.randomUUID();
    db.runSync(
      `INSERT INTO tricks (id, name, poleType, difficulty, diagramUrl, referenceVideoUrl, tags, hasSides, isCustom, prerequisiteIds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, '[]')`,
      [
        id,
        trick.name,
        trick.poleType,
        trick.difficulty,
        trick.diagramUrl,
        trick.referenceVideoUrl,
        JSON.stringify(trick.tags),
        trick.hasSides ? 1 : 0,
      ]
    );
    const newTrick: Trick = { ...trick, id, isCustom: true, prerequisiteIds: [] };
    set((state) => ({
      tricks: [...state.tricks, newTrick].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  },

  updateTrickTags(trickId, tags) {
    const db = getDb();
    db.runSync('UPDATE tricks SET tags = ? WHERE id = ?', [JSON.stringify(tags), trickId]);
    set((state) => ({
      tricks: state.tricks.map((t) => (t.id === trickId ? { ...t, tags } : t)),
    }));
  },

  deleteCustomTrick(trickId) {
    const db = getDb();
    db.runSync('DELETE FROM user_tricks WHERE trickId = ?', [trickId]);
    db.runSync('DELETE FROM session_tricks WHERE trickId = ?', [trickId]);
    db.runSync('DELETE FROM videos WHERE trickId = ?', [trickId]);
    db.runSync('DELETE FROM tricks WHERE id = ? AND isCustom = 1', [trickId]);
    set((state) => ({
      tricks: state.tricks.filter((t) => t.id !== trickId),
      userTricks: state.userTricks.filter((ut) => ut.trickId !== trickId),
    }));
  },

  async adminDeleteTrick(trickId) {
    const db = getDb();
    const isCommunity = get().communityTricks.some((t) => t.id === trickId);

    // Clean up local tracking data regardless of source
    db.runSync('DELETE FROM user_tricks WHERE trickId = ?', [trickId]);
    db.runSync('DELETE FROM session_tricks WHERE trickId = ?', [trickId]);
    db.runSync('DELETE FROM videos WHERE trickId = ?', [trickId]);

    if (isCommunity) {
      // Community trick: mark submission as rejected in Supabase
      if (supabase) {
        await supabase
          .from('trick_submissions')
          .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
          .eq('id', trickId);
      }
      set((state) => ({
        communityTricks: state.communityTricks.filter((t) => t.id !== trickId),
        userTricks: state.userTricks.filter((ut) => ut.trickId !== trickId),
      }));
    } else {
      // Local trick (seeded or custom): delete from SQLite
      db.runSync('DELETE FROM tricks WHERE id = ?', [trickId]);
      set((state) => ({
        tricks: state.tricks.filter((t) => t.id !== trickId),
        userTricks: state.userTricks.filter((ut) => ut.trickId !== trickId),
      }));
    }
  },
}));
