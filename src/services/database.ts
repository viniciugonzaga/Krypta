import type { User, Session, AuditLog } from '../types';

const TABLES = {
  USERS: '@Krypta:db:users',
  SESSIONS: '@Krypta:db:sessions',
  AUDIT: '@Krypta:db:audit',
} as const;

// ============ HELPERS ============
function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function sleep(ms = 350): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function hashPassword(password: string): string {
  return btoa(`krypta::${password}::v1`);
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ============ TABELA: USERS ============
export const UserTable = {
  all(): User[] {
    return read<User>(TABLES.USERS);
  },
  findById(id: string): User | null {
    return this.all().find((u) => u.id === id) || null;
  },
  findByEmail(email: string): User | null {
    return this.all().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  insert(user: User): User {
    const users = this.all();
    users.push(user);
    write(TABLES.USERS, users);
    return user;
  },
  update(id: string, patch: Partial<User>): User | null {
    const users = this.all();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch, updatedAt: new Date().toISOString() };
    write(TABLES.USERS, users);
    return users[idx];
  },
  delete(id: string): boolean {
    const users = this.all();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    write(TABLES.USERS, filtered);
    return true;
  },
  count(): number {
    return this.all().length;
  },
};

// ============ TABELA: SESSIONS ============
export const SessionTable = {
  all(): Session[] {
    return read<Session>(TABLES.SESSIONS);
  },
  findByToken(token: string): Session | null {
    return this.all().find((s) => s.token === token) || null;
  },
  findByRefresh(refreshToken: string): Session | null {
    return this.all().find((s) => s.refreshToken === refreshToken) || null;
  },
  insert(session: Session): Session {
    const sessions = this.all().filter((s) => s.userId !== session.userId || s.status !== 'active');
    sessions.push(session);
    write(TABLES.SESSIONS, sessions);
    return session;
  },
  update(token: string, patch: Partial<Session>): Session | null {
    const sessions = this.all();
    const idx = sessions.findIndex((s) => s.token === token);
    if (idx === -1) return null;
    sessions[idx] = { ...sessions[idx], ...patch };
    write(TABLES.SESSIONS, sessions);
    return sessions[idx];
  },
  revokeAllForUser(userId: string): void {
    const sessions = this.all().map((s) =>
      s.userId === userId ? { ...s, status: 'revoked' as const } : s
    );
    write(TABLES.SESSIONS, sessions);
  },
};

// ============ TABELA: AUDIT LOG ============
export const AuditTable = {
  all(): AuditLog[] {
    return read<AuditLog>(TABLES.AUDIT);
  },
  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.all();
    logs.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    if (logs.length > 200) logs.splice(0, logs.length - 200);
    write(TABLES.AUDIT, logs);
  },
  findByUser(userId: string, limit = 10): AuditLog[] {
    return this.all()
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  },
};

// ============ UTILITÁRIOS ============
export const DB = {
  reset(): void {
    Object.values(TABLES).forEach((k) => localStorage.removeItem(k));
  },
  stats() {
    return {
      users: UserTable.count(),
      sessions: SessionTable.all().length,
      logs: AuditTable.all().length,
    };
  },
};