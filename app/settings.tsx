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

type Mode = 'sign_in' | 'sign_up';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
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
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // Supabase may require email confirmation depending on project settings.
        // If confirmations are disabled, user is signed in immediately.
        Alert.alert(
          'Account created',
          'You are now signed in.',
        );
      }
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message ?? 'Sign-in failed.');
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
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardSubtext}>
            Optional — sign in to link your trick suggestions to your account.
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
  modeBtnActive: {
    backgroundColor: colors.accent,
  },
  modeBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  modeBtnTextActive: {
    color: colors.bg,
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
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
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
});
