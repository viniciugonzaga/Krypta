import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest } from '../services/api';

export type UserPlan = 'free' | 'essential' | 'advanced' | 'max' | 'custom';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  status: 'ATIVA' | 'SUSPENSA' | 'REVOGADA' | 'PENDENTE_VERIFICACAO';
  role: 'user' | 'admin';
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithSocial: (provider: 'google' | 'github' | 'apple', token: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  changePlan: (tier: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'krypta_token';
const REFRESH_KEY = 'krypta_refresh';
const USER_KEY = 'krypta_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ user: User; token: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ user: User; token: string; refreshToken: string }>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
        auth: false,
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
    } finally {
      setLoading(false);
    }
  };

  const signInWithSocial = async (provider: 'google' | 'github' | 'apple', socialToken: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ user: User; token: string; refreshToken: string }>('/auth/social', {
        method: 'POST',
        body: { provider, token: socialToken },
        auth: false,
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY); // Limpa o cache do usuário
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const u = await apiRequest<User>('/users/me');
      setUser(u);
    } catch {
      signOut();
    }
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const changePlan = async (tier: string) => {
    try {
      const updatedUser = await apiRequest<User>('/plans/change', { 
        method: 'POST', 
        body: { tier } 
      });
      console.log('🟢 [FRONTEND] Usuário retornado pela API:', updatedUser);
      updateUser(updatedUser); 
    } catch (error) {
      console.error('🔴 [FRONTEND] Erro ao trocar plano:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, signIn, signUp, signInWithSocial, signOut, refreshUser, updateUser, changePlan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}