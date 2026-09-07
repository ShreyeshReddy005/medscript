import React, { createContext, useState, useContext, useEffect } from 'react';
import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

export const db = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  serverUrl: import.meta.env.VITE_BASE44_BACKEND_URL?.replace(/\/api$/, ''),
  appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
  token: appParams.token || localStorage.getItem('token') || localStorage.getItem('base44_access_token'),
  headers: {
    "api_key": import.meta.env.VITE_BASE44_API_KEY
  }
});
globalThis.__B44_DB__ = db;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(false);
      setAuthError(null);
      
      const token = appParams.token || localStorage.getItem('token') || localStorage.getItem('base44_access_token');
      if (token) {
        db.setToken(token); // ensure the client has the token
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    } catch (error) {
      console.error('Unexpected error in checkAppState:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      console.log('Verifying token with db.auth.me()...');
      const user = await db.auth.me();
      console.log('Token verified! User:', user.id);
      setUser(user);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('Auth verification failed. Token is invalid or expired:', error);
      if (error?.status === 401 || error?.status === 403 || error.message?.includes('Unauthorized')) {
        setAuthError({ type: 'auth_required' });
      } else {
        setAuthError({ type: 'auth_required' }); // fallback to auth_required
      }
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      db.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      db.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
