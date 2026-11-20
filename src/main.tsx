import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';
import { SOCIAL_AUTH } from './config/socialAuth';

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
