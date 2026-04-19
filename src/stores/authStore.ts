import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Only update store when user identity actually changes (not on every token refresh)
function userChanged(prev: User | null, next: User | null): boolean {
  return prev?.id !== next?.id;
}

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
      set((s) => userChanged(s.user, session?.user ?? null) ? { user: session?.user ?? null } : s);
    }).catch(() => {
      set({ user: null });
    });

    // Only update on sign-in/sign-out events, not token refreshes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        set((s) => userChanged(s.user, session?.user ?? null) ? { user: session?.user ?? null } : s);
      }
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
