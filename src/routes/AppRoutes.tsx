// src/routes/AppRoutes.tsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// Componentes
import { PageTransition } from '../components/ui/PageTransition';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_EVENTS } from '../services/api';
import type { DestinoLogin } from './destino';

// Páginas
import { Welcome } from '../pages/Welcome';
import { AuthPage } from '../pages/AuthPage';
import { Profile } from '../pages/Profile';
import { Settings } from '../pages/Settings'; 
import { RecoverPassword } from '../pages/RecoverPassword';
import { Checkout } from '../pages/Checkout';
import { Services } from '../pages/Services';
import { Contact } from '../pages/Contact';
import { ErrorPage } from '../pages/ErrorPage';
import { Suspended } from '../pages/Suspended';
import { Plans } from '../pages/Plans';
// NOVA PÁGINA DE PRODUTOS IMPORTADA AQUI
import { Products } from '../pages/Products';
import { AuthCallback } from '../pages/AuthCallback';
import { Device } from '../pages/Device';
import { InheritanceClaim } from '../pages/InheritanceClaim';
import { HowItWorks } from '../pages/HowItWorks';
import { Orders } from '../pages/Orders';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const from: DestinoLogin = { pathname: location.pathname, search: location.search, hash: location.hash, state: location.state };
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (user.status === 'SUSPENSA' || user.status === 'REVOGADA') {
    return <Navigate to="/suspended" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  // Já logado: volta para a página que pediu o login (ou o perfil)
  if (user) {
    const from = (location.state as { from?: DestinoLogin } | null)?.from;
    if (from) return <Navigate to={`${from.pathname}${from.search ?? ''}${from.hash ?? ''}`} replace state={from.state} />;
    return <Navigate to="/profile" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoading, setShowLoading] = useState(false);

  // Sessão venceu de vez (refresh token inválido): mostra a tela "Sessão expirada"
  useEffect(() => {
    const onExpired = () => navigate('/error', { state: { code: 419 }, replace: true });
    window.addEventListener(AUTH_EVENTS.sessionExpired, onExpired);
    return () => window.removeEventListener(AUTH_EVENTS.sessionExpired, onExpired);
  }, [navigate]);

  const prevPathRef = useRef(location.pathname);

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  const routeKey = isAuthRoute ? 'auth' : location.pathname;

  const isAuthTransition =
    (prevPathRef.current === '/login' && location.pathname === '/register') ||
    (prevPathRef.current === '/register' && location.pathname === '/login');

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <AnimatePresence
      mode="wait"
      initial={false}
      onExitComplete={() => {
        if (isAuthTransition) return;

        setShowLoading(true);

        const timer = setTimeout(() => {
          setShowLoading(false);
        }, 1400);

        return () => clearTimeout(timer);
      }}
    >
      {showLoading ? (
        <LoadingScreen key="global-loading" />
      ) : (
        <Routes location={location} key={routeKey}>
          {/* Públicas */}
          <Route path="/" element={<PageTransition variant="slide-up"><Welcome /></PageTransition>} />
          <Route path="/recover" element={<PageTransition variant="slide-up"><RecoverPassword /></PageTransition>} />

          {/* Auth */}
          <Route path="/login" element={<PageTransition variant="fade"><PublicOnlyRoute><AuthPage /></PublicOnlyRoute></PageTransition>} />
          <Route path="/register" element={<PageTransition variant="fade"><PublicOnlyRoute><AuthPage /></PublicOnlyRoute></PageTransition>} />

          {/* Resgate de herança: público (o herdeiro não tem conta) */}
          <Route path="/heranca" element={<PageTransition variant="slide-up"><InheritanceClaim /></PageTransition>} />

          {/* Como funciona o cofre, o dispositivo e a herança: público */}
          <Route path="/como-funciona" element={<PageTransition variant="slide-up"><HowItWorks /></PageTransition>} />

          {/* Retorno do login social (GitHub / Apple) */}
          <Route path="/auth/callback/:provider" element={<AuthCallback />} />

          <Route path="/services" element={<PageTransition variant="slide-up"><Services /></PageTransition>} />
          
          {/* Nova Rota de Produtos */}
          <Route path="/products" element={<PageTransition variant="slide-up"><Products /></PageTransition>} />

          {/* Contatos (antigo Sobre) */}
          <Route path="/contact" element={<PageTransition variant="slide-up"><Contact /></PageTransition>} />

          <Route path="/checkout" element={<PageTransition variant="slide-up"><PrivateRoute><Checkout /></PrivateRoute></PageTransition>} />

          {/* Erro / Suspensão */}
          <Route path="/suspended" element={<PageTransition><Suspended /></PageTransition>} />
          <Route path="/error" element={<PageTransition><ErrorPage /></PageTransition>} />

          {/* Protegidas */}
          <Route path="/profile" element={<PageTransition><PrivateRoute><Profile /></PrivateRoute></PageTransition>} />
          <Route path="/plans" element={<PageTransition><PrivateRoute><Plans /></PrivateRoute></PageTransition>} />
          <Route path="/device" element={<PageTransition><PrivateRoute><Device /></PrivateRoute></PageTransition>} />
          <Route path="/compras" element={<PageTransition><PrivateRoute><Orders /></PrivateRoute></PageTransition>} />
          {/* O cofre de verdade fica no Meu Krypta */}
          <Route path="/vault" element={<Navigate to="/device" replace />} />
          <Route path="/settings" element={<PageTransition variant="slide-up"><PrivateRoute><Settings /></PrivateRoute></PageTransition>} />

          {/* 404 */}
          <Route path="*" element={<PageTransition><ErrorPage code={404} /></PageTransition>} />
        </Routes>
      )}
    </AnimatePresence>
  );
}