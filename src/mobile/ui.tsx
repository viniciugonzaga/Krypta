// src/mobile/ui.tsx
// ============================================================
// PEÇAS DO MODO MOBILE (visual do protótipo "Krypta APP")
//   • OndaFundo      → ondas roxas animadas (abertura, login, cadastro)
//   • MobileShell    → cabeçalho KRYPTA + conteúdo + barra inferior com o "+"
//   • MCard, MTitulo, MBotao, MCampo, MLinhaAcao, MInterruptor, MFolha (bottom sheet)
// Com "reduzir movimento" ligado, as animações ficam mais lentas (não param).
// ============================================================
import { useEffect, useMemo, useRef, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, ChevronLeft, ChevronRight, Home, Loader2, Lock, Moon, Plus, Settings, Sun, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNaoLidas } from '../components/AvisosApp';
import { FotoPerfil } from '../components/FotoPerfil';
import { Camada } from '../components/Camada';
import { abrirCody } from '../ajuda/abrir';
import codyMini from '../assets/cody/cody_acenando.webp';

import logoBranco from '../assets/Logos/Krypta_Nav_Branco.png';
import logoPreto from '../assets/Logos/Krypta_Nav_Preto.png';

export const FONTE = "'Quicksand', 'Poppins', sans-serif";
export const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';

// ============================================================
// CORES
// ============================================================
export function useMCores() {
  const { isDark } = useTheme();
  return useMemo(() => {
    const roxo = isDark ? '#a97aff' : '#6131C9';
    return {
      isDark,
      roxo,
      roxoForte: isDark ? '#8d51ff' : '#5100BD',
      fundo: isDark ? '#07010f' : '#FFFFFF',
      texto: isDark ? '#FFFFFF' : '#1a1a1a',
      suave: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(26,26,26,0.62)',
      borda: isDark ? 'rgba(141,81,255,0.45)' : 'rgba(97,49,201,0.35)',
      cartao: isDark ? 'linear-gradient(160deg, rgba(30,8,62,0.92) 0%, rgba(10,2,22,0.95) 100%)' : '#FFFFFF',
      faixa: isDark ? 'rgba(141,81,255,0.16)' : 'rgba(198,174,248,0.45)',
      campo: isDark ? 'rgba(0,0,0,0.35)' : '#FFFFFF',
    };
  }, [isDark]);
}
export type MCores = ReturnType<typeof useMCores>;

// ============================================================
// ONDAS ROXAS ANIMADAS (fundo escuro das telas de entrada)
// v1.3.0: desenhadas em <canvas> na resolução real da tela (nítidas em
// qualquer celular/monitor) e sempre em movimento. Antes eram SVGs
// esticados + blur, que ficavam serrilhados e paravam quando o sistema
// tinha "reduzir animações" ligado. Agora, nesse caso, só ficam mais lentas.
// ============================================================
const CAMADAS = [
  { base: 0.42, amp: 0.07, freq: 1.3, vel: 0.18, cor: [141, 81, 255], alfa: 0.5, fios: 9 },
  { base: 0.52, amp: 0.09, freq: 0.9, vel: -0.13, cor: [81, 0, 189], alfa: 0.62, fios: 7 },
  { base: 0.6, amp: 0.06, freq: 1.7, vel: 0.22, cor: [198, 174, 248], alfa: 0.22, fios: 11 },
  { base: 0.7, amp: 0.05, freq: 1.1, vel: -0.09, cor: [106, 31, 224], alfa: 0.45, fios: 0 },
] as const;

function OndasCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduzir = useReducedMotion();
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const medir = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cv);
    const ritmo = reduzir ? 0.25 : 1;
    const y = (c: (typeof CAMADAS)[number], x: number, t: number, desloc = 0) => {
      const u = x / Math.max(w, 1);
      return (
        h * c.base +
        h * c.amp * Math.sin(u * Math.PI * 2 * c.freq + t * c.vel * 6 + desloc) +
        h * c.amp * 0.45 * Math.sin(u * Math.PI * 2 * c.freq * 2.3 - t * c.vel * 4 + desloc * 1.7)
      );
    };
    const passo = 6;
    const desenhar = (ms: number) => {
      const t = (ms / 1000) * ritmo;
      ctx.clearRect(0, 0, w, h);
      for (const c of CAMADAS) {
        // faixa preenchida
        const g = ctx.createLinearGradient(0, h * (c.base - c.amp * 1.6), 0, h);
        g.addColorStop(0, `rgba(${c.cor.join(',')},${c.alfa})`);
        g.addColorStop(0.55, `rgba(${c.cor.join(',')},${c.alfa * 0.35})`);
        g.addColorStop(1, `rgba(${c.cor.join(',')},0)`);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + passo; x += passo) ctx.lineTo(x, y(c, x, t));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        // fios de seda (brilho fino que acompanha a onda)
        for (let f = 0; f < c.fios; f++) {
          ctx.beginPath();
          const d = f * 0.11;
          for (let x = 0; x <= w + passo; x += passo) {
            const yy = y(c, x, t, d) + f * 2.2;
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.strokeStyle = `rgba(230,215,255,${0.16 - f * 0.012})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(desenhar);
    };
    const visivel = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(desenhar);
    };
    document.addEventListener('visibilitychange', visivel);
    raf = requestAnimationFrame(desenhar);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', visivel);
    };
  }, [reduzir]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />;
}

export function OndaFundo({ altura = '100%' }: { altura?: string }) {
  const reduzir = useReducedMotion();
  const lento = reduzir ? 3 : 1;
  return (
    <div className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none" style={{ height: altura, background: 'radial-gradient(120% 80% at 70% 0%, #2a0a5e 0%, #0b0218 55%, #050010 100%)' }}>
      {/* brilhos */}
      <motion.div
        className="absolute -top-24 -right-20 w-80 h-80 rounded-full blur-[90px]"
        style={{ background: 'rgba(141,81,255,0.55)' }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.12, 1] }}
        transition={{ duration: 7 * lento, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -left-24 w-72 h-72 rounded-full blur-[90px]"
        style={{ background: 'rgba(81,0,189,0.5)' }}
        animate={{ opacity: [0.8, 0.45, 0.8] }}
        transition={{ duration: 9 * lento, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* ondas de seda */}
      <OndasCanvas />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(5,0,16,0.85) 100%)' }} />
    </div>
  );
}

/** Brilho suave atrás das telas internas (claro e escuro) */
function BrilhoInterno({ c }: { c: MCores }) {
  const reduzir = useReducedMotion();
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute -top-32 -right-24 w-72 h-72 rounded-full blur-[110px]"
        style={{ background: c.isDark ? 'rgba(141,81,255,0.35)' : 'rgba(198,174,248,0.55)' }}
        animate={reduzir ? undefined : { opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-10 -left-24 w-64 h-64 rounded-full blur-[110px]"
        style={{ background: c.isDark ? 'rgba(81,0,189,0.35)' : 'rgba(141,81,255,0.18)' }}
        animate={reduzir ? undefined : { opacity: [1, 0.6, 1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
    </div>
  );
}

// ============================================================
// MOLDURA DAS TELAS LOGADAS
// ============================================================
// v1.5.0: Início · Cody (chat) · + · Cofre · Ajustes. O Perfil abre pela foto no topo.
const ABAS: { to: string; icone: typeof Home; rotulo: string; centro?: boolean; cody?: boolean }[] = [
  { to: '/', icone: Home, rotulo: 'Início' },
  { to: '#cody', icone: Home, rotulo: 'Conversar com o Cody', cody: true },
  { to: '/cofre/nova-chave', icone: Plus, rotulo: 'Nova chave', centro: true },
  { to: '/device', icone: Lock, rotulo: 'Cofre' },
  { to: '/settings', icone: Settings, rotulo: 'Ajustes' },
];

/** Aba do Cody: carinha dele num balão de conversa, com "pulinho" de vez em quando */
function AbaCody({ c }: { c: MCores }) {
  const reduzir = useReducedMotion();
  return (
    <button type="button" onClick={() => abrirCody()} aria-label="Conversar com o Cody" className="flex flex-col items-center gap-1 w-14 py-1">
      <motion.span
        className="relative w-[34px] h-[30px] flex items-center justify-center"
        animate={reduzir ? undefined : { y: [0, -3, 0, 0, 0], rotate: [0, -6, 6, 0, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3.5 }}
      >
        <svg viewBox="0 0 34 30" className="absolute inset-0 w-full h-full" aria-hidden>
          <path d="M5 2h24a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H14l-6 5v-5H5a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" fill={c.isDark ? 'rgba(141,81,255,0.22)' : '#F1E9FF'} stroke={c.roxo} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <img src={codyMini} alt="" className="relative w-[22px] h-[22px] object-contain -mt-1.5" draggable={false} />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e', border: `2px solid ${c.isDark ? '#0d0320' : '#fff'}` }} />
      </motion.span>
      <span className="w-1 h-1" />
    </button>
  );
}

function abaAtiva(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  if (to === '/device') return ['/device', '/cofre', '/heranca-digital', '/bloqueio', '/emergencia'].some((p) => pathname.startsWith(p)) && !pathname.startsWith('/cofre/nova-chave');
  return pathname.startsWith(to);
}

export function MobileShell({ children, voltar, semBarra }: { children: ReactNode; voltar?: string | true; semBarra?: boolean }) {
  const c = useMCores();
  const { toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const naoLidas = useNaoLidas();

  return (
    <div className="min-h-[100dvh] relative" style={{ background: c.fundo, color: c.texto, fontFamily: FONTE }}>
      <BrilhoInterno c={c} />

      {/* Cabeçalho */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2 px-4 h-14 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top)', background: c.isDark ? 'rgba(7,1,15,0.78)' : 'rgba(255,255,255,0.82)', borderBottom: `1px solid ${c.borda}` }}
      >
        {voltar ? (
          <button type="button" aria-label="Voltar" onClick={() => (voltar === true ? navigate(-1) : navigate(voltar))} className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full" style={{ color: c.roxo }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : null}
        <Link to="/" className="flex-1 min-w-0">
          <img src={c.isDark ? logoBranco : logoPreto} alt="Krypta" className="h-4 w-auto" draggable={false} />
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold"
          style={{ border: `1px solid ${c.borda}`, color: c.texto }}
          aria-label="Trocar tema"
        >
          {c.isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />} {c.isDark ? 'Dark' : 'Light'}
        </button>
        <Link to="/notificacoes" aria-label={naoLidas ? `Notificações (${naoLidas} novas)` : 'Notificações'} className="relative w-9 h-9 flex items-center justify-center rounded-full" style={{ color: c.roxo }}>
          <Bell className="w-5 h-5" />
          {naoLidas > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9.5px] font-bold text-white flex items-center justify-center" style={{ background: '#ef4444' }}>
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Link>
        <Link to="/profile" aria-label="Perfil" className="w-8 h-8 rounded-full flex items-center justify-center">
          <FotoPerfil avatar={user?.avatarUrl} nome={user?.name} tamanho={32} />
        </Link>
      </header>

      <main className="relative z-10 px-4 pt-5" style={{ paddingBottom: semBarra ? 'calc(24px + env(safe-area-inset-bottom))' : 'calc(132px + env(safe-area-inset-bottom))' }}>
        {children}
      </main>

      {!semBarra && <BarraInferior c={c} pathname={pathname} />}
    </div>
  );
}

function BarraInferior({ c, pathname }: { c: MCores; pathname: string }) {
  const reduzir = useReducedMotion();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: c.isDark ? '#0d0320' : '#FFFFFF' }}>
      {/* curva da barra (a "onda" do protótipo) */}
      <svg viewBox="0 0 400 34" preserveAspectRatio="none" className="absolute -top-[33px] inset-x-0 w-full h-[34px]">
        <path d="M0,34 L0,20 C60,20 120,26 150,20 C175,14 180,0 200,0 C220,0 225,14 250,20 C280,26 340,20 400,20 L400,34 Z" fill={c.isDark ? '#0d0320' : '#FFFFFF'} />
        <path d="M0,20 C60,20 120,26 150,20 C175,14 180,0 200,0 C220,0 225,14 250,20 C280,26 340,20 400,20" fill="none" stroke={c.borda} strokeWidth="1" />
      </svg>
      <ul className="relative grid grid-cols-5 h-16 items-center">
        {ABAS.map(({ to, icone: Icone, rotulo, centro, cody }) => {
          const ativa = abaAtiva(pathname, to);
          return (
            <li key={to} className="flex justify-center">
              {cody ? (
                <AbaCody c={c} />
              ) : centro ? (
                <Link to={to} aria-label={rotulo} className="relative -mt-9">
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'rgba(141,81,255,0.45)', filter: 'blur(10px)' }}
                    animate={reduzir ? undefined : { scale: [1, 1.25, 1], opacity: [0.7, 0.3, 0.7] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                  />
                  <span className="relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg" style={{ background: GRAD }}>
                    <Plus className="w-7 h-7" />
                  </span>
                </Link>
              ) : (
                <Link to={to} aria-label={rotulo} className="flex flex-col items-center gap-1 w-14 py-1" style={{ color: ativa ? c.roxo : c.suave }}>
                  <Icone className="w-[22px] h-[22px]" />
                  <motion.span className="w-1 h-1 rounded-full" style={{ background: c.roxo }} animate={{ opacity: ativa ? 1 : 0, scale: ativa ? 1 : 0 }} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ============================================================
// PEÇAS
// ============================================================
export function MTitulo({ titulo, sub, c }: { titulo: string; sub?: ReactNode; c: MCores }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
      <h1 className="text-[28px] leading-tight font-semibold" style={{ fontFamily: FONTE }}>{titulo}</h1>
      {sub && <p className="text-[13px] mt-1" style={{ color: c.suave }}>{sub}</p>}
      <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(90deg, ${c.roxo}, transparent)` }} />
    </motion.div>
  );
}

