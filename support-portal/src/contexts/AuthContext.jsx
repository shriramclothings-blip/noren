import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../api/auth';

const AuthContext = createContext(null);

// Roles that are allowed to access this support portal
const ALLOWED_ROLES = ['admin', 'super_admin', 'business_owner', 'store_admin'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('sp_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await getMe();
      const u = res.data.user || res.data;
      if (!ALLOWED_ROLES.includes(u.role)) {
        localStorage.removeItem('sp_token');
        localStorage.removeItem('sp_user');
        setError('Access denied. This portal is for internal staff only.');
        setLoading(false);
        return;
      }
      setUser(u);
    } catch {
      localStorage.removeItem('sp_token');
      localStorage.removeItem('sp_user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const signIn = useCallback((token, userData) => {
    localStorage.setItem('sp_token', token);
    localStorage.setItem('sp_user', JSON.stringify(userData));
    setUser(userData);
    setError(null);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    setUser(null);
  }, []);

  const can = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    return user.permissions?.includes(permission) ?? false;
  }, [user]);

  const isAtLeast = useCallback((role) => {
    if (!user) return false;
    const levels = { user: 0, employee: 1, store_manager: 2, store_admin: 3, business_owner: 4, admin: 5, super_admin: 6 };
    return (levels[user.role] ?? 0) >= (levels[role] ?? 0);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, can, isAtLeast }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
