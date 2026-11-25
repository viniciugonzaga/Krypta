// src/services/api.ts
// Endereço da API. Em desenvolvimento usa o localhost; em produção vem do
// .env do front:  VITE_API_URL=https://api.seudominio.com.br/api
import { clienteAtual } from '../mobile/modo';

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
  /** Headers extras (ex.: X-Krypta-Cofre da sessão do cofre) */
  headers?: Record<string, string>;
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
      headers: { 'Content-Type': 'application/json', 'X-Krypta-Cliente': clienteAtual() },
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

async function doFetch(path: string, method: string, body: any, auth: boolean, extras: Record<string, string> = {}) {
  // X-Krypta-Cliente: o servidor sabe se veio do site, do celular, do app instalado ou do app Windows
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Krypta-Cliente': clienteAtual(), ...extras };

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
  { method = 'GET', body, auth = true, headers }: ApiOptions = {}
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

  let { res, data } = await doFetch(path, method, body, auth, headers);

  // 2) Renovação reativa: o servidor recusou o token → renova e repete 1x
  if (auth && isTokenError(res.status, data) && localStorage.getItem(STORAGE_KEYS.refresh)) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      ({ res, data } = await doFetch(path, method, body, auth, headers));
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
  update: (data: { name?: string; email?: string; avatar?: string | null }) => apiRequest<any>('/users/me', { method: 'PUT', body: data }),
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
    multiAparelho?: boolean;
    acessoRemoto?: boolean;
    pontosRestauracao?: number;
    camposExtras?: boolean;
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

export interface EstadoAcessoRemoto {
  disponivel: boolean;
  configurado: boolean;
  bloqueado: boolean;
  tipo: 'PIN' | 'SENHA' | null;
  salt: string | null;
  tentativasRestantes: number;
  criadoEm: string | null;
  ultimoUso: string | null;
}

export interface BackupCifrado {
  payload_cifrado: string;
  version_counter: number;
  atualizado_em: string;
}

export interface PontoRestauracao {
  id: string;
  nome: string;
  versao_origem: number;
  automatico: boolean;
  criado_em: string;
  tamanho: number;
}

export interface ResumoMudancas {
  adicionadas: number;
  editadas: number;
  removidas: number;
}

const cofreHeader = (token: string) => ({ 'X-Krypta-Cofre': token });

export const VaultAPI = {
  // ---------- v1.2.0: senha de acesso ao cofre (Pro) ----------
  remotoEstado: () => apiRequest<EstadoAcessoRemoto>('/vault/remoto'),
  remotoPreparar: (provaCcp: string) =>
    apiRequest<BackupCifrado & { salt: string; segredo: string }>('/vault/remoto/preparar', {
      method: 'POST',
      body: { prova_cont_dono: provaCcp },
    }),
  remotoAtivar: (body: { prova_cont_dono: string; prova_pin: string; envelope: string; tipo: 'PIN' | 'SENHA' }) =>
    apiRequest<{ configurado: boolean }>('/vault/remoto/ativar', { method: 'POST', body }),
  remotoAbrir: (provaPin: string) =>
    apiRequest<BackupCifrado & { token_cofre: string; expira_em: string; minutos: number; envelope: string; segredo: string; salt: string; tipo: 'PIN' | 'SENHA' }>(
      '/vault/remoto/abrir',
      { method: 'POST', body: { prova_pin: provaPin } }
    ),
  remotoRemover: (password: string) => apiRequest('/vault/remoto/remover', { method: 'POST', body: { password } }),
  remotoBaixar: (tokenCofre: string) => apiRequest<BackupCifrado>('/vault/remoto/backup', { headers: cofreHeader(tokenCofre) }),
  remotoGravar: (tokenCofre: string, versionCounter: number, payload: string, resumo: ResumoMudancas) =>
    apiRequest<{ version_counter: number; atualizado_em: string }>('/vault/remoto/backup', {
      method: 'PUT',
      headers: cofreHeader(tokenCofre),
      body: { version_counter: versionCounter, payload_cifrado: payload, resumo },
    }),

  // ---------- v1.2.0: pontos de restauração (exigem a CCP) ----------
  pontos: () => apiRequest<{ pontos: PontoRestauracao[]; limite: number; manuais: number }>('/vault/pontos'),
  criarPonto: (provaCcp: string, nome: string) =>
    apiRequest<PontoRestauracao>('/vault/pontos', { method: 'POST', body: { prova_cont_dono: provaCcp, nome } }),
  restaurarPonto: (id: string, provaCcp: string) =>
    apiRequest<{ version_counter: number }>(`/vault/pontos/${id}/restaurar`, { method: 'POST', body: { prova_cont_dono: provaCcp } }),
  apagarPonto: (id: string, provaCcp: string) =>
    apiRequest(`/vault/pontos/${id}/apagar`, { method: 'POST', body: { prova_cont_dono: provaCcp } }),

  /** Pro: baixa o backup CIFRADO provando a CCP (abrir o cofre em outro aparelho, só leitura) */
  abrirComCcp: (prova: string) =>
    apiRequest<{ payload_cifrado: string; version_counter: number; atualizado_em: string }>('/vault/backup/ccp', {
      method: 'POST',
      body: { prova_cont_dono: prova },
    }),

  /** Perdi a CCP e o dispositivo: pede o código por e-mail (confirma com a senha do site) */
  pedirAbandono: (password: string) =>
    apiRequest<{ enviado: boolean; expiraEmMinutos: number }>('/vault/abandon/request', { method: 'POST', body: { password } }),

  /** Confirma com o código: o cofre antigo é descartado e a conta fica pronta para um cofre novo */
  confirmarAbandono: (codigo: string) => apiRequest<ContaCofre>('/vault/abandon/confirm', { method: 'POST', body: { codigo } }),

  /** Estado do cofre da conta logada */
  account: () => apiRequest<ContaCofre>('/vault/account'),

  /** Primeiro pareamento. Com dispositivoSerial = unidade física comprada (Pro) */
  pair: (publicKey: string, provaContDono: string, dispositivoSerial?: string | null, backupInicial?: string | null) =>
    apiRequest<ContaCofre>('/hardware/pair', {
      method: 'POST',
      body: {
        public_key: publicKey,
        prova_cont_dono: provaContDono,
        ...(dispositivoSerial ? { dispositivo_serial: dispositivoSerial } : {}),
        ...(backupInicial ? { backup_inicial: backupInicial } : {}),
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
  /** O ESP32 já ligou e se apresentou ao servidor */
  conectado: boolean;
  /** Chave pública que o ESP32 gerou (não é segredo) */
  chaveAnunciada: string | null;
  /** 6 dígitos para conferir com a tela do dispositivo */
  codigoConfirmacao: string | null;
  /** O cofre está pareado com a chave do hardware real */
  hardwareReal: boolean;
  ultimoContato: string | null;
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

// ============================================================
// QUESTIONÁRIO DE BOAS-VINDAS (primeiro acesso) → plano recomendado
// ============================================================
export type RecursoSugerido = 'heranca' | 'killSwitch' | 'dispositivoFisico' | 'alertasAcesso' | 'armazenamento' | 'cofre';

export interface Recomendacao {
  plano: 'free' | 'pro';
  titulo: string;
  resumo: string;
  motivos: Array<{ recurso: RecursoSugerido; texto: string }>;
  dispositivoFisico: boolean;
}

export interface RespostasOnboarding {
  usos: string[];
  nivel: string | null;
  proteger: string[];
  dispositivos: string[];
  origem: string | null;
  outros: { usos?: string; proteger?: string; origem?: string };
  pulou: boolean;
}

export const OnboardingAPI = {
  obter: () => apiRequest<{ concluido: boolean; respostas: RespostasOnboarding | null; recomendacao: Recomendacao | null }>('/onboarding'),
  salvar: (respostas: RespostasOnboarding) =>
    apiRequest<{ recomendacao: Recomendacao | null }>('/onboarding', { method: 'POST', body: respostas }),
};

// ============================================================
// SESSÕES — onde a conta está aberta (site, celular, app...)
// ============================================================
export interface SessaoAtiva {
  id: string;
  cliente: 'web' | 'mobile' | 'pwa' | 'desktop';
  navegador: string;
  ip: string | null;
  desde: string;
  atual: boolean;
}

export const SessionsAPI = {
  listar: () => apiRequest<SessaoAtiva[]>('/users/me/sessions'),
};
