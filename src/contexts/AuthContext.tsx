// src/contexts/AuthContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, AUTH_EVENTS, STORAGE_KEYS } from '../services/api';
import { normalizePlan } from '../utils/plan';
import { SessaoCofre } from '../services/cofreRemoto';

// Agora só existem dois planos
export type UserPlan = 'free' | 'pro';

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
  // ---- Cofre / dispositivo Krypta (vem do serializeUser do servidor) ----
  estadoCofre?: 'PENDENTE_PAREAMENTO' | 'ATIVA' | 'REVOGADA' | 'RECUPERACAO_LOCAL' | 'RECUPERACAO_HARDWARE';
  dispositivoPareado?: boolean;
  hardwareUuid?: string | null;
  herancaAtiva?: boolean;
  ultimoSincronismo?: string | null;
  tipoDispositivo?: 'SOFTWARE' | 'FISICO' | null;
  /** Já respondeu (ou pulou) o questionário de boas-vindas */
  onboardingConcluido?: boolean;
  /** Plano que o servidor recomendou no questionário */
  recomendacao?: 'free' | 'pro' | null;
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
  /** Cancela o Krypta Pro (confirma com a senha do site) */
  cancelPlan: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthResponse = { user: User; token: string; refreshToken: string };

/** Garante que o plano salvo (inclusive os antigos) vire 'free' ou 'pro' */
function normalizeUser<T extends Partial<User> | null | undefined>(u: T): T {
  if (!u) return u;
  return { ...u, plan: normalizePlan(u.plan as string | undefined) } as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? normalizeUser(JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.token));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.user);
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
    else localStorage.removeItem(STORAGE_KEYS.token);
  }, [token]);

  // ------------------------------------------------------------
  // Sincroniza com a renovação automática feita pelo api.ts
  // ------------------------------------------------------------
  useEffect(() => {
    const onRefreshed = (e: Event) => {
      const detail = (e as CustomEvent<{ token: string; user?: User }>).detail;
      if (detail?.token) setToken(detail.token);
      if (detail?.user) setUser(normalizeUser(detail.user));
    };
    const onExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener(AUTH_EVENTS.tokenRefreshed, onRefreshed);
    window.addEventListener(AUTH_EVENTS.sessionExpired, onExpired);
    return () => {
      window.removeEventListener(AUTH_EVENTS.tokenRefreshed, onRefreshed);
      window.removeEventListener(AUTH_EVENTS.sessionExpired, onExpired);
    };
  }, []);

  const applySession = (data: AuthResponse) => {
    localStorage.setItem(STORAGE_KEYS.refresh, data.refreshToken);
    setToken(data.token);
    setUser(normalizeUser(data.user));
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      applySession(data);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
        auth: false,
      });
      applySession(data);
    } finally {
      setLoading(false);
    }
  };

  const signInWithSocial = async (provider: 'google' | 'github' | 'apple', socialToken: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<AuthResponse>('/auth/social', {
        method: 'POST',
        body: { provider, token: socialToken },
        auth: false,
      });
      applySession(data);
    } finally {
      setLoading(false);
    }
  };

  const signOut = useCallback(() => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refresh);
    if (refreshToken) {
      apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEYS.refresh);
    localStorage.removeItem(STORAGE_KEYS.user);
    // v1.2.0: sair da conta fecha o cofre aberto com a senha de acesso (apaga a chave da memória)
    SessaoCofre.fechar();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(STORAGE_KEYS.token) && !localStorage.getItem(STORAGE_KEYS.refresh)) return;
    try {
      const u = await apiRequest<User>('/users/me');
      setUser(normalizeUser(u));
    } catch (err) {
      // Só desloga se o servidor recusou a conta/sessão — não por queda de rede
      const code = (err as { code?: number }).code;
      if (code === 401 || code === 404 || code === 410 || code === 423) signOut();
    }
  }, [signOut]);

  // Ao abrir o site, busca o usuário atualizado (plano, status...) no servidor.
  // Se o token tiver vencido, o api.ts renova sozinho antes.
  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => (prev ? normalizeUser({ ...prev, ...patch }) : prev));
  };

  const cancelPlan = async (password: string) => {
    const updatedUser = await apiRequest<User>('/plans/cancel', {
      method: 'POST',
      body: { password },
    });
    setUser(normalizeUser(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, signIn, signUp, signInWithSocial, signOut, refreshUser, updateUser, cancelPlan }}
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