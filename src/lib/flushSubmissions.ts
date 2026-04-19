import { getDb } from '../db';
import { supabase } from './supabase';

export async function flushPendingSubmissions(userId: string | null): Promise<void> {
  if (!supabase) return;
  const db = getDb();
  const pending = db.getAllSync<{
    id: string;
    name: string;
    pole_type: string;
    difficulty: number;
    has_sides: number;
    tags: string;
    notes: string | null;
  }>('SELECT * FROM pending_submissions');

  for (const row of pending) {
    const { error } = await supabase.from('trick_submissions').insert({
      user_id: userId ?? null,
      name: row.name,
      pole_type: row.pole_type,
      difficulty: row.difficulty,
      has_sides: Boolean(row.has_sides),
      tags: JSON.parse(row.tags) as string[],
      notes: row.notes,
    });
    if (!error) {
      db.runSync('DELETE FROM pending_submissions WHERE id = ?', [row.id]);
    }
  }
}
