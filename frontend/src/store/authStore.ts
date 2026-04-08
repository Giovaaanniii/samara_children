import { create } from "zustand";

import { authApi } from "../services/authApi";
import type { User, UserCreate } from "../types";

/** Ключ access token в localStorage */
export const ACCESS_TOKEN_KEY = "samara_access_token";

function readTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function writeTokenToStorage(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: UserCreate) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

/** Пока токен в storage не проверен через /me — не считаем сессию «пустой» (избегаем ложного редиректа на /login). */
const initialToken = readTokenFromStorage();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: initialToken,
  isLoading: Boolean(initialToken),

  login: async (login, password) => {
    set({ isLoading: true });
    try {
      const { data: tokens } = await authApi.login({ login, password });
      writeTokenToStorage(tokens.access_token);
      set({ token: tokens.access_token });
      const { data: me } = await authApi.me();
      set({ user: me });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      await authApi.register(data);
      const { data: tokens } = await authApi.login({
        login: data.login,
        password: data.password,
      });
      writeTokenToStorage(tokens.access_token);
      set({ token: tokens.access_token });
      const { data: me } = await authApi.me();
      set({ user: me });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    writeTokenToStorage(null);
    set({ user: null, token: null });
  },

  setUser: (user) => set({ user }),

  checkAuth: async () => {
    const stored = readTokenFromStorage();
    if (!stored) {
      set({ user: null, token: null, isLoading: false });
      return;
    }
    set({ token: stored, isLoading: true });
    try {
      const { data: me } = await authApi.me();
      set({ user: me });
    } catch {
      get().logout();
    } finally {
      set({ isLoading: false });
    }
  },
}));
