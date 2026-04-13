import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';

function PoleIcon() {
  return (
    <View style={poleStyles.container}>
      {/* Pole shaft */}
      <View style={poleStyles.shaft} />
      {/* Dancer silhouette — a simplified abstract shape */}
      <View style={poleStyles.body} />
      <View style={poleStyles.legLeft} />
      <View style={poleStyles.legRight} />
    </View>
  );
}

const poleStyles = StyleSheet.create({
  container: {
    width: 80,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shaft: {
    position: 'absolute',
    width: 6,
    height: 120,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  body: {
    position: 'absolute',
    top: 20,
    left: 24,
    width: 28,
    height: 40,
    backgroundColor: colors.accent,
    borderRadius: 14,
    opacity: 0.9,
  },
  legLeft: {
    position: 'absolute',
    top: 56,
    left: 14,
    width: 16,
    height: 32,
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    transform: [{ rotate: '-20deg' }],
  },
  legRight: {
    position: 'absolute',
    top: 60,
    left: 36,
    width: 14,
    height: 28,
    backgroundColor: colors.accentDim,
    borderRadius: 7,
    transform: [{ rotate: '30deg' }],
  },
});

export default function AuthScreen() {
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <PoleIcon />
        <Text style={styles.appName}>pos·pole</Text>
        <Text style={styles.tagline}>Your personal pole training tracker</Text>
      </View>

      <View style={styles.buttons}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
        {appleLoading && (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        )}

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

      <Text style={styles.disclaimer}>
        Signing in lets you suggest tricks to the community library.
        Your training data stays on your device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
    flex: 1,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: 14,
    alignItems: 'center',
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  loader: {
    marginTop: -6,
  },
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
