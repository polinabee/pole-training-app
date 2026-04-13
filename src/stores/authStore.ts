import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  loading: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  initialize() {
    // If Supabase is not configured, skip auth — app works fully locally
    if (!isSupabaseConfigured || !supabase) {
      set({ user: null, loading: false });
      return;
    }

    // Restore session from SecureStore (works offline)
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, loading: false });
    }).catch(() => {
      // Offline or error — not loading, no user
      set({ user: null, loading: false });
    });

    // Listen for future auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, loading: false });
    });
  },

  async signInWithApple() {
    if (!supabase) throw new Error('Supabase not configured');
    set({ loading: true });
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
      });
      if (error) throw error;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  async signInWithGoogle() {
    if (!supabase) throw new Error('Supabase not configured');
    set({ loading: true });
    try {
      const redirectTo = makeRedirectUri({ scheme: 'pos-pole' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const url = result.url;
        const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? '',
          });
        }
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  async signOut() {
    if (!supabase) {
      set({ user: null, loading: false });
      return;
    }
    set({ loading: true });
    try {
      await supabase.auth.signOut();
    } finally {
      set({ user: null, loading: false });
    }
  },
}));
