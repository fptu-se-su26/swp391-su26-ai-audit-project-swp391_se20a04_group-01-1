import { create } from 'zustand';
import { getUser, saveUser, saveToken, removeToken, removeUser } from '../utils/tokenManager';
import { usePreferenceStore } from './preferenceStore';

interface User {
  id: string;
  email: string;
  role: string;
  avatar_url?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => {
    if (user) {
      saveUser(user);
    }
    set({ user });
  },

  setToken: (token) => {
    if (token) {
      saveToken(token);
    } else {
      removeToken();
    }
    set({ token, isAuthenticated: !!token });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  login: (user, token) => {
    saveUser(user);
    saveToken(token);
    set({
      user,
      token,
      isAuthenticated: true,
      error: null
    });
  },

  logout: () => {
    removeUser();
    removeToken();
    usePreferenceStore.getState().resetPreferences();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  initializeAuth: () => {
    const user = getUser();
    const token = localStorage.getItem('token');

    if (user && token) {
      set({
        user,
        token,
        isAuthenticated: true
      });
    }
  }
}));