import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const queryClient = useQueryClient();

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    console.log('[Auth] fetchUser triggered. Token exists:', !!token);
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      setAuthInitialized(true);
      return null;
    }

    try {
      console.log('[Auth] Token found. Fetching current user details from /auth/me...');
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
      setProfile(data.data.profile);
      console.log('[Auth] User session restored successfully:', data.data.user.email);
      return data.data.user;
    } catch (err) {
      console.warn('[Auth] Failed to restore session. Removing stored tokens:', err.message || err);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
      setAuthInitialized(true);
      console.log('[Auth] Authentication initialization finished.');
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    console.log('[Auth] Initiating login for email:', email);
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    // 1. Store JWT
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    console.log('[Auth] Login successful. JWT stored in localStorage.');

    // 2. Update auth context (immediate basic user)
    setUser(data.data.user);
    console.log('[Auth] Auth context user updated.');

    // 3. Invalidate profile query in background
    console.log('[Auth] Invalidating all profile query caches...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile-prescriptions'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-records'] }),
      queryClient.invalidateQueries({ queryKey: ['calculator-history'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-health-metrics'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-predictions'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-anomalies'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-health-twin'] })
    ]).catch(err => console.error('[Auth] Error invalidating queries:', err));

    setLoading(true);
    try {
      console.log('[Auth] Fetching full profile for authenticated user...');
      const { data: me } = await api.get('/auth/me');
      setUser(me.data.user);
      setProfile(me.data.profile);
      console.log('[Auth] Full user profile successfully fetched.');
      return me.data.user;
    } catch (err) {
      console.warn('[Auth] Failed to load full profile after login:', err.message || err);
      return data.data.user;
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  };

  const register = async (formData) => {
    console.log('[Auth] Initiating registration for email:', formData.email);
    const payload = {
      ...formData,
      email: formData.email?.trim().toLowerCase(),
    };
    const { data } = await api.post('/auth/register', payload);

    // 1. Store JWT
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    console.log('[Auth] Registration successful. JWT stored in localStorage.');

    // 2. Update auth context
    setUser(data.data.user);
    console.log('[Auth] Auth context user updated.');

    // 3. Invalidate profile query
    console.log('[Auth] Invalidating profile query caches...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile-prescriptions'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-records'] }),
      queryClient.invalidateQueries({ queryKey: ['calculator-history'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-health-metrics'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-predictions'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-anomalies'] }),
      queryClient.invalidateQueries({ queryKey: ['ml-health-twin'] })
    ]).catch(err => console.error('[Auth] Error invalidating queries:', err));

    setLoading(true);
    try {
      console.log('[Auth] Fetching full profile for registered user...');
      const { data: me } = await api.get('/auth/me');
      setUser(me.data.user);
      setProfile(me.data.profile);
      console.log('[Auth] Full user profile successfully fetched.');
      return me.data.user;
    } catch (err) {
      console.warn('[Auth] Failed to load full profile after registration:', err.message || err);
      return data.data.user;
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  };

  const logout = async () => {
    console.log('[Auth] Initiating logout...');
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('[Auth] Logout API call failed:', err.message || err);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setProfile(null);
    setAuthInitialized(true);
    queryClient.clear();
    console.log('[Auth] Logged out successfully. Tokens and Query cache cleared.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authInitialized,
        login,
        register,
        logout,
        fetchUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
