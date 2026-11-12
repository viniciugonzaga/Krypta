const API_URL = 'http://localhost:3333/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  auth?: boolean;
}

export async function apiRequest<T = any>(
  path: string,
  { method = 'GET', body, auth = true }: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = localStorage.getItem('krypta_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    const message =
      data?.error || data?.message || `Erro ${res.status} ao chamar ${path}`;
    const err = new Error(message) as Error & { details?: any; code?: number };
    err.details = data?.details;
    err.code = data?.code ?? res.status;
    throw err;
  }

  return data.data as T;
}

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================
export function handleApiError(error: any): { message: string; code?: number } {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as any).code,
    };
  }
  return {
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    code: 500,
  };
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

  socialLogin: (provider: string, email: string, name: string) =>
    apiRequest<{ user: any; token: string; refreshToken: string }>('/auth/social', {
      method: 'POST',
      body: { provider, email, name },
      auth: false,
    }),

  logout: (refreshToken: string) =>
    apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }),

  refresh: (refreshToken: string) =>
    apiRequest<{ token: string; refreshToken: string }>('/auth/refresh', {
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
  list: () => apiRequest('/plans', { method: 'GET' }),
  getAll: () => apiRequest('/plans', { method: 'GET' }),
  getById: (id: string) => apiRequest(`/plans/${id}`, { method: 'GET' }),
  create: (data: { name: string; price: number; features: string[] }) => 
    apiRequest('/plans', { method: 'POST', body: data }),
  update: (id: string, data: any) => 
    apiRequest(`/plans/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => 
    apiRequest(`/plans/${id}`, { method: 'DELETE' }),
};