import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';
import { useTricksStore } from '../../src/stores/tricksStore';
import { useSessionsStore } from '../../src/stores/sessionsStore';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

type Mode = 'sign_in' | 'sign_up';

function useStats() {
  const userTricks = useTricksStore((s) => s.userTricks);
  const sessions = useSessionsStore((s) => s.sessions);

  const gotIt = userTricks.filter(
    (ut) => ut.status === 'got_it' || ut.status_left === 'got_it' || ut.status_right === 'got_it'
  ).length;
  const inProgress = userTricks.filter(
    (ut) =>
      (ut.status === 'learning' || ut.status === 'polishing' ||
       ut.status_left === 'learning' || ut.status_left === 'polishing' ||
       ut.status_right === 'learning' || ut.status_right === 'polishing') &&
      ut.status !== 'got_it' && ut.status_left !== 'got_it' && ut.status_right !== 'got_it'
  ).length;

  return { gotIt, inProgress, totalSessions: sessions.length };
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);
  const { gotIt, inProgress, totalSessions } = useStats();

  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password || !supabase) return;
    setLoading(true);
    try {
      if (mode === 'sign_in') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setUser(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // If email confirmation is enabled in Supabase, user won't be signed
        // in yet — switch to sign-in mode so they know to check their email.
        if (data.session) {
          // Confirmation disabled — signed in immediately
          setUser(data.user);
        } else {
          Alert.alert(
            'Check your email',
            'We sent a confirmation link to ' + email.trim() + '. Tap it, then come back and sign in.',
          );
          setMode('sign_in');
        }
      }
      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Sign-in failed.';
      const friendly = msg.includes('Email not confirmed')
        ? 'Your email address is not confirmed yet. Check your inbox for a confirmation link, or turn off "Confirm email" in your Supabase dashboard.'
        : msg;
      Alert.alert('Error', friendly);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
        },
      },
    ]);
  }

  const isValid = email.trim().length > 0 && password.length >= 6;

  const statsBlock = (
    <>
      <Text style={styles.sectionLabel}>Your Progress</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.statusGotIt }]}>{gotIt}</Text>
          <Text style={styles.statLabel}>Got it</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.statusLearning }]}>{inProgress}</Text>
          <Text style={styles.statLabel}>In progress</Text>
        </View>
      </View>
    </>
  );

  // ── Logged in ──────────────────────────────────────────────────────────────
  if (user) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.email ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.emailText}>{user.email ?? 'Signed in'}</Text>
            <Text style={styles.subtleText}>Signed in</Text>
          </View>
        </View>

        {statsBlock}

        <Text style={styles.sectionLabel}>Activity</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/submissions')}
          activeOpacity={0.7}
        >
          <Text style={styles.rowLabel}>My Submissions</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Account</Text>
        <TouchableOpacity
          style={[styles.row, styles.rowDestructive]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          {signingOut
            ? <ActivityIndicator color={colors.error} style={{ flex: 1 }} />
            : <>
                <Text style={styles.rowLabelDestructive}>Sign out</Text>
                <Text style={styles.rowChevron}>›</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>pos·pole</Text>
          <Text style={styles.subtleText}>
            Personal pole training tracker. Training data stays on your device.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ── Not configured ─────────────────────────────────────────────────────────
  if (!isSupabaseConfigured) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {statsBlock}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.infoCard}>
          <Text style={styles.subtleText}>
            Sign-in is not available in this build. Your training data is stored locally.
          </Text>
        </View>
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>pos·pole</Text>
          <Text style={styles.subtleText}>Personal pole training tracker.</Text>
        </View>
      </ScrollView>
    );
  }

  // ── Anonymous ─────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {statsBlock}

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.signInCard}>
        <Text style={styles.subtleText}>
          Sign in to link your trick submissions to your account.
          Your training data always stays on this device.
        </Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'sign_in' && styles.modeBtnActive]}
            onPress={() => setMode('sign_in')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, mode === 'sign_in' && styles.modeBtnTextActive]}>
              Sign in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'sign_up' && styles.modeBtnActive]}
            onPress={() => setMode('sign_up')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, mode === 'sign_up' && styles.modeBtnTextActive]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={colors.textDim}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={colors.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={styles.submitBtnText}>
                {mode === 'sign_in' ? 'Sign in' : 'Create account'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>pos·pole</Text>
        <Text style={styles.subtleText}>
          Personal pole training tracker. Training data stays on your device.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 60 },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
  },

  // Logged-in header
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
    marginTop: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.bg, fontSize: 24, fontWeight: '700' },
  avatarInfo: { flex: 1, gap: 4 },
  emailText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  subtleText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statNumber: { color: colors.text, fontSize: 28, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  rowDestructive: { borderColor: colors.error + '44' },
  rowLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  rowLabelDestructive: { flex: 1, color: colors.error, fontSize: 15, fontWeight: '500' },
  rowChevron: { color: colors.textMuted, fontSize: 20 },

  // Sign-in card
  signInCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: colors.accent },
  modeBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  modeBtnTextActive: { color: colors.bg },
  input: {
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },

  // Info / about
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  aboutTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
