// src/services/api.ts
// Endereço da API. Em desenvolvimento usa o localhost; em produção vem do
// .env do front:  VITE_API_URL=https://api.seudominio.com.br/api
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3333/api';

// Chaves do localStorage (as mesmas do AuthContext)
export const STORAGE_KEYS = {
  token: 'krypta_token',
  refresh: 'krypta_refresh',
  user: 'krypta_user',
} as const;

// Eventos que o AuthContext escuta para manter o estado em dia
export const AUTH_EVENTS = {
  tokenRefreshed: 'krypta:token-refreshed',
  sessionExpired: 'krypta:session-expired',
} as const;

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  auth?: boolean;
}

type ApiError = Error & { details?: any; code?: number };

// ============================================================
// RENOVAÇÃO AUTOMÁTICA DO TOKEN
// O access token (JWT) dura 24h; o refresh token dura 7 dias.
// Quando o access token vence, renovamos sozinhos com o refresh token
// e repetimos a requisição — o usuário nem percebe.
// ============================================================

/** Lê o "exp" do JWT sem validar a assinatura (só para saber se está vencendo) */
function getTokenExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(token: string, marginMs = 30_000): boolean {
  const exp = getTokenExp(token);
  return exp !== null && exp - Date.now() < marginMs;
}

/** Limpa tudo e avisa o AuthContext que a sessão acabou */
function expireSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
  window.dispatchEvent(new CustomEvent(AUTH_EVENTS.sessionExpired));
}

// Várias requisições podem vencer ao mesmo tempo: só UMA renovação roda,
// as outras esperam a mesma promessa.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Renova o access token.
 * Retorna o novo token, ou null se o refresh token for inválido/expirado.
 * Erro de rede é relançado (não desloga o usuário só porque o servidor caiu).
 */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refresh);
    if (!refreshToken) return null;

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false || !data.data?.token) return null;

    const { token, refreshToken: newRefresh, user } = data.data;
    localStorage.setItem(STORAGE_KEYS.token, token);
    if (newRefresh) localStorage.setItem(STORAGE_KEYS.refresh, newRefresh);

    window.dispatchEvent(
      new CustomEvent(AUTH_EVENTS.tokenRefreshed, { detail: { token, user } })
    );
    return token as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/** 401 por causa do token (e não, por ex., "senha atual incorreta") */
function isTokenError(status: number, data: any): boolean {
  if (status !== 401) return false;
  const msg = String(data?.error ?? data?.message ?? '');
  return /token/i.test(msg);
}

async function doFetch(path: string, method: string, body: any, auth: boolean) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function apiRequest<T = any>(
  path: string,
  { method = 'GET', body, auth = true }: ApiOptions = {}
): Promise<T> {
  // 1) Renovação preventiva: se o token já venceu (ou vence em 30s), renova antes
  if (auth) {
    const current = localStorage.getItem(STORAGE_KEYS.token);
    const hasRefresh = !!localStorage.getItem(STORAGE_KEYS.refresh);
    if (hasRefresh && (!current || isExpiringSoon(current))) {
      try {
        const renewed = await refreshAccessToken();
        if (!renewed) {
          expireSession();
          throw sessionExpiredError();
        }
      } catch (err) {
        if ((err as ApiError).code === 401) throw err;
        // erro de rede: segue e deixa a requisição normal falhar/funcionar
      }
    }
  }

  let { res, data } = await doFetch(path, method, body, auth);

  // 2) Renovação reativa: o servidor recusou o token → renova e repete 1x
  if (auth && isTokenError(res.status, data) && localStorage.getItem(STORAGE_KEYS.refresh)) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      ({ res, data } = await doFetch(path, method, body, auth));
    } else {
      expireSession();
      throw sessionExpiredError();
    }
  }

  if (!res.ok || data.success === false) {
    const message = data?.error || data?.message || `Erro ${res.status} ao chamar ${path}`;
    const err = new Error(message) as ApiError;
    err.details = data?.details;
    err.code = data?.code ?? res.status;
    throw err;
  }

  return data.data as T;
}

