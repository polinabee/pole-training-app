import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  setUser(user) {
    set({ user });
  },

  initialize() {
    if (!isSupabaseConfigured || !supabase) return;

    // Restore session from SecureStore (works offline)
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null });
    }).catch(() => {
      set({ user: null });
    });

    // Keep session in sync (handles magic link deep link callback)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
    });
  },

  async signOut() {
    if (!supabase) {
      set({ user: null });
      return;
    }
    try {
      await supabase.auth.signOut();
    } finally {
      set({ user: null });
    }
  },
}));
