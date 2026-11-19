// src/components/auth/SocialLoginButtons.tsx
// Botões de login social prontos. Ficam ocultos (retornam null) enquanto
// o login social não estiver configurado — veja src/config/socialAuth.ts.
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { AppleIcon, GithubIcon, useAuthTheme } from './authShared';
import {
  ANY_SOCIAL_ENABLED,
  SOCIAL_ENABLED,
  buildAppleAuthUrl,
  buildGithubAuthUrl,
} from '../../config/socialAuth';

interface Props {
  /** "icons" = botões redondos (Login) | "full" = botões com texto (Cadastro) */
  variant?: 'icons' | 'full';
  onError: (message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  /** Para onde ir depois de entrar */
  redirectTo?: string;
  dividerLabel?: string;
}

export function SocialLoginButtons({
  variant = 'icons',
  onError,
  onLoadingChange,
  redirectTo = '/profile',
  dividerLabel = 'ou continue com',
}: Props) {
  const { signInWithSocial } = useAuth();
  const navigate = useNavigate();
  const { isDark, mutedText, accent, divider } = useAuthTheme();

  // Nada configurado → não mostra nem o divisor
  if (!ANY_SOCIAL_ENABLED) return null;

  // --- Google: recebe o ID token direto do botão oficial ---
  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    onLoadingChange?.(true);
    try {
      if (!credentialResponse.credential) throw new Error('Token do Google não recebido.');
      await signInWithSocial('google', credentialResponse.credential);
      navigate(redirectTo);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao entrar com Google.');
    } finally {
      onLoadingChange?.(false);
    }
  };

  // --- GitHub / Apple: saem do site e voltam em /auth/callback/:provider ---
  const goGithub = () => window.location.assign(buildGithubAuthUrl());
  const goApple = () => window.location.assign(buildAppleAuthUrl());

  const roundBtn = {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${divider}`,
    color: accent,
  };
  const fullBtn = {
    borderColor: divider,
    color: isDark ? '#FFFFFF' : '#1a1a1a',
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
  };

  return (
    <>
      <div className="w-full flex items-center gap-3 mt-6 mb-4">
        <div className="h-[1px] flex-1" style={{ background: divider }} />
        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: mutedText }}>
          {dividerLabel}
        </span>
        <div className="h-[1px] flex-1" style={{ background: divider }} />
      </div>

      {variant === 'icons' ? (
        <div className="flex gap-3 w-full justify-center items-center">
          {SOCIAL_ENABLED.google && (
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => onError('Falha ao autenticar com o Google.')}
                type="icon"
                shape="circle"
                theme={isDark ? 'filled_black' : 'outline'}
              />
            </div>
          )}
          {SOCIAL_ENABLED.apple && (
            <button
              type="button"
              onClick={goApple}
              aria-label="Entrar com Apple"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={roundBtn}
            >
              <AppleIcon />
            </button>
          )}
          {SOCIAL_ENABLED.github && (
            <button
              type="button"
              onClick={goGithub}
              aria-label="Entrar com GitHub"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={roundBtn}
            >
              <GithubIcon />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_ENABLED.google && (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => onError('Falha ao autenticar com o Google.')}
                text="continue_with"
                shape="pill"
                theme={isDark ? 'filled_black' : 'outline'}
              />
            </div>
          )}
          {SOCIAL_ENABLED.github && (
            <button
              type="button"
              onClick={goGithub}
              className="py-2.5 rounded-xl flex items-center justify-center gap-2 border text-[12px] font-medium transition-colors hover:bg-white/5"
              style={fullBtn}
            >
              <GithubIcon size={16} />
              Continuar com GitHub
            </button>
          )}
          {SOCIAL_ENABLED.apple && (
            <button
              type="button"
              onClick={goApple}
              className="py-2.5 rounded-xl flex items-center justify-center gap-2 border text-[12px] font-medium transition-colors hover:bg-white/5"
              style={fullBtn}
            >
              <AppleIcon size={16} />
              Continuar com Apple
            </button>
          )}
        </div>
      )}
    </>
  );
}