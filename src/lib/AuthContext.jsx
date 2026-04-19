import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from './base44-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        await base44.auth.me();
        setIsLoadingAuth(false);
      } catch (error) {
        const status = error?.response?.status;
        if (status === 403) {
          setAuthError({ type: 'user_not_registered' });
        } else {
          setAuthError({ type: 'auth_required' });
        }
        setIsLoadingAuth(false);
      }
    }
    checkAuth();
  }, []);

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
