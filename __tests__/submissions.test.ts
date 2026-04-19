import { buildSections, getIsAdmin, isVisibleToUser, isDuplicateInLibrary } from '../src/lib/submissionsHelpers';
import type { RemoteSubmission, LocalSubmission } from '../src/lib/submissionsHelpers';

beforeEach(() => {
  jest.resetModules();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const base: Omit<RemoteSubmission, 'status' | 'user_id'> = {
  id: '1',
  name: 'Fireman Spin',
  pole_type: 'both',
  difficulty: 2,
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
};

function remote(overrides: Partial<RemoteSubmission>): RemoteSubmission {
  return { ...base, status: 'pending', user_id: 'user-abc', ...overrides };
}

function local(overrides: Partial<LocalSubmission> = {}): LocalSubmission {
  return {
    id: 'q1',
    name: 'Draft Trick',
    pole_type: 'static_only',
    difficulty: 3,
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    status: 'queued',
    ...overrides,
  };
}

// ─── isDuplicateInLibrary ─────────────────────────────────────────────────────

describe('isDuplicateInLibrary', () => {
  const library = [{ name: 'Fireman Spin' }, { name: 'Gemini' }, { name: 'Chair Spin' }];

  it('returns true for exact match', () => {
    expect(isDuplicateInLibrary('Fireman Spin', library)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isDuplicateInLibrary('fireman spin', library)).toBe(true);
    expect(isDuplicateInLibrary('GEMINI', library)).toBe(true);
  });

  it('ignores leading/trailing whitespace', () => {
    expect(isDuplicateInLibrary('  Chair Spin  ', library)).toBe(true);
  });

  it('returns false for a new trick name', () => {
    expect(isDuplicateInLibrary('Twisted Jasmine', library)).toBe(false);
  });

  it('returns false for empty library', () => {
    expect(isDuplicateInLibrary('Fireman Spin', [])).toBe(false);
  });
});

// ─── getIsAdmin ───────────────────────────────────────────────────────────────

describe('getIsAdmin', () => {
  it('returns true when app_metadata.is_admin is true', () => {
    expect(getIsAdmin({ app_metadata: { is_admin: true } })).toBe(true);
  });
  it('returns false when is_admin is false', () => {
    expect(getIsAdmin({ app_metadata: { is_admin: false } })).toBe(false);
  });
  it('returns false when app_metadata is absent', () => {
    expect(getIsAdmin({})).toBe(false);
  });
  it('returns false for null user', () => {
    expect(getIsAdmin(null)).toBe(false);
  });
});

// ─── isVisibleToUser (mirrors RLS SELECT policy) ──────────────────────────────

describe('isVisibleToUser', () => {
  it('admin sees all rows', () => {
    expect(isVisibleToUser({ user_id: 'other-user' }, 'admin-id', true)).toBe(true);
    expect(isVisibleToUser({ user_id: null }, null, true)).toBe(true);
  });

  it('user sees their own submissions', () => {
    expect(isVisibleToUser({ user_id: 'user-abc' }, 'user-abc', false)).toBe(true);
  });

  it('user does not see another user\'s submissions', () => {
    expect(isVisibleToUser({ user_id: 'user-xyz' }, 'user-abc', false)).toBe(false);
  });

  it('user sees anonymous submissions (user_id IS NULL)', () => {
    expect(isVisibleToUser({ user_id: null }, 'user-abc', false)).toBe(true);
  });

  it('logged-out user sees anonymous submissions', () => {
    expect(isVisibleToUser({ user_id: null }, null, false)).toBe(true);
  });

  it('logged-out user does not see owned submissions', () => {
    expect(isVisibleToUser({ user_id: 'user-abc' }, null, false)).toBe(false);
  });
});

// ─── buildSections ────────────────────────────────────────────────────────────

describe('buildSections — regular user', () => {
  it('returns empty array when nothing to show', () => {
    expect(buildSections([], [], false)).toEqual([]);
  });

  it('puts remote submissions under "Your Submissions"', () => {
    const sections = buildSections([remote({ status: 'approved' })], [], false);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Your Submissions');
    expect(sections[0].data).toHaveLength(1);
  });

  it('puts local queue under "Queued (offline)"', () => {
    const sections = buildSections([], [local()], false);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Queued (offline)');
  });

  it('shows queued before remote', () => {
    const sections = buildSections([remote({ status: 'pending' })], [local()], false);
    expect(sections[0].title).toBe('Queued (offline)');
    expect(sections[1].title).toBe('Your Submissions');
  });

  it('shows all statuses under Your Submissions for regular user', () => {
    const rows = [
      remote({ id: '1', status: 'pending' }),
      remote({ id: '2', status: 'approved' }),
      remote({ id: '3', status: 'rejected' }),
    ];
    const sections = buildSections(rows, [], false);
    expect(sections[0].title).toBe('Your Submissions');
    expect(sections[0].data).toHaveLength(3);
  });
});

describe('buildSections — admin', () => {
  it('splits pending into its own section', () => {
    const rows = [
      remote({ id: '1', status: 'pending' }),
      remote({ id: '2', status: 'approved' }),
    ];
    const sections = buildSections(rows, [], true);
    const titles = sections.map((s) => s.title);
    expect(titles).toContain('Pending Review');
    expect(titles).toContain('Reviewed');
  });

  it('omits Pending Review section when nothing is pending', () => {
    const rows = [remote({ status: 'approved' })];
    const sections = buildSections(rows, [], true);
    expect(sections.map((s) => s.title)).not.toContain('Pending Review');
    expect(sections[0].title).toBe('Reviewed');
  });

  it('approved/rejected rows go under Reviewed, not Pending Review', () => {
    const rows = [
      remote({ id: '1', status: 'pending' }),
      remote({ id: '2', status: 'approved' }),
      remote({ id: '3', status: 'rejected' }),
    ];
    const sections = buildSections(rows, [], true);
    const pending = sections.find((s) => s.title === 'Pending Review')!;
    const reviewed = sections.find((s) => s.title === 'Reviewed')!;
    expect(pending.data).toHaveLength(1);
    expect(reviewed.data).toHaveLength(2);
  });

  it('shows all three sections when data is present', () => {
    const sections = buildSections(
      [remote({ id: '1', status: 'pending' }), remote({ id: '2', status: 'approved' })],
      [local()],
      true,
    );
    expect(sections.map((s) => s.title)).toEqual([
      'Pending Review',
      'Queued (offline)',
      'Reviewed',
    ]);
  });
});

// ─── Local queue integration (real SQLite) ────────────────────────────────────

describe('loadLocalQueue', () => {
  beforeEach(() => {
    jest.resetModules();
    require('expo-sqlite').__reset();
  });

  it('returns empty array when nothing is queued', () => {
    const { runMigrations } = require('../src/db/migrations');
    runMigrations();
    const { loadLocalQueue } = require('../src/lib/submissionsHelpers');
    expect(loadLocalQueue()).toEqual([]);
  });

  it('returns queued items with status "queued"', () => {
    const { runMigrations } = require('../src/db/migrations');
    runMigrations();
    const { getDb } = require('../src/db');
    getDb().runSync(
      `INSERT INTO pending_submissions (id, name, pole_type, difficulty, has_sides, tags, notes, created_at)
       VALUES ('q1', 'Gemini', 'static_only', 4, 1, '[]', null, '2025-01-01T00:00:00Z')`,
    );
    const { loadLocalQueue } = require('../src/lib/submissionsHelpers');
    const result = loadLocalQueue();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'Gemini', status: 'queued' });
  });

  it('deletes from queue after flush succeeds', async () => {
    const { runMigrations } = require('../src/db/migrations');
    runMigrations();
    const { getDb } = require('../src/db');
    getDb().runSync(
      `INSERT INTO pending_submissions (id, name, pole_type, difficulty, has_sides, tags, notes, created_at)
       VALUES ('q1', 'Gemini', 'static_only', 4, 1, '[]', null, '2025-01-01T00:00:00Z')`,
    );

    // Mock supabase so the insert "succeeds"
    jest.mock('../src/lib/supabase', () => ({
      supabase: {
        from: () => ({
          insert: async () => ({ error: null }),
        }),
      },
      isSupabaseConfigured: true,
    }));

    const { flushPendingSubmissions } = require('../src/lib/flushSubmissions');
    await flushPendingSubmissions(null);

    const { loadLocalQueue } = require('../src/lib/submissionsHelpers');
    expect(loadLocalQueue()).toEqual([]);
  });
});
