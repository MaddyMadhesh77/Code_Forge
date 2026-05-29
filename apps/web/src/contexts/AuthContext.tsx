import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import {
  clearStoredAuthSession,
  getStoredAuthTokens,
  getStoredAuthUser,
  setStoredAuthTokens,
  setStoredAuthUser,
  type StoredAuthTokens,
} from '../services/authStorage';
import { login as loginRequest, register as registerRequest } from '../services/api';

/* ── Types ── */
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds?: number;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── Provider ── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedUser = getStoredAuthUser<User>();
    const storedTokens = getStoredAuthTokens();
    if (storedUser && storedTokens) {
      setState({
        user: storedUser,
        tokens: storedTokens as StoredAuthTokens,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    clearStoredAuthSession();
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const persistSession = useCallback((user: User, tokens: AuthTokens) => {
    setStoredAuthUser(user);
    setStoredAuthTokens(tokens);
    setState({ user, tokens, isAuthenticated: true, isLoading: false });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await loginRequest(email, password);
      const user = (data.user ?? data.userSummary) as User;
      persistSession(user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresInSeconds: data.expiresInSeconds ?? 3600,
      });
    },
    [persistSession],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const data = await registerRequest(email, password, displayName);
      const user = (data.user ?? data.userSummary) as User;
      persistSession(user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresInSeconds: data.expiresInSeconds ?? 3600,
      });
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    clearStoredAuthSession();
    setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
  }, []);

  const getAccessToken = useCallback(() => {
    return state.tokens?.accessToken ?? null;
  }, [state.tokens]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      getAccessToken,
    }),
    [state, login, register, logout, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