export function MCard({ c, children, className = '', style, onClick, i = 0, destaque }: { c: MCores; children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void; i?: number; destaque?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * i }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`m-bloco relative rounded-2xl p-4 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: c.cartao,
        border: `1.5px solid ${destaque ? c.roxo : c.borda}`,
        boxShadow: c.isDark ? '0 0 22px rgba(97,49,201,0.22)' : '0 6px 22px rgba(81,0,189,0.08)',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

/** Faixa lilás com ícone + título (cabeçalho das seções do protótipo) */
export function MFaixa({ c, icone, titulo, sub, extra }: { c: MCores; icone: ReactNode; titulo: string; sub?: string; extra?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 -mx-4 -mt-4 mb-3 px-4 py-3 rounded-t-2xl" style={{ background: c.faixa }}>
      <span style={{ color: c.roxo }}>{icone}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px]">{titulo}</p>
        {sub && <p className="text-[11px]" style={{ color: c.suave }}>{sub}</p>}
      </div>
      {extra}
    </div>
  );
}

export function MLinhaAcao({ c, icone, titulo, texto, to, onClick, i = 0, perigo, trava }: { c: MCores; icone: ReactNode; titulo: string; texto?: string; to?: string; onClick?: () => void; i?: number; perigo?: boolean; trava?: boolean }) {
  const navigate = useNavigate();
  return (
    <MCard c={c} i={i} onClick={onClick ?? (to ? () => navigate(to) : undefined)} className="flex items-center gap-3">
      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: perigo ? 'rgba(239,68,68,0.12)' : c.faixa, color: perigo ? '#f87171' : c.roxo }}>
        {icone}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 font-semibold text-[15px]">
          {titulo}
          {trava && <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: GRAD }}>PRO</span>}
        </span>
        {texto && <span className="block text-[12px] leading-snug mt-0.5" style={{ color: c.suave }}>{texto}</span>}
      </span>
      <ChevronRight className="w-5 h-5 shrink-0" style={{ color: c.roxo }} />
    </MCard>
  );
}

export function MBotao({
  children,
  variante = 'primario',
  carregando,
  className = '',
  ...props
}: { children: ReactNode; variante?: 'primario' | 'secundario' | 'claro' | 'perigo'; carregando?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const c = useMCores();
  const estilos: Record<string, CSSProperties> = {
    primario: { background: GRAD, color: '#fff', boxShadow: '0 8px 24px rgba(97,49,201,0.35)' },
    secundario: { border: `1.5px solid ${c.roxo}`, color: c.roxo, background: 'transparent' },
    claro: { background: '#FFFFFF', color: '#1a1a1a', boxShadow: '0 6px 18px rgba(0,0,0,0.25)' },
    perigo: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1.5px solid rgba(239,68,68,0.5)' },
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      {...(props as any)}
      disabled={props.disabled || carregando}
      className={`w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
      style={{ fontFamily: FONTE, ...estilos[variante] }}
    >
      {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
}

export function MCampo({ c, rotulo, direita, ...props }: { c: MCores; rotulo: string; direita?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium mb-1">{rotulo}</span>
      <span className="relative block">
        <input
          {...props}
          className="w-full h-11 px-3 rounded-lg text-[14px] outline-none focus:ring-2 focus:ring-purple-500/40"
          style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto, paddingRight: direita ? 44 : undefined, ...props.style }}
        />
        {direita && <span className="absolute right-2 top-1/2 -translate-y-1/2">{direita}</span>}
      </span>
    </label>
  );
}

