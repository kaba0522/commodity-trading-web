import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setOnAuthExpired } from '../services/api';
import type { SessionUser } from '../services/authService';
import { authService } from '../services/authService';
import { tosApi, type TosStatus } from '../services/backend';

interface AuthContextValue {
  user: SessionUser | null;
  /** Backend roles of the session (demo sessions: ['admin']). */
  roles: string[];
  isAdmin: boolean;
  isLive: boolean;
  /** True after the API client detects an expired/invalid session. */
  sessionExpired: boolean;
  requestOtp: (phone: string) => Promise<{ demoCode: string | null }>;
  verifyOtp: (phone: string, code: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  tosStatus: TosStatus | null;
  refreshTos: () => Promise<void>;
  acceptTos: (version: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => authService.getSessionUser());
  const [tosStatus, setTosStatus] = useState<TosStatus | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const isLive = !authService.isDemoMode();

  const refreshTos = useCallback(async () => {
    if (authService.isDemoMode()) {
      setTosStatus(null);
      return;
    }
    try {
      setTosStatus(await tosApi.status());
    } catch {
      setTosStatus(null);
    }
  }, []);

  // A dead refresh token clears the session inside api.ts — mirror it here.
  useEffect(() => {
    setOnAuthExpired(() => {
      setUser(null);
      setTosStatus(null);
      setSessionExpired(true);
    });
    return () => setOnAuthExpired(null);
  }, []);

  // Existing session (page reload): pull the ToS gate state in live mode.
  useEffect(() => {
    if (user && isLive) void refreshTos();
  }, [user, isLive, refreshTos]);

  const requestOtp = useCallback((phone: string) => authService.requestOtp(phone), []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const u = await authService.verifyOtp(phone, code);
    setUser(u);
    setSessionExpired(false);
    if (!authService.isDemoMode()) await refreshTos();
    return u;
  }, [refreshTos]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setTosStatus(null);
    setSessionExpired(false);
  }, []);

  const acceptTos = useCallback(async (version: number) => {
    const next = await tosApi.accept(version);
    setTosStatus(next);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    roles: user?.roles ?? [],
    isAdmin: user ? user.roles.includes('admin') : false,
    isLive,
    sessionExpired,
    requestOtp,
    verifyOtp,
    logout,
    tosStatus,
    refreshTos,
    acceptTos,
  }), [user, isLive, sessionExpired, requestOtp, verifyOtp, logout, tosStatus, refreshTos, acceptTos]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
