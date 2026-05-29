export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds?: number;
}

export interface StoredAuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role?: string;
}

const TOKENS_KEY = 'codeforge_tokens';
const USER_KEY = 'codeforge_user';

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function getStoredAuthTokens(): StoredAuthTokens | null {
  return typeof window === 'undefined' ? null : readJSON<StoredAuthTokens>(TOKENS_KEY);
}

export function setStoredAuthTokens(tokens: StoredAuthTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function clearStoredAuthTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKENS_KEY);
}

export function getStoredAuthUser<T extends StoredAuthUser = StoredAuthUser>(): T | null {
  return typeof window === 'undefined' ? null : readJSON<T>(USER_KEY);
}

export function setStoredAuthUser(user: StoredAuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuthUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

export function clearStoredAuthSession(): void {
  clearStoredAuthTokens();
  clearStoredAuthUser();
}