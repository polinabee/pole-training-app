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
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import { getDb } from '../src/db';

const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL;

type RemoteSubmission = {
  id: string;
  name: string;
  pole_type: string;
  difficulty: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string | null;
};

type LocalSubmission = {
  id: string;
  name: string;
  pole_type: string;
  difficulty: number;
  notes: string | null;
  created_at: string;
  status: 'queued';
};

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

export default function SubmissionsScreen() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = Boolean(ADMIN_EMAIL && user?.email === ADMIN_EMAIL);

  const [remote, setRemote] = useState<RemoteSubmission[]>([]);
  const [local, setLocal] = useState<LocalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Always load from local queue
    const db = getDb();
    const rows = db.getAllSync<LocalSubmission>(
      'SELECT id, name, pole_type, difficulty, notes, created_at FROM pending_submissions ORDER BY created_at DESC'
    );
    setLocal(rows.map((r) => ({ ...r, status: 'queued' as const })));

    // Load from Supabase if configured
    if (isSupabaseConfigured && supabase) {
      const query = isAdmin
        ? supabase
            .from('trick_submissions')
            .select('id, name, pole_type, difficulty, notes, status, created_at, user_id')
            .order('created_at', { ascending: false })
        : supabase
            .from('trick_submissions')
            .select('id, name, pole_type, difficulty, notes, status, created_at, user_id')
            .eq('user_id', user?.id ?? '')
            .order('created_at', { ascending: false });

      const { data } = await query;
      setRemote((data as RemoteSubmission[]) ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [isAdmin, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from('trick_submissions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setRemote((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
      );
    }
  }

  async function handleReject(id: string) {
    if (!supabase) return;
    Alert.alert('Reject submission', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase!
            .from('trick_submissions')
            .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
            .eq('id', id);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            setRemote((prev) =>
              prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
            );
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const sections: { title: string; data: (RemoteSubmission | LocalSubmission)[] }[] = [];

  if (isAdmin && remote.filter((r) => r.status === 'pending').length > 0) {
    sections.push({ title: 'Pending Review', data: remote.filter((r) => r.status === 'pending') });
  }
  if (local.length > 0) {
    sections.push({ title: 'Queued (offline)', data: local });
  }
  const sent = isAdmin
    ? remote.filter((r) => r.status !== 'pending')
    : remote;
  if (sent.length > 0) {
    sections.push({ title: isAdmin ? 'Reviewed' : 'Your Submissions', data: sent });
  }

  const allItems = sections.flatMap((s) => [
    { type: 'header' as const, title: s.title, id: `h-${s.title}` },
    ...s.data.map((d) => ({ type: 'item' as const, ...d })),
  ]);

  if (allItems.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No submissions yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={allItems}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.accent}
        />
      }
      renderItem={({ item }) => {
        if (item.type === 'header') {
          return <Text style={styles.sectionHeader}>{item.title}</Text>;
        }

        const status = (item as RemoteSubmission).status ?? 'queued';
        const isPending = status === 'pending';

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
            <Text style={styles.meta}>
              {item.pole_type.replace('_', ' ')} · Difficulty {item.difficulty}
              {isAdmin && (item as RemoteSubmission).user_id
                ? ` · ${(item as RemoteSubmission).user_id!.slice(0, 8)}…`
                : ''}
            </Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            {isAdmin && isPending && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trickName: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  notes: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.statusGotIt,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  approveBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 14,
  },
});
