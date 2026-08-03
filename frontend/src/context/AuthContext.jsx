import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

// Single consistent key names
const TOKEN_KEY = 'noren_token';
const USER_KEY  = 'noren_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });
  const [cartCount,     setCartCount]     = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [notifCount,    setNotifCount]    = useState(0);
  const [loading,       setLoading]       = useState(true);

  const fetchCart = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const res = await api.get('/cart');
      setCartCount(res.data.reduce((s, i) => s + i.quantity, 0));
    } catch { setCartCount(0); }
  }, []);

  const fetchWishlist = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const res = await api.get('/users/wishlist');
      setWishlistCount(res.data.length);
    } catch { setWishlistCount(0); }
  }, []);

  const fetchNotifCount = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const res = await api.get('/users/notifications/unread-count');
      setNotifCount(res.data.count || 0);
    } catch { setNotifCount(0); }
  }, []);

  // On mount — verify token with backend
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 8000);

    api.get('/auth/me')
      .then(res => {
        const u = { ...res.data, permissions: res.data.permissions || [] };
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        fetchCart();
        fetchWishlist();
        fetchNotifCount();
      })
      .catch(() => {
        // Token invalid — clear everything
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // also clear legacy keys
        localStorage.removeItem('src_token');
        localStorage.removeItem('src_user');
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, [fetchCart, fetchWishlist, fetchNotifCount]);

  // Poll notifications every 60s when logged in
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchNotifCount, 60000);
    return () => clearInterval(id);
  }, [user, fetchNotifCount]);

  const login = (token, userData) => {
    const u = { ...userData, permissions: userData.permissions || [] };
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    // clear any legacy keys from old brand
    localStorage.removeItem('src_token');
    localStorage.removeItem('src_user');
    setUser(u);
    fetchCart();
    fetchWishlist();
    fetchNotifCount();
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('src_token');
    localStorage.removeItem('src_user');
    setUser(null);
    setCartCount(0);
    setWishlistCount(0);
    setNotifCount(0);
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      cartCount,     fetchCart,
      wishlistCount, fetchWishlist,
      notifCount,    setNotifCount, fetchNotifCount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