function sessionExpiredError(): ApiError {
  const err = new Error('Sua sessão expirou. Entre novamente.') as ApiError;
  err.code = 401;
  return err;
}

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================
export function handleApiError(error: any): { message: string; code?: number } {
  if (error instanceof Error) {
    return { message: error.message, code: (error as any).code };
  }
  return { message: 'Ocorreu um erro inesperado. Tente novamente.', code: 500 };
}

// ============================================================
// AUTH API — Endpoints de autenticação
// ============================================================
export const AuthAPI = {
  register: (name: string, email: string, password: string) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
      auth: false,
    }),

  login: (email: string, password: string) =>
    apiRequest<{ user: any; token: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  // O backend espera { provider, token } (ID token do Google ou code do GitHub/Apple)
  socialLogin: (provider: string, token: string) =>
    apiRequest<{ user: any; token: string; refreshToken: string }>('/auth/social', {
      method: 'POST',
      body: { provider, token },
      auth: false,
    }),

  logout: (refreshToken: string) =>
    apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),

  refresh: (refreshToken: string) =>
    apiRequest<{ token: string; refreshToken: string; user?: any }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),

  requestRecovery: (email: string) =>
    apiRequest<{ code?: string }>('/auth/recover', {
      method: 'POST',
      body: { email },
      auth: false,
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { email, code, newPassword },
      auth: false,
    }),
};

// ============================================================
// PLAN API — Endpoints dos Planos
// ============================================================
export const PlanAPI = {
  list: () => apiRequest('/plans', { method: 'GET', auth: false }),
  /** Volta ao Free (sem senha). Para o usuário, prefira cancel(). */
  change: (tier: string) => apiRequest('/plans/change', { method: 'POST', body: { tier } }),
  /** Cancela o Krypta Pro (confirma com a senha do site) e devolve o usuário atualizado */
  cancel: (password: string) => apiRequest<any>('/plans/cancel', { method: 'POST', body: { password } }),
};

// ============================================================
// USER API — dados da conta do site (perfil e segurança)
// ============================================================
export interface EventoConta {
  id: string;
  action: string;
  detail: string | null;
  ip: string | null;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
}

export const UserAPI = {
  me: () => apiRequest<any>('/users/me'),
  update: (data: { name?: string; email?: string }) => apiRequest<any>('/users/me', { method: 'PUT', body: data }),
  /** Depois de trocar a senha, TODAS as sessões são encerradas: faça login de novo */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/users/me/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  revokeSessions: () => apiRequest('/users/me/sessions/revoke', { method: 'POST' }),
  remove: (password: string) => apiRequest('/users/me', { method: 'DELETE', body: { password } }),
  audit: () => apiRequest<EventoConta[]>('/users/me/audit'),
};

// ============================================================
// CONTACT API — formulário de contato (público)
// ============================================================
export const ContactAPI = {
  send: (data: { nome: string; email: string; assunto?: string; mensagem: string }) =>
    apiRequest<{ enviado: boolean }>('/contact', { method: 'POST', body: data, auth: false }),
};

// ============================================================
// VAULT API — cofre, rotas do PORTAL (token do site / admin_web)
// As rotas do DISPOSITIVO (token hardware) ficam em virtualDevice.ts,
// porque usam outro token e não passam pela renovação do portal.
// ============================================================
export type EstadoCofre =
  | 'PENDENTE_PAREAMENTO'
  | 'ATIVA'
  | 'REVOGADA'
  | 'RECUPERACAO_LOCAL'
  | 'RECUPERACAO_HARDWARE';

export interface ContaCofre {
  id: string;
  email: string;
  public_key: string | null;
  status: EstadoCofre;
  hardware_uuid: string | null;
  tipo_dispositivo: 'SOFTWARE' | 'FISICO' | null;
  dispositivo_serial: string | null;
  heranca_ativa: boolean;
  ultimo_sincronismo: string;
  criado_em: string;
  plano?: 'free' | 'pro';
  recursos?: {
    armazenamentoBytes: number;
    dispositivoFisico: boolean;
    killSwitch: boolean;
    heranca: boolean;
    alertasAcesso: boolean;
  };
}

