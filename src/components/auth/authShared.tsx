import { useTheme } from '../../contexts/ThemeContext';

export const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
export const LILAC = '#B4A0C8';

// Roxo meio rosa (barra do título / borda do robô)
export const BAR_COLOR = '#B35CFF';
export const BAR_GLOW = 'rgba(179,92,255,0.35)';

// Transição da troca de lado dos painéis (Login <-> Cadastro)
export const LAYOUT_TRANSITION = {
  duration: 0.9,
  ease: [0.76, 0, 0.24, 1] as [number, number, number, number],
};

// ============================================================
// ÍCONES SOCIAIS
// ============================================================
interface IconProps {
  size?: number;
}

export const GoogleIcon = ({ size = 18 }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
);

export const AppleIcon = ({ size = 18 }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

export const GithubIcon = ({ size = 18 }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

// ============================================================
// HOOK DE ESTILOS (tema claro/escuro) usado pelas duas páginas
// ============================================================
export function useAuthTheme() {
  const { isDark } = useTheme();

  return {
    isDark,
    panelBg: isDark ? '#05010a' : 'linear-gradient(135deg, #f3effa 0%, #e4dcf5 100%)',
    mutedText: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,26,26,0.6)',
    accent: isDark ? LILAC : '#5100BD',
    divider: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    inputStyle: {
      background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.2)'}`,
      color: isDark ? '#FFFFFF' : '#1a1a1a',
    },
    labelStyle: {
      color: isDark ? LILAC : '#5100BD',
      fontFamily: ROUNDED_FONT,
    },
  };
}