import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { mockDb } from '../services/mockDb';
import type { User } from '../services/mockDb';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const session = mockDb.loadSession();
      if (session) {
        const dbUser = await mockDb.getUserById(session.userId);
        if (dbUser) setUser(dbUser);
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const authenticated = await mockDb.authenticate(email, password);
    mockDb.saveSession(authenticated);
    setUser(authenticated);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const created = await mockDb.createUser({ name, email, password });
    mockDb.saveSession(created);
    setUser(created);
  };

  const signOut = () => {
    mockDb.clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);