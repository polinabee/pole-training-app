export const CREATE_TRICKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tricks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    poleType TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    diagramUrl TEXT,
    referenceVideoUrl TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    hasSides INTEGER NOT NULL DEFAULT 1,
    isCustom INTEGER NOT NULL DEFAULT 0,
    prerequisiteIds TEXT NOT NULL DEFAULT '[]'
  );
`;

export const CREATE_USER_TRICKS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_tricks (
    id TEXT PRIMARY KEY,
    trickId TEXT NOT NULL REFERENCES tricks(id),
    status_left TEXT,
    status_right TEXT,
    status TEXT,
    notes_left TEXT,
    notes_right TEXT,
    lastPracticed_left TEXT,
    lastPracticed_right TEXT
  );
`;

export const CREATE_TRAINING_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    notes TEXT
  );
`;

export const CREATE_SESSION_TRICKS_TABLE = `
  CREATE TABLE IF NOT EXISTS session_tricks (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL REFERENCES training_sessions(id),
    trickId TEXT NOT NULL REFERENCES tricks(id),
    side TEXT NOT NULL
  );
`;

export const CREATE_VIDEOS_TABLE = `
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    localUri TEXT NOT NULL,
    trickId TEXT,
    sessionId TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL
  );
`;

export const CREATE_PENDING_SUBMISSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS pending_submissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pole_type TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    has_sides INTEGER NOT NULL DEFAULT 1,
    tags TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    created_at TEXT NOT NULL
  );
`;
