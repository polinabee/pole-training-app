import * as Crypto from 'expo-crypto';
import { getDb } from './index';
import {
  CREATE_TRICKS_TABLE,
  CREATE_USER_TRICKS_TABLE,
  CREATE_TRAINING_SESSIONS_TABLE,
  CREATE_SESSION_TRICKS_TABLE,
  CREATE_VIDEOS_TABLE,
  CREATE_PENDING_SUBMISSIONS_TABLE,
} from './schema';

export function runMigrations(): void {
  const db = getDb();
  db.execSync(CREATE_TRICKS_TABLE);
  db.execSync(CREATE_USER_TRICKS_TABLE);
  db.execSync(CREATE_TRAINING_SESSIONS_TABLE);
  db.execSync(CREATE_SESSION_TRICKS_TABLE);
  db.execSync(CREATE_VIDEOS_TABLE);
  // v4 — offline queue for trick submissions
  db.execSync(CREATE_PENDING_SUBMISSIONS_TABLE);

  // v2/v3 — add columns if not already present (PRAGMA avoids duplicate-column warnings)
  const sessionCols = db.getAllSync<{ name: string }>('PRAGMA table_info(training_sessions)').map(r => r.name);
  const stCols = db.getAllSync<{ name: string }>('PRAGMA table_info(session_tricks)').map(r => r.name);
  if (!sessionCols.includes('title'))          db.execSync('ALTER TABLE training_sessions ADD COLUMN title TEXT');
  if (!stCols.includes('reps'))                db.execSync('ALTER TABLE session_tricks ADD COLUMN reps INTEGER NOT NULL DEFAULT 1');
  if (!stCols.includes('completed_reps'))      db.execSync('ALTER TABLE session_tricks ADD COLUMN completed_reps INTEGER NOT NULL DEFAULT 0');
  if (!stCols.includes('poleMode'))            db.execSync('ALTER TABLE session_tricks ADD COLUMN poleMode TEXT');
  // v3 — fix poleType for static-only momentum spins
  db.runSync(`UPDATE tricks SET poleType = 'static_only' WHERE name IN ('Chair Spin', 'Fireman Spin', 'Back Hook Spin') AND isCustom = 0`);
  // v3 — add missing tricks to existing (already-seeded) DBs only
  // (fresh installs get these via seedTricks; inserting here would cause seedTricks to skip)
  const seededCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM tricks WHERE isCustom = 0');
  if (seededCount && seededCount.count > 0) {
    const existing = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM tricks WHERE name = 'Phoenix' AND isCustom = 0`);
    if (!existing || existing.count === 0) {
      db.runSync(
        `INSERT INTO tricks (id, name, poleType, difficulty, diagramUrl, referenceVideoUrl, tags, hasSides, isCustom, prerequisiteIds) VALUES (?, 'Phoenix', 'static_only', 4, NULL, NULL, '["knee grip","flexibility","splits"]', 1, 0, '[]')`,
        [Crypto.randomUUID()]
      );
    }
    const existingCKL = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM tricks WHERE name = 'Cross Knee Layback' AND isCustom = 0`);
    if (!existingCKL || existingCKL.count === 0) {
      db.runSync(
        `INSERT INTO tricks (id, name, poleType, difficulty, diagramUrl, referenceVideoUrl, tags, hasSides, isCustom, prerequisiteIds) VALUES (?, 'Cross Knee Layback', 'both', 3, NULL, NULL, '["knee grip","flexibility"]', 1, 0, '[]')`,
        [Crypto.randomUUID()]
      );
    }
  }
}
