import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import { useTricksStore } from '../src/stores/tricksStore';
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


// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SubmissionsScreen() {
  const user = useAuthStore((s) => s.user);
  const admin = getIsAdmin(user);
  const loadCommunityTricks = useTricksStore((s) => s.loadCommunityTricks);

  const [remote, setRemote] = useState<RemoteSubmission[]>([]);
  const [local, setLocal] = useState<LocalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

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
    setActingOn(group.best.id);
    const now = new Date().toISOString();
    await supabase.from('trick_submissions').update({ status: 'approved', reviewed_at: now }).eq('id', group.best.id);
    const dupeIds = group.ids.filter((id) => id !== group.best.id);
    if (dupeIds.length > 0) {
      await supabase.from('trick_submissions').update({ status: 'rejected', reviewed_at: now }).in('id', dupeIds);
    }
    setRemote((prev) => prev.map((r) => {
      if (r.id === group.best.id) return { ...r, status: 'approved' };
      if (dupeIds.includes(r.id)) return { ...r, status: 'rejected' };
      return r;
    }));
    setActingOn(null);
    // Refresh library so the newly approved trick appears immediately
    loadCommunityTricks();
  }

  async function handleRejectGroup(group: SubmissionGroup) {
    if (!supabase) return;
    setActingOn(group.best.id);
    const now = new Date().toISOString();
    await supabase.from('trick_submissions').update({ status: 'rejected', reviewed_at: now }).in('id', group.ids);
    setRemote((prev) => prev.map((r) => (group.ids.includes(r.id) ? { ...r, status: 'rejected' } : r)));
    setActingOn(null);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>;
  }

  // ── Admin view ─────────────────────────────────────────────────────────────
  if (admin) {
    const pendingGroups = groupByName(remote.filter((r) => r.status === 'pending'));
    const reviewed = remote.filter((r) => r.status !== 'pending');

    type ListItem =
      | { type: 'header'; id: string; title: string }
      | { type: 'group'; id: string; group: SubmissionGroup }
      | { type: 'reviewed'; id: string; item: RemoteSubmission };

    const items: ListItem[] = [];
    if (pendingGroups.length > 0) {
      items.push({ type: 'header', id: 'h-pending', title: `Pending (${pendingGroups.length})` });
      for (const g of pendingGroups) {
        items.push({ type: 'group', id: g.best.id, group: g });
      }
    }
    if (reviewed.length > 0) {
      items.push({ type: 'header', id: 'h-reviewed', title: 'Reviewed' });
      for (const r of reviewed) {
        items.push({ type: 'reviewed', id: r.id, item: r });
      }
    }

    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
        }
        ListEmptyComponent={<View style={styles.centered}><Text style={styles.empty}>No submissions yet.</Text></View>}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }

          if (item.type === 'reviewed') {
            const r = item.item;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.trickName}>{r.name}</Text>
                  <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[r.status] }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{STATUS_LABEL[r.status]}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{r.pole_type.replace(/_/g, ' ')} · Difficulty {r.difficulty}</Text>
                {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}
              </View>
            );
          }

          const { group } = item;
          const isActing = actingOn === group.best.id;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.trickName}>{group.name}</Text>
                {group.count > 1 && (
                  <View style={styles.duplicateBadge}>
                    <Text style={styles.duplicateBadgeText}>{group.count} requests</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>
                {group.best.pole_type.replace(/_/g, ' ')} · Difficulty {group.best.difficulty}
              </Text>
              {group.best.notes ? <Text style={styles.notes}>{group.best.notes}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.rejectBtn, isActing && { opacity: 0.4 }]}
                  onPress={() => handleRejectGroup(group)}
                  disabled={isActing}
                  activeOpacity={0.8}
                >
                  {isActing ? <ActivityIndicator color={colors.error} size="small" /> : <Text style={styles.rejectBtnText}>Reject</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveBtn, isActing && { opacity: 0.4 }]}
                  onPress={() => handleApproveGroup(group)}
                  disabled={isActing}
                  activeOpacity={0.8}
                >
                  {isActing ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.approveBtnText}>Approve</Text>}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
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

  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sendNowBtn: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  trickName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, textTransform: 'capitalize' },
  notes: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  duplicateBadge: {
    backgroundColor: colors.accentDim + '22',
    borderWidth: 1,
    borderColor: colors.accentDim,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  duplicateBadgeText: { color: colors.accentDim, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.statusGotIt,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  approveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rejectBtnText: { color: colors.error, fontWeight: '700', fontSize: 14 },
});
