import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { logError } from '@/lib/logger';
import { apiRequest } from '@/lib/queryClient';
import { hasAdminAccess } from '@shared/auth-utils';

interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  profilePicture?: string;
  bannerImage?: string;
  bio?: string;
  avatarAuraColor?: string;
  avatarBorderStyle?: string;
  role: 'owner' | 'admin' | 'user';
  isVerified: boolean;
  isAdminApproved?: boolean;
  walletBalance: string;
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | { requiresTwoFactor: boolean; userId: number; message: string }>;
  verify2FA: (userId: number, token: string, useBackupCode?: boolean) => Promise<User>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check authentication status with backend using httpOnly cookies
      const response = await apiRequest('/api/auth/me');
      setUser(response);
    } catch (error) {
      // Authentication failed - cookies are invalid or expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if user is authenticated on app start
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      // Check if 2FA is required
      if (response.requiresTwoFactor && response.userId) {
        return {
          requiresTwoFactor: true,
          userId: response.userId,
          message: response.message || 'Two-factor authentication required'
        };
      }

      // Server sets httpOnly cookie automatically, just update user state
      if (response.user) {
        setUser(response.user);
        return response.user; // Return user data for immediate use
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const verify2FA = async (userId: number, token: string, useBackupCode: boolean = false) => {
    try {
      const response = await apiRequest('/api/auth/login/2fa', {
        method: 'POST',
        body: { userId, token, useBackupCode }
      });

      if (response.user) {
        setUser(response.user);
        return response.user;
      } else {
        throw new Error('Invalid 2FA response');
      }
    } catch (error: any) {
      throw new Error(error.message || '2FA verification failed');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: userData
      });

      // Server sets httpOnly cookie automatically, just update user state
      if (response.user) {
        setUser(response.user);
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    // FIX BUG #7: Clear user state immediately to prevent stale state
    // Optimistic update - clear state before server call
    const previousUser = user;
    setUser(null);
    
    try {
      // Call logout endpoint to clear cookies on server
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // If server call fails, log but don't restore state
      // User should stay logged out locally even if server logout fails
      logError('Logout server call failed', error as Error);
      // Optional: Show toast to user about server logout failure
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    verify2FA,
    register,
    logout,
    checkAuth,
    updateUser
  };

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

// Hook untuk check apakah user adalah Guest
export function useIsGuest() {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated;
}

// Hook untuk check role user
export function useUserRole() {
  const { user } = useAuth();
  return user?.role || 'guest';
}

// Hook untuk check apakah user adalah Owner
export function useIsOwner() {
  const { user } = useAuth();
  return user?.role === 'owner';
}

// Hook untuk check apakah user adalah Admin atau Owner
// FIXED: Now uses shared helper function for consistency
export function useIsAdmin() {
  const { user } = useAuth();
  // Import will be added at top of file
  return hasAdminAccess(user);
}