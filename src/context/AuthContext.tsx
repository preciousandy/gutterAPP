import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isApiError, setAuthToken, setOnUnauthorized } from '@/api/client';
import * as authApi from '@/api/auth';
import {
  clearStoredToken,
  getStoredToken,
  storeToken,
  getStoredUser,
  storeUser,
  clearStoredUser,
} from '@/api/token';
import type { AuthResponse, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  /** True while the stored session is being restored on app launch. */
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  signIn: (login_id: string, password: string) => Promise<AuthResponse>;
  signInWithToken: (token: string) => Promise<void>;
  signUp: (payload: authApi.RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const clearSession = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    void clearStoredToken();
    void clearStoredUser();
  }, []);

  // Restore the session from secure storage on launch.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [token, cachedUser] = await Promise.all([getStoredToken(), getStoredUser()]);
        if (!token) {
          if (!cancelled) setIsBootstrapping(false);
          return;
        }

        setAuthToken(token);
        // Instant render from cache so the user doesn't wait
        if (cachedUser && !cancelled) {
          setUser(cachedUser);
        }

        // Validate token in background
        try {
          const currentUser = await authApi.me();
          if (!cancelled) {
            setUser(currentUser);
            setIsOffline(false);
            void storeUser(currentUser);
          }
        } catch (netErr) {
          if (isApiError(netErr) && netErr.status === 401) {
            // Token was revoked or expired on server -> drop session
            if (!cancelled) clearSession();
          } else {
            // Network failure or timeout -> keep user logged in with cached data
            if (!cancelled) {
              setIsOffline(true);
              if (!cachedUser) {
                // Synthesize minimal user so they remain authenticated
                setUser({
                  id: 0,
                  first_name: 'Account',
                  last_name: 'Holder',
                  email: '',
                  phone: '',
                });
              }
            }
          }
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Any 401 from the API drops the session.
  useEffect(() => {
    setOnUnauthorized(clearSession);
    return () => setOnUnauthorized(null);
  }, [clearSession]);

  const signIn = useCallback(async (login_id: string, password: string): Promise<AuthResponse> => {
    const authData = await authApi.login(login_id, password);
    setAuthToken(authData.token);
    await storeToken(authData.token);
    setUser(authData.user);
    void storeUser(authData.user);
    setIsOffline(false);
    return authData;
  }, []);

  const signInWithToken = useCallback(async (token: string): Promise<void> => {
    setAuthToken(token);
    const authedUser = await authApi.me();
    await storeToken(token);
    setUser(authedUser);
    void storeUser(authedUser);
    setIsOffline(false);
  }, []);

  const signUp = useCallback(async (payload: authApi.RegisterPayload) => {
    const { token, user: authedUser } = await authApi.register(payload);
    setAuthToken(token);
    await storeToken(token);
    setUser(authedUser);
    void storeUser(authedUser);
    setIsOffline(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Revoking the token server-side is best-effort; always clear locally.
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authApi.me();
      setUser(u);
      void storeUser(u);
      setIsOffline(false);
    } catch (e) {
      if (isApiError(e) && e.status === 401) {
        clearSession();
      } else {
        setIsOffline(true);
      }
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: user !== null,
      isOffline,
      signIn,
      signInWithToken,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, isBootstrapping, isOffline, signIn, signInWithToken, signUp, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
