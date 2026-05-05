import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { getStoredToken, setStoredToken } from "../lib/storage";
import type { User, UserCreate } from "../types/api";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: UserCreate) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.me();
    setUser(data);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredToken();
      if (!stored) {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }
      setToken(stored);
      setIsLoading(true);
      try {
        const { data } = await authApi.me();
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          await setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (loginStr: string, password: string) => {
    setIsLoading(true);
    try {
      const { data: tokens } = await authApi.login({
        login: loginStr,
        password,
      });
      await setStoredToken(tokens.access_token);
      setToken(tokens.access_token);
      const { data: me } = await authApi.me();
      setUser(me);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: UserCreate) => {
    setIsLoading(true);
    try {
      await authApi.register(data);
      const { data: tokens } = await authApi.login({
        login: data.login,
        password: data.password,
      });
      await setStoredToken(tokens.access_token);
      setToken(tokens.access_token);
      const { data: me } = await authApi.me();
      setUser(me);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setUserCb = useCallback((u: User) => {
    setUser(u);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      setUser: setUserCb,
    }),
    [user, token, isLoading, login, register, logout, refreshUser, setUserCb],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}
