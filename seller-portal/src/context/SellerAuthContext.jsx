import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const SellerAuthContext = createContext(null);

const TOKEN_KEY = 'seller_token';
const USER_KEY  = 'seller_user';

export function SellerAuthProvider({ children }) {
  const [user,    setUser]    = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/seller/profile');
      setProfile(res.data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    const t = setTimeout(() => setLoading(false), 8000);
    api.get('/auth/me')
      .then(res => {
        const u = res.data;
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        fetchProfile();
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => { clearTimeout(t); setLoading(false); });
    return () => clearTimeout(t);
  }, [fetchProfile]);

  const login = (token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    fetchProfile();
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = () => fetchProfile();

  return (
    <SellerAuthContext.Provider value={{ user, profile, loading, login, logout, refreshProfile }}>
      {children}
    </SellerAuthContext.Provider>
  );
}

export const useSellerAuth = () => useContext(SellerAuthContext);