export interface EventoCofre {
  id: string;
  acao: string;
  detalhe: string | null;
  ip: string | null;
  status: 'success' | 'warning' | 'error';
  quando: string;
}

export const VaultAPI = {
  /** Estado do cofre da conta logada */
  account: () => apiRequest<ContaCofre>('/vault/account'),

  /** Primeiro pareamento. Com dispositivoSerial = unidade física comprada (Pro) */
  pair: (publicKey: string, provaContDono: string, dispositivoSerial?: string | null) =>
    apiRequest<ContaCofre>('/hardware/pair', {
      method: 'POST',
      body: {
        public_key: publicKey,
        prova_cont_dono: provaContDono,
        ...(dispositivoSerial ? { dispositivo_serial: dispositivoSerial } : {}),
      },
    }),

  /** Alertas de acesso (Krypta Pro) */
  activity: () => apiRequest<EventoCofre[]>('/vault/activity'),

  /** "Perdi o dispositivo": revoga para sempre a chave atual */
  killSwitch: (provaContDono: string) =>
    apiRequest<ContaCofre>('/vault/kill-switch', {
      method: 'POST',
      body: { prova_cont_dono: provaContDono },
    }),

  /** Vincula um dispositivo novo depois do Kill Switch */
  recoveryHardware: (publicKey: string, provaContDono: string, dispositivoSerial?: string | null) =>
    apiRequest<ContaCofre>('/vault/recovery/hardware', {
      method: 'POST',
      body: {
        public_key: publicKey,
        prova_cont_dono: provaContDono,
        ...(dispositivoSerial ? { dispositivo_serial: dispositivoSerial } : {}),
      },
    }),
};

// ============================================================
// PEDIDOS E DISPOSITIVOS COMPRADOS (token do site)
// ============================================================
export type StatusDispositivo = 'EM_TRANSPORTE' | 'DISPONIVEL' | 'PAREADO' | 'REVOGADO';

export interface DispositivoComprado {
  serial: string;
  modelo: string;
  status: StatusDispositivo;
  emUsoNoCofre: boolean;
  entregueEm: string | null;
  pareadoEm: string | null;
  revogadoEm: string | null;
  compradoEm: string;
}

export interface Pedido {
  id: string;
  codigo: string;
  tipo: 'PLANO' | 'PRODUTO';
  item: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  periodo: 'MENSAL' | 'ANUAL' | null;
  metodo: 'card' | 'pix' | 'apple' | 'google';
  parcelas: number;
  cartaoFinal: string | null;
  tokenTransacao: string;
  enderecoEntrega: string | null;
  status: 'APROVADO' | 'CANCELADO';
  criadoEm: string;
  dispositivos?: Array<{ serial: string; status: StatusDispositivo }>;
}

export type NovoPedido =
  | {
      tipo: 'PLANO';
      plano: 'pro';
      periodo: 'MENSAL' | 'ANUAL';
      metodo: Pedido['metodo'];
      parcelas: number;
      cartao_final?: string;
      token_transacao: string;
    }
  | {
      tipo: 'PRODUTO';
      produto: string;
      quantidade: number;
      metodo: Pedido['metodo'];
      parcelas: number;
      cartao_final?: string;
      token_transacao: string;
      endereco: { cep: string; endereco: string; numero: string };
    };

export const OrdersAPI = {
  create: (pedido: NovoPedido) =>
    apiRequest<{ pedido: Pedido; user: any; dispositivos: string[] }>('/orders', { method: 'POST', body: pedido }),
  list: () => apiRequest<Pedido[]>('/orders'),
};

export const DevicesAPI = {
  list: () => apiRequest<DispositivoComprado[]>('/devices'),
  receive: (serial: string) =>
    apiRequest<DispositivoComprado>(`/devices/${encodeURIComponent(serial)}/receive`, { method: 'POST' }),
};