export function MInterruptor({ ligado, onChange, desabilitado }: { ligado: boolean; onChange?: (v: boolean) => void; desabilitado?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      disabled={desabilitado}
      onClick={() => onChange?.(!ligado)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60"
      style={{ background: ligado ? '#6131C9' : 'rgba(120,120,140,0.45)' }}
    >
      <motion.span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow" animate={{ left: ligado ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
    </button>
  );
}

/** Folha que sobe de baixo (confirmações e formulários curtos) */
export function MFolha({ aberta, onFechar, titulo, children }: { aberta: boolean; onFechar: () => void; titulo: string; children: ReactNode }) {
  const c = useMCores();
  return (
    <Camada>
    <AnimatePresence>
      {aberta && (
        <motion.div className="fixed inset-0 z-[70] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onFechar}>
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="w-full rounded-t-3xl p-5 max-h-[88dvh] overflow-y-auto"
            style={{ background: c.isDark ? '#12052a' : '#FFFFFF', color: c.texto, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', fontFamily: FONTE }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: c.borda }} />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{titulo}</h3>
              <button type="button" onClick={onFechar} aria-label="Fechar" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: `1px solid ${c.borda}` }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </Camada>
  );
}

export function MAviso({ tipo, children }: { tipo: 'ok' | 'erro' | 'info'; children: ReactNode }) {
  const cores = {
    ok: ['rgba(34,197,94,0.1)', 'rgba(34,197,94,0.45)', '#22c55e'],
    erro: ['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.45)', '#f87171'],
    info: ['rgba(141,81,255,0.1)', 'rgba(141,81,255,0.45)', '#a97aff'],
  }[tipo];
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-3 text-[13px]" style={{ background: cores[0], border: `1px solid ${cores[1]}`, color: cores[2] }}>
      {children}
    </motion.div>
  );
}

export const fmtQuando = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return mesmoDia ? `Hoje, ${hora}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${hora}`;
};
