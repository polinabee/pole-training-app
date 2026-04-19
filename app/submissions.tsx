import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import { flushPendingSubmissions } from '../src/lib/flushSubmissions';
import {
  getIsAdmin,
  loadLocalQueue,
  buildSections,
  type RemoteSubmission,
  type LocalSubmission,
} from '../src/lib/submissionsHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmissionGroup = {
  name: string;
  count: number;
  // The "best" submission to show details for (most notes/info)
  best: RemoteSubmission;
  // All IDs in the group (to bulk-reject duplicates)
  ids: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByName(submissions: RemoteSubmission[]): SubmissionGroup[] {
  const map = new Map<string, RemoteSubmission[]>();
  for (const s of submissions) {
    const key = s.name.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.values()).map((group) => {
    // Pick the submission with the most notes as the "best" one
    const best = group.reduce((a, b) =>
      (b.notes?.length ?? 0) > (a.notes?.length ?? 0) ? b : a
    );
    return { name: best.name, count: group.length, best, ids: group.map((s) => s.id) };
  });
}

const STATUS_COLOR: Record<string, string> = {
  pending: colors.statusLearning,
  approved: colors.statusGotIt,
  rejected: colors.error,
  queued: colors.textMuted,
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  queued: 'Queued (offline)',
};

// ─── Admin review flow ────────────────────────────────────────────────────────

