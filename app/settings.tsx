import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import { isSupabaseConfigured } from '../src/lib/supabase';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in failed', 'Could not sign in with Apple. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      Alert.alert('Sign in failed', 'Could not sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
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
          <Text style={styles.cardText}>
            Sign-in is not available — Supabase is not configured.
          </Text>
        </View>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.email}>{user.email ?? 'Signed in'}</Text>
          <Text style={styles.cardSubtext}>
            Signed in · your submissions are linked to your account
          </Text>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.signOutBtnText}>Sign out</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardSubtext}>
            Sign in to link your trick suggestions to your account.
            Your training data always stays on your device.
          </Text>
          <View style={styles.signInButtons}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={10}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
            {appleLoading && <ActivityIndicator color={colors.accent} />}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              )}
            </TouchableOpacity>
          </View>
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
    gap: 10,
  },
  email: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardText: {
    color: colors.text,
    fontSize: 15,
  },
  cardSubtext: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  signInButtons: {
    gap: 10,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  googleButton: {
    width: '100%',
    height: 48,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
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
