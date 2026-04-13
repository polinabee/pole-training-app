import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { runMigrations } from '../src/db/migrations';
import { seedTricks } from '../src/db/seed';
import { useTricksStore } from '../src/stores/tricksStore';
import { useSessionsStore } from '../src/stores/sessionsStore';
import { useVideosStore } from '../src/stores/videosStore';
import { useAuthStore } from '../src/stores/authStore';
import { colors } from '../src/constants/colors';

export default function RootLayout() {
  const [error, setError] = useState<string | null>(null);
  const loadTricks = useTricksStore((s) => s.load);
  const loadCommunityTricks = useTricksStore((s) => s.loadCommunityTricks);
  const loadSessions = useSessionsStore((s) => s.load);
  const loadVideos = useVideosStore((s) => s.load);
  const initializeAuth = useAuthStore((s) => s.initialize);


  useEffect(() => {
    // Local DB init always runs — offline-first
    try {
      runMigrations();
      seedTricks();
      loadTricks();
      loadSessions();
      loadVideos();
    } catch (e) {
      console.error('DB init error:', e);
      setError(String(e));
    } finally {
      // Belt-and-suspenders: hide splash manually in addition to Expo Router's
      // automatic hide (which fires when navigation state first changes).
      SplashScreen.hideAsync().catch(() => {});
    }

    // Auth + community tricks run in parallel — both gracefully handle offline
    initializeAuth();
    loadCommunityTricks();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: colors.error, fontSize: 14, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trick/[id]" options={{ title: '' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
        <Stack.Screen
          name="suggest-trick"
          options={({ navigation }) => ({
            title: 'Suggest a Trick',
            presentation: 'modal',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
                <Text style={{ color: colors.textMuted, fontSize: 22, lineHeight: 26 }}>×</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="submissions"
          options={({ navigation }) => ({
            title: 'Submissions',
            presentation: 'modal',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
                <Text style={{ color: colors.textMuted, fontSize: 22, lineHeight: 26 }}>×</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="settings"
          options={({ navigation }) => ({
            title: 'Settings',
            presentation: 'modal',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
                <Text style={{ color: colors.textMuted, fontSize: 22, lineHeight: 26 }}>×</Text>
              </TouchableOpacity>
            ),
          })}
        />
      </Stack>
    </>
  );
}
