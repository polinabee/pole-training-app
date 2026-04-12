import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { runMigrations } from '../src/db/migrations';
import { seedTricks } from '../src/db/seed';
import { useTricksStore } from '../src/stores/tricksStore';
import { useSessionsStore } from '../src/stores/sessionsStore';
import { useVideosStore } from '../src/stores/videosStore';
import { colors } from '../src/constants/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadTricks = useTricksStore((s) => s.load);
  const loadSessions = useSessionsStore((s) => s.load);
  const loadVideos = useVideosStore((s) => s.load);

  useEffect(() => {
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
      setReady(true);
      SplashScreen.hideAsync();
    }
  }, []);

  if (!ready) return null;

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
      </Stack>
    </>
  );
}
