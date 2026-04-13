import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleMagicLink() {
    if (!email.trim() || !supabase) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message ?? 'Could not send sign-in link.');
    } finally {
      setSending(false);
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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Account</Text>

      {!isSupabaseConfigured ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>Using app locally</Text>
          <Text style={styles.cardSubtext}>
            Your training data is stored on this device. Sign-in is not available in this build.
          </Text>
        </View>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.email}>{user.email ?? 'Signed in'}</Text>
          <Text style={styles.cardSubtext}>
            Signed in · submissions are linked to your account
          </Text>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut
              ? <ActivityIndicator color={colors.error} />
              : <Text style={styles.signOutBtnText}>Sign out</Text>
            }
          </TouchableOpacity>
        </View>
      ) : sent ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>Check your email</Text>
          <Text style={styles.cardSubtext}>
            We sent a sign-in link to {email}. Tap it to sign in — no password needed.
          </Text>
          <TouchableOpacity onPress={() => { setSent(false); setEmail(''); }} activeOpacity={0.7}>
            <Text style={styles.resetLink}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardSubtext}>
            Optional — sign in to link your trick suggestions to your account.
            Your training data always stays on this device.
          </Text>
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
          <TouchableOpacity
            style={[styles.sendBtn, (!email.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleMagicLink}
            disabled={!email.trim() || sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.sendBtnText}>Send sign-in link</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>pos·pole — personal pole training tracker</Text>
        <Text style={styles.cardSubtext}>Training data is stored locally on your device.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  email: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtext: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 15,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 15,
  },
  resetLink: {
    color: colors.accentDim,
    fontSize: 13,
    textAlign: 'center',
  },
});
