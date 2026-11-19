// src/pages/AuthCallback.tsx
// Página de retorno do GitHub / Apple: /auth/callback/:provider?code=...&state=...
// Confere o "state" (proteção CSRF) e manda o "code" para o backend
// via signInWithSocial(provider, code).
//
// ⚠️ O BACKEND precisa aceitar 'github' e 'apple' na rota de login social
// e trocar o code pelo token do provedor usando os secrets do server/.env.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { consumeState, type SocialProvider } from '../config/socialAuth';
import { LoadingScreen } from '../components/ui/LoadingScreen';

const PROVIDERS: SocialProvider[] = ['google', 'github', 'apple'];

export function AuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithSocial } = useAuth();
  const { isDark } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // evita rodar 2x no StrictMode
    ran.current = true;

    const p = provider as SocialProvider;
    const code = params.get('code');
    const state = params.get('state');
    const providerError = params.get('error');

    if (!PROVIDERS.includes(p)) {
      setError('Provedor de login desconhecido.');
      return;
    }
    if (providerError) {
      setError('O login foi cancelado ou negado pelo provedor.');
      return;
    }
    if (!code || !consumeState(p, state)) {
      setError('Não foi possível validar o retorno do login. Tente novamente.');
      return;
    }

    // signInWithSocial hoje é tipado para 'google'; o cast permite outros
    // provedores assim que o AuthContext/backend aceitarem.
    const socialSignIn = signInWithSocial as unknown as (provider: string, token: string) => Promise<unknown>;
    socialSignIn(p, code)
      .then(() => navigate('/profile', { replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao entrar.'));
  }, [provider, params, navigate, signInWithSocial]);

  if (!error) return <LoadingScreen message="Conectando sua conta..." />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full rounded-2xl p-7 text-center"
        style={{
          background: isDark ? 'rgba(20,5,45,0.9)' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(141,81,255,0.4)' : 'rgba(81,0,189,0.2)'}`,
        }}
      >
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
        <p className="text-sm mb-5" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>
          {error}
        </p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="px-5 py-2.5 rounded-lg text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}
        >
          Voltar para o login
        </button>
      </motion.div>
    </div>
  );
}