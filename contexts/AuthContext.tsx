import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { authApi, setUnauthorizedHandler } from '../services/api';
import type { User } from '../types';
import {
  clearAppDataCaches,
  clearAuthStorage,
  clearLegacyBasicAuth,
  getAccessToken,
  getRefreshToken,
  hasAuthTokens,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
  setTokens,
} from '../utils/authStorage';
import { mapBackendUserToUser } from '../utils/mapBackendUser';
import { unwrapUserProfile } from '../utils/unwrapProfile';
import { normalizeLoginCredentials } from '../utils/loginCredentials';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/apiConfig';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchAccessTokenWithRefresh(refresh: string): Promise<string> {
  const response = await axios.post(
    `${getApiBaseUrl('main')}${API_ENDPOINTS.AUTH.REFRESH}`,
    { refresh },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const access = response.data?.access as string | undefined;
  if (!access) {
    throw new Error('Refresh response did not include an access token.');
  }
  setAccessToken(access);
  if (response.data?.refresh) {
    setRefreshToken(response.data.refresh);
  }
  return access;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initStarted = React.useRef(false);

  const applyUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      setStoredUser(nextUser);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<User | null> => {
    const refresh = getRefreshToken();
    if (!refresh && !getAccessToken()) {
      return null;
    }

    if (!getAccessToken() && refresh) {
      await fetchAccessTokenWithRefresh(refresh);
    }

    const response = await authApi.getUserProfile();
    const mappedUser = mapBackendUserToUser(unwrapUserProfile(response.data));
    applyUser(mappedUser);
    return mappedUser;
  }, [applyUser]);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await authApi.logout(refresh);
      }
    } catch (error) {
      console.warn('Logout request failed; clearing local session anyway.', error);
    } finally {
      clearAuthStorage();
      setUser(null);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<User> => {
      const credentials = normalizeLoginCredentials(username, password);
      const response = await authApi.login(credentials);
      const { access, refresh } = response.data ?? {};

      if (!access || !refresh) {
        throw new Error('Login response did not include access and refresh tokens.');
      }

      // Fresh session — drop stale portfolio / 360 / dates caches from prior login
      clearAppDataCaches();
      setTokens(access, refresh);

      const profile = await authApi.getUserProfile();
      const mappedUser = mapBackendUserToUser(unwrapUserProfile(profile.data));
      applyUser(mappedUser);
      return mappedUser;
    },
    [applyUser]
  );

  useEffect(() => {
    clearLegacyBasicAuth();

    if (initStarted.current) return;
    initStarted.current = true;

    const initializeAuth = async () => {
      if (!hasAuthTokens()) {
        clearAuthStorage();
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        await refreshSession();
      } catch (error) {
        console.error('Session restore failed:', error);
        clearAuthStorage();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [refreshSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthStorage();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      refreshSession,
    }),
    [user, loading, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
