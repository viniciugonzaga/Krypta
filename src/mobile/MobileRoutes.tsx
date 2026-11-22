// src/mobile/MobileRoutes.tsx
// ============================================================
// ROTAS DO MODO MOBILE
// Os ENDEREÇOS são os mesmos do site (/, /login, /device, /profile...),
// só as telas mudam. Assim links, e-mails e o kit de herança funcionam
// nos dois modos. Páginas de divulgação (Serviços, Como funciona, a home
// do site) não aparecem: "/" vira o app.
// Páginas que ainda não têm versão de app (checkout, compras, resgate de
// herança...) abrem a versão do site, que já se ajusta à tela pequena.
// ============================================================
import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_EVENTS } from '../services/api';
import type { DestinoLogin } from '../routes/destino';

import { MIntro, MLogin, MRegister } from './pages/MEntrada';
import { MOnboarding } from './pages/MOnboarding';
import { MHome, MNotificacoes } from './pages/MInicio';
import { MBloqueio, MCofre, MCofreCompleto, MEmergencia, MHerancaApp } from './pages/MCofre';
import { MChaves, MNovaChave } from './pages/MChaves';
import { MPerdiCcp, MVerCofre } from './pages/MAcesso';
import { MAcessoCofre, MPontos } from './pages/MRemoto';
import { MConfig, MPerfil, MPlanos } from './pages/MConta';

// Páginas do site usadas também no modo Mobile
import { Checkout } from '../pages/Checkout';
import { Orders } from '../pages/Orders';
import { Products } from '../pages/Products';
import { Aplicacoes } from '../pages/Aplicacoes';
import { InheritanceClaim } from '../pages/InheritanceClaim';
import { RecoverPassword } from '../pages/RecoverPassword';
import { Contact } from '../pages/Contact';
import { ErrorPage } from '../pages/ErrorPage';
import { Suspended } from '../pages/Suspended';
import { AuthCallback } from '../pages/AuthCallback';

function Privada({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const from: DestinoLogin = { pathname: location.pathname, search: location.search, hash: location.hash, state: location.state };
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (user.status === 'SUSPENSA' || user.status === 'REVOGADA') return <Navigate to="/suspended" replace />;
  return <>{children}</>;
}

function SoSemLogin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user) {
    const from = (location.state as { from?: DestinoLogin } | null)?.from;
    if (from) return <Navigate to={`${from.pathname}${from.search ?? ''}${from.hash ?? ''}`} replace state={from.state} />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/** Transição curta entre as telas (deslizar, como app) */
function Tela({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

export function MobileRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sessão venceu de vez → "Sessão expirada"
  useEffect(() => {
    const aoExpirar = () => navigate('/error', { state: { code: 419 }, replace: true });
    window.addEventListener(AUTH_EVENTS.sessionExpired, aoExpirar);
    return () => window.removeEventListener(AUTH_EVENTS.sessionExpired, aoExpirar);
  }, [navigate]);

  // Volta ao topo a cada troca de tela
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Início: abertura (sem login) ou o app (logado) */}
        <Route path="/" element={<Tela>{user ? <MHome /> : <MIntro />}</Tela>} />

        <Route path="/login" element={<SoSemLogin><Tela><MLogin /></Tela></SoSemLogin>} />
        <Route path="/register" element={<SoSemLogin><Tela><MRegister /></Tela></SoSemLogin>} />
        <Route path="/recover" element={<RecoverPassword />} />
        <Route path="/heranca" element={<InheritanceClaim />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/boas-vindas" element={<Privada><MOnboarding /></Privada>} />

        {/* Cofre */}
        <Route path="/device" element={<Privada><Tela><MCofre /></Tela></Privada>} />
        <Route path="/vault" element={<Navigate to="/device" replace />} />
        <Route path="/cofre/chaves" element={<Privada><Tela><MChaves /></Tela></Privada>} />
        <Route path="/cofre/nova-chave" element={<Privada><Tela><MNovaChave /></Tela></Privada>} />
        <Route path="/cofre/completo" element={<Privada><MCofreCompleto /></Privada>} />
        <Route path="/cofre/ver" element={<Privada><Tela><MVerCofre /></Tela></Privada>} />
        <Route path="/cofre/acesso" element={<Privada><Tela><MAcessoCofre /></Tela></Privada>} />
        <Route path="/cofre/pontos" element={<Privada><Tela><MPontos /></Tela></Privada>} />
        <Route path="/perdi-ccp" element={<Privada><Tela><MPerdiCcp /></Tela></Privada>} />
        <Route path="/heranca-digital" element={<Privada><Tela><MHerancaApp /></Tela></Privada>} />
        <Route path="/bloqueio" element={<Privada><Tela><MBloqueio /></Tela></Privada>} />
        <Route path="/emergencia" element={<Privada><Tela><MEmergencia /></Tela></Privada>} />

        {/* Conta */}
        <Route path="/notificacoes" element={<Privada><Tela><MNotificacoes /></Tela></Privada>} />
        <Route path="/profile" element={<Privada><Tela><MPerfil /></Tela></Privada>} />
        <Route path="/settings" element={<Privada><Tela><MConfig /></Tela></Privada>} />
        <Route path="/plans" element={<Privada><Tela><MPlanos /></Tela></Privada>} />

        {/* Páginas do site (ainda sem versão de app) */}
        <Route path="/checkout" element={<Privada><Checkout /></Privada>} />
        <Route path="/compras" element={<Privada><Orders /></Privada>} />
        <Route path="/products" element={<Products />} />
        <Route path="/aplicacoes" element={<Aplicacoes />} />
        <Route path="/download" element={<Navigate to="/aplicacoes" replace />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/suspended" element={<Suspended />} />
        <Route path="/error" element={<ErrorPage />} />

        {/* Divulgação não aparece no app: volta para o início */}
        <Route path="/services" element={<Navigate to={user ? '/plans' : '/'} replace />} />
        <Route path="/como-funciona" element={<Navigate to="/" replace />} />

        <Route path="*" element={<ErrorPage code={404} />} />
      </Routes>
    </AnimatePresence>
  );
}
