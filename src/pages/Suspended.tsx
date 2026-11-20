// src/pages/Suspended.tsx
// Conta suspensa (423) ou revogada (410): usa a mesma tela de erro do site,
// com o tema claro/escuro e o robô. O PrivateRoute manda para cá.
import { useAuth } from '../contexts/AuthContext';
import { ErrorPage } from './ErrorPage';

export function Suspended() {
  const { user } = useAuth();
  return <ErrorPage code={user?.status === 'REVOGADA' ? 410 : 423} />;
}
