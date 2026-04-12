import { getDb } from './index';
import {
  CREATE_TRICKS_TABLE,
  CREATE_USER_TRICKS_TABLE,
  CREATE_TRAINING_SESSIONS_TABLE,
  CREATE_SESSION_TRICKS_TABLE,
  CREATE_VIDEOS_TABLE,
} from './schema';

export function runMigrations(): void {
  const db = getDb();
  db.execSync(CREATE_TRICKS_TABLE);
  db.execSync(CREATE_USER_TRICKS_TABLE);
  db.execSync(CREATE_TRAINING_SESSIONS_TABLE);
  db.execSync(CREATE_SESSION_TRICKS_TABLE);
  db.execSync(CREATE_VIDEOS_TABLE);
}
