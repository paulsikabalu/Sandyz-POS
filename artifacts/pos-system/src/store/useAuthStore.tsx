import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

const API_BASE = 'http://localhost:3000/api';

export type UserRole = 'admin' | 'cashier' | 'manager';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: number;
  updatedAt?: number;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

// Token storage
const TOKEN_KEY = 'sandyz_pos_token';
const USER_KEY = 'sandyz_pos_user';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getStoredUser(),
    token: getStoredToken(),
    isLoading: false,
    isAuthenticated: !!getStoredToken(),
  });

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true }));

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Login failed');
      }

      const data = await res.json() as { token: string; user: AuthUser };
      setStoredToken(data.token);
      setStoredUser(data.user);
      setState({
        user: data.user,
        token: data.token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState(s => ({ ...s, isLoading: false }));
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role?: string) => {
    setState(s => ({ ...s, isLoading: true }));

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Registration failed');
      }

      const data = await res.json() as { token: string; user: AuthUser };
      setStoredToken(data.token);
      setStoredUser(data.user);
      setState({
        user: data.user,
        token: data.token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState(s => ({ ...s, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }

    setStoredToken(null);
    setStoredUser(null);
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Token expired or invalid
        setStoredToken(null);
        setStoredUser(null);
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
        return;
      }

      const data = await res.json() as { user: AuthUser };
      setStoredUser(data.user);
      setState(s => ({ ...s, user: data.user, isAuthenticated: true }));
    } catch {
      // Network error - keep current state
    }
  }, []);

  // On mount, validate stored token
  useEffect(() => {
    if (state.token && state.user) {
      refreshUser();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

/**
 * Check if the current user has one of the required roles.
 */
export function hasRole(user: AuthUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

