import { getDb } from '../db';

export type RemoteSubmission = {
  id: string;
  name: string;
  pole_type: string;
  difficulty: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string | null;
};

export type LocalSubmission = {
  id: string;
  name: string;
  pole_type: string;
  difficulty: number;
  notes: string | null;
  created_at: string;
  status: 'queued';
};

export type Section = {
  title: string;
  data: (RemoteSubmission | LocalSubmission)[];
};

export function getIsAdmin(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  return user?.app_metadata?.is_admin === true;
}

export function loadLocalQueue(): LocalSubmission[] {
  const db = getDb();
  const rows = db.getAllSync<Omit<LocalSubmission, 'status'>>(
    'SELECT id, name, pole_type, difficulty, notes, created_at FROM pending_submissions ORDER BY created_at DESC'
  );
  return rows.map((r) => ({ ...r, status: 'queued' as const }));
}

/** Build the ordered list of sections to render in the submissions screen. */
export function buildSections(
  remote: RemoteSubmission[],
  local: LocalSubmission[],
  isAdmin: boolean,
): Section[] {
  const sections: Section[] = [];

  if (isAdmin) {
    const pending = remote.filter((r) => r.status === 'pending');
    if (pending.length > 0) sections.push({ title: 'Pending Review', data: pending });
  }

  if (local.length > 0) {
    sections.push({ title: 'Queued (offline)', data: local });
  }

  const sent = isAdmin ? remote.filter((r) => r.status !== 'pending') : remote;
  if (sent.length > 0) {
    sections.push({ title: isAdmin ? 'Reviewed' : 'Your Submissions', data: sent });
  }

  return sections;
}

/** Returns true if a remote submission row should be visible to the given userId.
 *  Mirrors the Supabase RLS SELECT policy:
 *    - admins see everything
 *    - users see their own rows OR rows with no owner (user_id IS NULL)
 */
export function isVisibleToUser(
  row: Pick<RemoteSubmission, 'user_id'>,
  userId: string | null,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (row.user_id === null) return true;
  return row.user_id === userId;
}
