// Simulação de "banco de dados local" usando localStorage
// Estrutura de dados idêntica ao schema Prisma que será usado no backend

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // simulado (no back real: bcrypt)
  status: 'ATIVA' | 'RECUPERACAO' | 'REVOGADA';
  createdAt: string;
  updatedAt: string;
  // Fator de posse (simulado)
  hardwareUuid?: string;
  publicKeyEd25519?: string;
}

const DB_KEYS = {
  USERS: '@Krypta:users',
  SESSION: '@Krypta:session',
} as const;

// ============ HELPERS ============

function readUsers(): User[] {
  try {
    const raw = localStorage.getItem(DB_KEYS.USERS);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
}

// Simula latência de rede (para o front parecer real)
function delay(ms: number = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simula hash de senha (no back real: bcrypt.hash)
function fakeHash(password: string): string {
  return btoa(`krypta::${password}::salt`); // Apenas para o mock!
}

// ============ API MOCK (mesmas assinaturas do backend futuro) ============

export const mockDb = {
  // GET /api/users
  async listUsers(): Promise<User[]> {
    await delay(200);
    return readUsers();
  },

  // POST /api/auth/register
  async createUser(data: { name: string; email: string; password: string }): Promise<User> {
    await delay(600);
    const users = readUsers();

    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: fakeHash(data.password),
      status: 'ATIVA',
      createdAt: now,
      updatedAt: now,
      hardwareUuid: `ESP32-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      publicKeyEd25519: `ed25519_${Math.random().toString(36).slice(2, 18)}`,
    };

    writeUsers([...users, newUser]);
    return newUser;
  },

  // POST /api/auth/login
  async authenticate(email: string, password: string): Promise<User> {
    await delay(800);
    const users = readUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    if (user.passwordHash !== fakeHash(password)) {
      throw new Error('E-mail ou senha incorretos.');
    }

    if (user.status === 'REVOGADA') {
      throw new Error('Esta conta foi revogada. Contate o suporte.');
    }

    return user;
  },

  // GET /api/users/:id
  async getUserById(id: string): Promise<User | null> {
    await delay(200);
    return readUsers().find((u) => u.id === id) || null;
  },

  // ============ SESSÃO (JWT simulado) ============

  saveSession(user: User): void {
    // No back real: JWT com expiração de 15min + refresh token
    const session = {
      userId: user.id,
      email: user.email,
      name: user.name,
      token: `mock_jwt_${crypto.randomUUID()}`,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24h
    };
    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
  },

  loadSession(): { userId: string; email: string; name: string; token: string; expiresAt: number } | null {
    try {
      const raw = localStorage.getItem(DB_KEYS.SESSION);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.expiresAt < Date.now()) {
        localStorage.removeItem(DB_KEYS.SESSION);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    localStorage.removeItem(DB_KEYS.SESSION);
  },

  // Utilidade para debug
  resetDatabase(): void {
    localStorage.removeItem(DB_KEYS.USERS);
    localStorage.removeItem(DB_KEYS.SESSION);
  },
};