function AdminReview({
  groups,
  onApprove,
  onReject,
  onDone,
}: {
  groups: SubmissionGroup[];
  onApprove: (group: SubmissionGroup) => Promise<void>;
  onReject: (group: SubmissionGroup) => Promise<void>;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [acting, setActing] = useState(false);

  if (groups.length === 0) {
    return (
      <View style={styles.reviewEmpty}>
        <Text style={styles.reviewEmptyTitle}>All caught up</Text>
        <Text style={styles.reviewEmptyBody}>No pending submissions to review.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const group = groups[index];
  const progress = `${index + 1} of ${groups.length}`;

  async function act(fn: () => Promise<void>) {
    setActing(true);
    await fn();
    setActing(false);
    if (index + 1 < groups.length) {
      setIndex((i) => i + 1);
    } else {
      onDone();
    }
  }

  return (
    <View style={styles.reviewContainer}>
      {/* Progress */}
      <View style={styles.reviewProgress}>
        <TouchableOpacity onPress={onDone} hitSlop={12}>
          <Text style={styles.reviewBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.reviewCounter}>{progress}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((index + 1) / groups.length) * 100}%` as `${number}%` }]} />
      </View>

      {/* Card */}
      <ScrollView style={styles.reviewScroll} contentContainerStyle={styles.reviewContent}>
        <Text style={styles.reviewTrickName}>{group.name}</Text>

        {group.count > 1 && (
          <View style={styles.duplicateBadge}>
            <Text style={styles.duplicateBadgeText}>
              {group.count} people requested this trick
            </Text>
          </View>
        )}

        <View style={styles.reviewMeta}>
          <MetaChip label={group.best.pole_type.replace(/_/g, ' ')} />
          <MetaChip label={`Difficulty ${group.best.difficulty}`} />
          <MetaChip label={group.best.has_sides !== false ? 'Has sides' : 'No sides'} />
        </View>

        {group.best.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{group.best.notes}</Text>
          </View>
        ) : null}

        {group.count > 1 && (
          <Text style={styles.duplicateNote}>
            Approving will accept this trick and automatically reject {group.count - 1} duplicate{group.count > 2 ? 's' : ''}.
          </Text>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.reviewActions}>
        <TouchableOpacity
          style={[styles.rejectBtnLarge, acting && { opacity: 0.5 }]}
          onPress={() => act(() => onReject(group))}
          disabled={acting}
          activeOpacity={0.8}
        >
          {acting ? <ActivityIndicator color={colors.error} /> : <Text style={styles.rejectBtnLargeText}>Reject</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.approveBtnLarge, acting && { opacity: 0.5 }]}
          onPress={() => act(() => onApprove(group))}
          disabled={acting}
          activeOpacity={0.8}
        >
          {acting ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.approveBtnLargeText}>Approve</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SubmissionsScreen() {
  const user = useAuthStore((s) => s.user);
  const admin = getIsAdmin(user);

  const [remote, setRemote] = useState<RemoteSubmission[]>([]);
  const [local, setLocal] = useState<LocalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async () => {
    setLocal(loadLocalQueue());
    if (isSupabaseConfigured && supabase) {
      let data: RemoteSubmission[] | null = null;
      if (admin) {
        const res = await supabase
          .from('trick_submissions')
          .select('id, name, pole_type, difficulty, has_sides, notes, status, created_at, user_id')
          .order('created_at', { ascending: true });
        data = res.data as RemoteSubmission[];
      } else if (user?.id) {
        const res = await supabase
          .from('trick_submissions')
          .select('id, name, pole_type, difficulty, has_sides, notes, status, created_at, user_id')
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order('created_at', { ascending: false });
        data = res.data as RemoteSubmission[];
      }
      setRemote(data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [admin, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleFlush() {
    setFlushing(true);
    await flushPendingSubmissions(user?.id ?? null).catch(() => {});
    await load();
    setFlushing(false);
  }

  async function handleApproveGroup(group: SubmissionGroup) {
    if (!supabase) return;
    const now = new Date().toISOString();
    // Approve the best submission
    await supabase
      .from('trick_submissions')
      .update({ status: 'approved', reviewed_at: now })
      .eq('id', group.best.id);
    // Reject duplicates
    const dupeIds = group.ids.filter((id) => id !== group.best.id);
    if (dupeIds.length > 0) {
      await supabase
        .from('trick_submissions')
        .update({ status: 'rejected', reviewed_at: now })
        .in('id', dupeIds);
    }
    setRemote((prev) =>
      prev.map((r) => {
        if (r.id === group.best.id) return { ...r, status: 'approved' };
        if (dupeIds.includes(r.id)) return { ...r, status: 'rejected' };
        return r;
      })
    );
  }

  async function handleRejectGroup(group: SubmissionGroup) {
    if (!supabase) return;
    const now = new Date().toISOString();
    await supabase
      .from('trick_submissions')
      .update({ status: 'rejected', reviewed_at: now })
      .in('id', group.ids);
    setRemote((prev) =>
      prev.map((r) => (group.ids.includes(r.id) ? { ...r, status: 'rejected' } : r))
    );
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;
  }

  // ── Admin review mode ──────────────────────────────────────────────────────
  const pendingGroups = admin
    ? groupByName(remote.filter((r) => r.status === 'pending'))
    : [];

  if (admin && reviewing) {
    return (
      <AdminReview
        groups={pendingGroups}
        onApprove={handleApproveGroup}
        onReject={handleRejectGroup}
        onDone={() => setReviewing(false)}
      />
    );
  }

  // ── Admin overview ─────────────────────────────────────────────────────────
  if (admin) {
    const reviewed = remote.filter((r) => r.status !== 'pending');
    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          pendingGroups.length > 0 ? (
            <TouchableOpacity style={styles.reviewBanner} onPress={() => setReviewing(true)} activeOpacity={0.8}>
              <View>
                <Text style={styles.reviewBannerTitle}>
                  {pendingGroups.length} trick{pendingGroups.length !== 1 ? 's' : ''} pending review
                </Text>
                <Text style={styles.reviewBannerSub}>Tap to review one by one</Text>
              </View>
              <Text style={styles.reviewBannerChevron}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.allClearBanner}>
              <Text style={styles.allClearText}>All submissions reviewed</Text>
            </View>
          )
        }
        data={reviewed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.trickName}>{item.name}</Text>
              <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.pole_type.replace(/_/g, ' ')} · Difficulty {item.difficulty}
            </Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
        ListEmptyComponent={reviewed.length === 0 && pendingGroups.length === 0
          ? <View style={styles.centered}><Text style={styles.empty}>No submissions yet.</Text></View>
          : null
        }
      />
    );
  }

  // ── User view ──────────────────────────────────────────────────────────────
  const sections = buildSections(remote, local, false);
  const allItems = sections.flatMap((s) => [
    { type: 'header' as const, title: s.title, id: `h-${s.title}` },
    ...s.data.map((d) => ({ type: 'item' as const, ...d })),
  ]);

  if (allItems.length === 0) {
    return <View style={styles.centered}><Text style={styles.empty}>No submissions yet.</Text></View>;
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={allItems}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
      }
      renderItem={({ item }) => {
        if (item.type === 'header') {
          const isQueued = item.title === 'Queued (offline)';
          return (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{item.title}</Text>
              {isQueued && (
                <TouchableOpacity onPress={handleFlush} disabled={flushing} activeOpacity={0.7}>
                  {flushing
                    ? <ActivityIndicator size="small" color={colors.accent} />
                    : <Text style={styles.sendNowBtn}>Send now</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        }
        const status = (item as RemoteSubmission).status ?? 'queued';
        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.trickName}>{item.name}</Text>
              <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[status] }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>
                  {STATUS_LABEL[status]}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>{item.pole_type.replace(/_/g, ' ')} · Difficulty {item.difficulty}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  empty: { color: colors.textMuted, fontSize: 15 },

  // Admin overview
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  reviewBannerTitle: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  reviewBannerSub: { color: colors.bg, fontSize: 13, opacity: 0.8, marginTop: 2 },
  reviewBannerChevron: { color: colors.bg, fontSize: 28, marginLeft: 'auto', fontWeight: '300' },
  allClearBanner: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  allClearText: { color: colors.statusGotIt, fontSize: 14, fontWeight: '600' },

  // Review flow
  reviewContainer: { flex: 1, backgroundColor: colors.bg },
  reviewProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  reviewBack: { color: colors.textMuted, fontSize: 15 },
  reviewCounter: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  progressTrack: {
    height: 3,
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
  reviewScroll: { flex: 1 },
  reviewContent: { padding: 24, paddingBottom: 40 },
  reviewTrickName: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 12 },
  duplicateBadge: {
    backgroundColor: colors.accentDim + '22',
    borderWidth: 1,
    borderColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  duplicateBadgeText: { color: colors.accentDim, fontSize: 13, fontWeight: '600' },
  reviewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  metaChip: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipText: { color: colors.textMuted, fontSize: 13, textTransform: 'capitalize' },
  notesBlock: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  notesLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  notesText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  duplicateNote: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  approveBtnLarge: {
    flex: 2,
    backgroundColor: colors.statusGotIt,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  approveBtnLargeText: { color: colors.bg, fontWeight: '700', fontSize: 17 },
  rejectBtnLarge: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rejectBtnLargeText: { color: colors.error, fontWeight: '700', fontSize: 17 },
  reviewEmpty: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  reviewEmptyTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  reviewEmptyBody: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  doneBtn: { marginTop: 16, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  doneBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },

  // Shared card
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  sendNowBtn: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  trickName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, textTransform: 'capitalize' },
  notes: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
});
