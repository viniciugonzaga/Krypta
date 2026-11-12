// ============ TIPOS DO BANCO KRYPTA ============

export type UserStatus = 'ATIVA' | 'SUSPENSA' | 'REVOGADA' | 'PENDENTE_VERIFICACAO';
export type UserRole = 'user' | 'admin';

// CORRIGIDO: Alinhado com o backend (PlanController e UserModel)
export type PlanTier = 'free' | 'essential' | 'advanced' | 'max' | 'custom';

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: PlanTier;
  status: UserStatus;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginAttempts: number;
  lockedUntil?: string;
  hardwareUuid?: string;
  publicKeyEd25519?: string;
  recoveryCode?: string;
  recoveryCodeExpiresAt?: string;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  color?: string; // Opcional, pois o backend não envia. O frontend mapeia.
}

export interface Session {
  userId: string;
  token: string;
  refreshToken: string;
  createdAt: number;
  expiresAt: number;
  refreshExpiresAt: number;
  status: SessionStatus;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  detail: string;
  ip: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

// ============ ERROS DA API ============
export class ApiError extends Error {
  code: number;
  details?: Record<string, string>;
  constructor(code: number, message: string, details?: Record<string, string>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
  details?: Record<string, string>;
}

// ============ PLANOS PRÉ-DEFINIDOS ============
// CORRIGIDO: Alinhado exatamente com o PlanController do backend
export const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Krypta Free',
    price: 0,
    priceLabel: 'R$0',
    period: 'por mês',
    description: 'Para quem quer começar a proteger suas credenciais sem precisar do dispositivo físico.',
    features: [
      'Cofre digital de credenciais',
      'Senha Mestre',
      'Criptografia',
      'Gerenciamento básico de senhas',
      'Aplicativo Krypta',
      'Acesso pelo software',
      'Capacidade limitada de armazenamento',
    ],
    color: '#B4A0C8',
  },
  {
    tier: 'essential',
    name: 'Krypta Essencial',
    price: 10,
    priceLabel: 'R$10',
    period: 'por mês',
    description: 'Proteção essencial para suas credenciais, com autenticação simples e criptografia de ponta.',
    features: [
      'Cofre de credenciais',
      'Senha Mestre',
      'Criptografia AES-256-GCM',
      'Gerenciamento de credenciais',
      'Aplicativo Krypta',
      'Acesso pelo software',
    ],
    highlighted: true,
    color: '#6131C9',
  },
  {
    tier: 'advanced',
    name: 'Krypta Avançado',
    price: 15,
    priceLabel: 'R$15',
    period: 'por mês',
    description: 'Adiciona camadas extras de segurança para proteger credenciais importantes.',
    features: [
      'Tudo do Essencial',
      'Autenticação multifator',
      'Chave de segurança física',
      'Alertas de acesso',
      'Proteção reforçada para credenciais',
    ],
    color: '#5100BD',
  },
  {
    tier: 'max',
    name: 'Krypta Máximo',
    price: 25,
    priceLabel: 'R$25',
    period: 'por mês',
    description: 'O nível máximo de proteção, com múltiplas formas de autenticação e recursos avançados.',
    features: [
      'Tudo do Avançado',
      'Bloqueio remoto',
      'Verificações rigorosas de acesso',
      'Recursos de emergência',
      'Herança Digital',
    ],
    color: '#7F35A3',
  },
  {
    tier: 'custom',
    name: 'Krypta Personalizado',
    price: 10,
    priceLabel: 'R$10',
    period: 'por mês',
    description: 'Configure os recursos de segurança, privacidade e autenticação conforme suas necessidades.',
    features: [
      'Escolha os métodos de autenticação',
      'Defina os recursos de segurança',
      'Adapte o Krypta às suas necessidades',
      'Personalize o nível de proteção',
    ],
    color: '#8d51ff',
  },
];