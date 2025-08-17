import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { apiClient, User, LoginData, RegisterData } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!user;

  // Debug logging for state changes
  useEffect(() => {
    console.log('AuthContext state change:', { user: user?.email, isAuthenticated, loading });
  }, [user, isAuthenticated, loading]);

  // Check if user is authenticated on app start
  useEffect(() => {
    // Initialize authentication on app start
    const initAuth = async () => {
      try {
        console.log('AuthContext: Initializing authentication...');
        await checkAuthStatus();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setLoading(false);
      }
    };
    
    initAuth();
    
    // Handle storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'refreshToken') {
        console.log('Token changed in another tab, rechecking auth...');
        checkAuthStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up refresh timer and event listener on unmount
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Setup automatic token refresh
  const setupTokenRefresh = (expiresIn?: number) => {
    // Clear existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    // If no expiration provided, try to get it from stored token
    if (!expiresIn) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          expiresIn = payload.exp - currentTime;
        } catch (error) {
          console.error('Error parsing token:', error);
          return;
        }
      } else {
        return;
      }
    }

    // Set refresh timer for 5 minutes before expiration for better reliability
    const refreshTime = Math.max((expiresIn - 300) * 1000, 30000); // Refresh 5 minutes before expiry, minimum 30 seconds
    
    const timer = setTimeout(async () => {
      console.log('Auto-refreshing token...');
      try {
        await tryRefreshToken();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        // If refresh fails, logout user
        await logout();
      }
    }, refreshTime);

    setRefreshTimer(timer);
  };

  const checkAuthStatus = async () => {
    try {
      // Prioritize cookies over localStorage for better persistence
      const token = Cookies.get('accessToken') || localStorage.getItem('accessToken');
      const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
      
      console.log('Checking auth status, token present:', !!token, 'refresh token present:', !!refreshToken);
      
      // If we have tokens in localStorage but not in cookies, restore to cookies
      if (token && !Cookies.get('accessToken')) {
        Cookies.set('accessToken', token, { 
          expires: 30, 
          secure: window.location.protocol === 'https:', 
          sameSite: 'strict' 
        });
      }
      if (refreshToken && !Cookies.get('refreshToken')) {
        Cookies.set('refreshToken', refreshToken, { 
          expires: 30, 
          secure: window.location.protocol === 'https:', 
          sameSite: 'strict' 
        });
      }
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp <= currentTime) {
          // Token expired, try refresh
          if (refreshToken) {
            await tryRefreshToken();
          } else {
            // No refresh token, clear everything
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            setLoading(false);
            return;
          }
        } else {
          // Token still valid, set it in API client
          apiClient.setToken(token);
          const response = await apiClient.getCurrentUser();

          if (response.success && response.data) {
            // Backend returns { user: userObject }, so extract the user
            const userData = response.data.user || response.data;
            setUser(userData);
            console.log('User authenticated successfully:', userData.firstName, userData.lastName);
            console.log('User data:', userData);
            // Setup auto-refresh for remaining time
            setupTokenRefresh(payload.exp - currentTime);
          } else {
            console.log('getCurrentUser failed, trying to refresh token...');
            // Token might be invalid, try to refresh
            if (refreshToken) {
              await tryRefreshToken();
            } else {
              console.log('No refresh token available, clearing auth state');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              Cookies.remove('accessToken');
              Cookies.remove('refreshToken');
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing token:', error);
        // If token is malformed, try to refresh or clear
        if (refreshToken) {
          await tryRefreshToken();
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const tryRefreshToken = async () => {
    try {
      const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.refreshToken();
      
      if (response.success && response.data) {
        // Store new access token (refresh token stays the same)
        localStorage.setItem('accessToken', response.data.accessToken);
        Cookies.set('accessToken', response.data.accessToken, { 
          expires: 30, // 30 days
          secure: window.location.protocol === 'https:', 
          sameSite: 'strict' 
        });
        
        // Update API client
        apiClient.setToken(response.data.accessToken);
        
        // Get user data with new token
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          // Backend returns { user: userObject }, so extract the user
          const userData = userResponse.data.user || userResponse.data;
          setUser(userData);
          console.log('Token refresh successful, user authenticated');
          // Setup auto-refresh for new token
          setupTokenRefresh(response.data.expiresIn);
          return true;
        }
      }
      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      apiClient.setToken(null);
      setUser(null);
      
      // Clear refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }
      return false;
    }
  };

  const login = async (credentials: LoginData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await apiClient.login(credentials);
      console.log('Login API response:', response);

      if (response.success && response.data) {
        console.log('Login response data:', response.data);
        const { user, accessToken, refreshToken, expiresIn } = response.data;
        
        // Store tokens in both cookies and localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        
        // Store in cookies for better persistence (30 days)
        Cookies.set('accessToken', accessToken, { 
          expires: 30, // 30 days
          secure: window.location.protocol === 'https:', 
          sameSite: 'strict' 
        });
        Cookies.set('refreshToken', refreshToken, { 
          expires: 30, // 30 days
          secure: window.location.protocol === 'https:', 
          sameSite: 'strict' 
        });
        
        // Update API client
        apiClient.setToken(accessToken);
        
        // Set user state
        setUser(user);
        
        // Setup automatic token refresh
        setupTokenRefresh(expiresIn);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error || 'Login failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const response = await apiClient.register(userData);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken, expiresIn } = response.data;
        
        // Store tokens in both cookies and localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        
        // Store in cookies for better persistence (30 days)
        Cookies.set('accessToken', accessToken, { 
          expires: 30, // 30 days
          secure: window.location.protocol === 'https:', 
          sameSite: 'strict' 
        });
        Cookies.set('refreshToken', refreshToken, { 
          expires: 30, // 30 days
          secure: window.location.protocol === 'https:', 
          sameSite: 'strict' 
        });
        
        // Update API client
        apiClient.setToken(accessToken);
        
        // Set user state
        setUser(user);
        
        // Setup automatic token refresh
        setupTokenRefresh(expiresIn);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error || 'Registration failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Try to logout from server (best effort)
      try {
        await apiClient.logout();
      } catch (error) {
        console.error('Server logout error:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state and tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenTimestamp');
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      apiClient.setToken(null);
      setUser(null);
      
      // Clear refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }
      
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    await checkAuthStatus();
  };

  // Monitor localStorage changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'refreshToken') {
        if (!e.newValue) {
          // Tokens were cleared in another tab
          setUser(null);
          apiClient.setToken(null);
          if (refreshTimer) {
            clearTimeout(refreshTimer);
            setRefreshTimer(null);
          }
        } else if (e.key === 'accessToken' && e.newValue) {
          // Token was updated in another tab
          apiClient.setToken(e.newValue);
          checkAuthStatus();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshTimer]);

  const value: AuthContextType = useMemo(() => ({
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshAuth,
  }), [user, loading, isAuthenticated, login, register, logout, refreshAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login or show unauthorized message
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please log in to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Role-based access control HOC
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: Array<'ADMIN' | 'STUDENT'>
) {
  return function RoleProtectedComponent(props: P) {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated || !user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please log in to access this page.
            </p>
          </div>
        </div>
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}