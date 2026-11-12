// src/AppRoutes.tsx
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// Componentes
import { PageTransition } from '../components/ui/PageTransition';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useAuth } from '../contexts/AuthContext';

// Páginas
import { Welcome } from '../pages/Welcome';
import { AuthPage } from '../pages/AuthPage'; 
import { Profile } from '../pages/Profile';
import { Vault } from '../pages/Vault';
import { Settings } from '../pages/Settings';
import { RecoverPassword } from '../pages/RecoverPassword';
import { Checkout } from '../pages/Checkout';
import { Services } from '../pages/Services';
import { Contact } from '../pages/Contact'; 
import { ErrorPage } from '../pages/ErrorPage';
import { Suspended } from '../pages/Suspended';
import { Plans } from '../pages/Plans';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'SUSPENSA' || user.status === 'REVOGADA') {
    return <Navigate to="/suspended" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Redireciona para "/" (Welcome) caso já esteja logado e tente acessar login/registro
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(false);

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

          <Route path="/services" element={<PageTransition variant="slide-up"><Services /></PageTransition>} />

          {/* Contatos (antigo Sobre) */}
          <Route path="/contact" element={<PageTransition variant="slide-up"><Contact /></PageTransition>} />

          <Route path="/checkout" element={<PageTransition variant="slide-up"><PrivateRoute><Checkout /></PrivateRoute></PageTransition>} />

          {/* Erro / Suspensão */}
          <Route path="/suspended" element={<PageTransition><Suspended /></PageTransition>} />
          <Route path="/error" element={<PageTransition><ErrorPage /></PageTransition>} />

          {/* Protegidas */}
          <Route path="/profile" element={<PageTransition><PrivateRoute><Profile /></PrivateRoute></PageTransition>} />
          <Route path="/plans" element={<PageTransition><PrivateRoute><Plans /></PrivateRoute></PageTransition>} />
          <Route path="/vault" element={<PageTransition><PrivateRoute><Vault /></PrivateRoute></PageTransition>} />
          <Route path="/settings" element={<PageTransition><PrivateRoute><Settings /></PrivateRoute></PageTransition>} />

          {/* 404 */}
          <Route path="*" element={<PageTransition><ErrorPage code={404} /></PageTransition>} />
        </Routes>
      )}
    </AnimatePresence>
  );
}