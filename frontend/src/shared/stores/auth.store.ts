import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

/**
 * Zustand auth store — source of truth for authentication state.
 *
 * Tokens are stored in both Zustand (for reactive UI)
 * and localStorage (for persistence across page reloads).
 * The Axios interceptor reads directly from localStorage
 * to avoid circular dependency with the store.
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initialize from localStorage so state survives page refresh
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));