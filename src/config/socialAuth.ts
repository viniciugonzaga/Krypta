// src/config/socialAuth.ts
// ============================================================
// LOGIN SOCIAL (Google, GitHub, Apple)
//
// Os botões ficam OCULTOS até você ligar a chave abaixo no .env DO
// FRONTEND (arquivo .env na raiz do projeto Vite, não no server/):
//
//   VITE_SOCIAL_LOGIN_ENABLED=true
//   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
//   VITE_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
//   VITE_APPLE_CLIENT_ID=com.krypta.web           (Services ID da Apple)
//   VITE_OAUTH_REDIRECT_BASE=http://localhost:5173 (opcional)
//
// Cada provedor só aparece se tiver o seu CLIENT_ID preenchido.
//
// ⚠️ NUNCA coloque CLIENT_SECRET em variáveis VITE_: tudo que começa
// com VITE_ vai parar no navegador. Os secrets ficam só no server/.env.
//
// Fluxo de cada provedor:
//  • Google → o botão oficial (@react-oauth/google) devolve um ID token;
//    o front chama signInWithSocial('google', idToken) e o backend valida
//    o token com GOOGLE_CLIENT_ID.
//    Requer <GoogleOAuthProvider clientId={...}> envolvendo o App (main.tsx).
//  • GitHub → redireciona para github.com; o GitHub volta para
//    /auth/callback/github?code=...; o front chama
//    signInWithSocial('github', code) e o BACKEND troca o code por um token
//    usando GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET.
//  • Apple → redireciona para appleid.apple.com; volta para
//    /auth/callback/apple?code=...; o BACKEND troca o code usando a chave
//    .p8 da Apple (APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY).
// ============================================================

export type SocialProvider = 'google' | 'github' | 'apple';

const env = import.meta.env;

const enabledFlag = env.VITE_SOCIAL_LOGIN_ENABLED === 'true';
const redirectBase =
  (env.VITE_OAUTH_REDIRECT_BASE as string | undefined) ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export const SOCIAL_AUTH = {
  google: {
    clientId: (env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '',
  },
  github: {
    clientId: (env.VITE_GITHUB_CLIENT_ID as string | undefined) ?? '',
    scope: 'read:user user:email',
    redirectUri: `${redirectBase}/auth/callback/github`,
  },
  apple: {
    clientId: (env.VITE_APPLE_CLIENT_ID as string | undefined) ?? '',
    redirectUri: `${redirectBase}/auth/callback/apple`,
  },
};

export const SOCIAL_ENABLED: Record<SocialProvider, boolean> = {
  google: enabledFlag && !!SOCIAL_AUTH.google.clientId,
  github: enabledFlag && !!SOCIAL_AUTH.github.clientId,
  apple: enabledFlag && !!SOCIAL_AUTH.apple.clientId,
};

export const ANY_SOCIAL_ENABLED = Object.values(SOCIAL_ENABLED).some(Boolean);

// ------------------------------------------------------------
// Proteção CSRF: guardamos um "state" aleatório antes de sair do site
// e conferimos quando o provedor devolver o usuário.
// ------------------------------------------------------------
const stateKey = (p: SocialProvider) => `krypta_oauth_state_${p}`;

function createState(provider: SocialProvider): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const state = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    sessionStorage.setItem(stateKey(provider), state);
  } catch {
    /* ignora */
  }
  return state;
}

export function consumeState(provider: SocialProvider, received: string | null): boolean {
  try {
    const saved = sessionStorage.getItem(stateKey(provider));
    sessionStorage.removeItem(stateKey(provider));
    return !!saved && saved === received;
  } catch {
    return false;
  }
}

export function buildGithubAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: SOCIAL_AUTH.github.clientId,
    redirect_uri: SOCIAL_AUTH.github.redirectUri,
    scope: SOCIAL_AUTH.github.scope,
    state: createState('github'),
    allow_signup: 'true',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export function buildAppleAuthUrl(): string {
  // Sem "scope", a Apple aceita response_mode=query (com scope ela exige
  // form_post, que precisa de uma rota POST no backend).
  const params = new URLSearchParams({
    client_id: SOCIAL_AUTH.apple.clientId,
    redirect_uri: SOCIAL_AUTH.apple.redirectUri,
    response_type: 'code',
    response_mode: 'query',
    state: createState('apple'),
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}