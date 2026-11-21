import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';
import { SOCIAL_AUTH } from './config/socialAuth';
import { IS_DESKTOP, instalarLinksExternos } from './config/desktop';
import { iniciarPwa } from './config/pwa';

// App de celular (PWA): guarda a oferta de instalação e registra o service worker
iniciarPwa();

// App desktop (Tauri): links externos abrem no navegador e o CSS pode
// ajustar detalhes com .krypta-desktop (o resto é idêntico ao site)
if (IS_DESKTOP) {
  document.documentElement.classList.add('krypta-desktop');
  instalarLinksExternos();
}

// O Client ID do Google vem do .env (VITE_GOOGLE_CLIENT_ID), o mesmo que o
// servidor confere. Vazio = login com Google desligado.
const GOOGLE_CLIENT_ID = SOCIAL_AUTH.google.clientId || 'login-google-desligado';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
