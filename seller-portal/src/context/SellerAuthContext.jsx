import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const SellerAuthContext = createContext(null);

const TOKEN_KEY = 'seller_token';
const USER_KEY  = 'seller_user';

export function SellerAuthProvider({ children }) {
  const [user,    setUser]         = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } });
  const [profile, setProfile]      = useState(null);
  // profileLoading: true = fetch in progress, false = done (profile may be null if no seller account)
  const [profileLoading, setProfileLoading] = useState(false);
  // profileError: null = no error, 'loading' = in progress, 'error' = API error, 'none' = no profile yet
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading]      = useState(true); // auth loading

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError('loading');
    try {
      const res = await api.get('/seller/profile');
      setProfile(res.data);
      setProfileError(null);
    } catch (err) {
      // 404 = no seller account yet (not an error state, just no data)
      // Other errors = actual API/network error
      if (err.response?.status === 404) {
        setProfile(null);
        setProfileError('none');
      } else {
        console.error('Profile fetch error:', err.message, err.response?.data);
        setProfile(null);
        setProfileError('error');
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { 
      setLoading(false);
      return;
    }

    // Fetch auth user and profile on mount
    (async () => {
      try {
        const res = await api.get('/auth/me');
        const u = res.data;
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        // Fetch profile after successful auth
        await fetchProfile();
      } catch (err) {
        // Auth failed - token is invalid or expired
        console.error('Auth check failed:', err.message);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setProfile(null);
        setProfileError('error');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProfile]);

  const login = async (token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    // Fetch profile before returning so caller can redirect correctly
    await fetchProfile();
  };

  const logout = async () => {
    // Try to logout on server but don't fail if it doesn't work
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err.message);
    }
    
    // Always clear local state
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setProfile(null);
    setProfileError(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <SellerAuthContext.Provider value={{
      user, profile, loading, profileLoading, profileError,
      login, logout, refreshProfile
    }}>
      {children}
    </SellerAuthContext.Provider>
  );
}

export const useSellerAuth = () => useContext(SellerAuthContext);
