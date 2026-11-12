import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Zap, ArrowLeft, Settings, ShieldCheck, Lock } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { PlanAPI } from '../services/api';
import { PLANS, type Plan, type PlanTier } from '../types';

import spriteRoboEncolhido from '../assets/sprites/sprite_robo_encolhido.png';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const PURPLE = '#8d51ff';
const PURPLE_BRIGHT = '#a97aff';

const PLAN_ICONS: Record<PlanTier, React.ElementType> = {
  free: Zap,
  essential: Crown,
  advanced: Sparkles,
  max: ShieldCheck,
  custom: Settings,
};

const PLAN_COLORS: Record<PlanTier, string> = {
  free: '#B4A0C8',
  essential: '#8d51ff',
  advanced: '#7c3aed',
  max: '#a97aff',
  custom: '#c4a6ff',
};

// Pontinhos decorativos fixos (evita Math.random a cada render)
const PARTICLES = [
  { x: '6%', y: '18%', s: 4, d: 0 },
  { x: '14%', y: '62%', s: 3, d: 1.2 },
  { x: '28%', y: '34%', s: 5, d: 0.6 },
  { x: '44%', y: '12%', s: 3, d: 2 },
  { x: '58%', y: '70%', s: 4, d: 0.3 },
  { x: '72%', y: '28%', s: 3, d: 1.6 },
  { x: '86%', y: '56%', s: 5, d: 0.9 },
  { x: '94%', y: '14%', s: 3, d: 2.4 },
  { x: '36%', y: '88%', s: 4, d: 1.8 },
  { x: '80%', y: '90%', s: 3, d: 0.4 },
];

export function Plans() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>(PLANS);

  useEffect(() => {
    PlanAPI.list()
      .then((res) => {
        if (res && res.length > 0) setPlans(res as Plan[]);
      })
      .catch((err) => {
        console.warn('Falha ao carregar planos da API, usando fallback local.', err);
      });
  }, []);

  // Clicar em um plano leva para a seção de planos da página de serviços
  const handleSelect = (tier: PlanTier) => {
    navigate('/services#planos', { state: { tier } });
  };

  const purple = isDark ? PURPLE : '#5100BD';
  const bright = isDark ? PURPLE_BRIGHT : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.75)';
  const corner = `1.5px solid ${bright}`;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: 'rgb(var(--krypta-fg))' }}
    >
      <Navbar />

      {/* ============ FUNDO DECORADO ============ */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <div
          className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full blur-[180px]"
          style={{ background: `${purple}40` }}
        />
        <div
          className="absolute top-[35%] right-[-12%] w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: `${purple}33` }}
        />
        <div
          className="absolute bottom-[-18%] left-[25%] w-[700px] h-[500px] rounded-full blur-[200px]"
          style={{ background: `${purple}30` }}
        />

        {/* Anéis concêntricos atrás do título */}
        <svg
          className="absolute top-24 left-1/2 -translate-x-1/2 opacity-40"
          width="900"
          height="900"
          viewBox="0 0 900 900"
          fill="none"
        >
          {[160, 260, 360, 440].map((r, i) => (
            <circle
              key={r}
              cx="450"
              cy="450"
              r={r}
              stroke={bright}
              strokeWidth="0.8"
              strokeDasharray={i % 2 ? '3 9' : '1 0'}
              opacity={0.35 - i * 0.05}
            />
          ))}
        </svg>

        {/* Partículas */}
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.s,
              height: p.s,
              background: bright,
              boxShadow: `0 0 12px ${bright}`,
            }}
            animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -14, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: p.d, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Robô decorativo inferior esquerdo (espelhado) */}
      <motion.img
        src={spriteRoboEncolhido}
        alt=""
        draggable={false}
        className="hidden lg:block absolute bottom-24 left-4 w-36 pointer-events-none select-none"
        style={{
          transform: 'scaleX(-1)',
          opacity: isDark ? 0.55 : 0.8,
          filter: `drop-shadow(0 0 24px ${purple}88)`,
        }}
        animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <main className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-32 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-100 opacity-70"
          style={{ color: fg, fontFamily: ROUNDED_FONT }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* ============ HERO ============ */}
        <div className="relative text-center mb-16 max-w-3xl mx-auto">
          <motion.img
            src={spriteRoboEncolhido}
            alt="Mascote do Krypta"
            draggable={false}
            className="hidden md:block absolute -right-44 -top-10 w-52 select-none pointer-events-none"
            style={{ filter: `drop-shadow(0 0 30px ${purple}AA)` }}
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs"
              style={{
                background: isDark ? 'rgba(141,81,255,0.12)' : 'rgba(81,0,189,0.08)',
                border: `1px solid ${isDark ? 'rgba(141,81,255,0.4)' : 'rgba(81,0,189,0.25)'}`,
                color: bright,
                fontFamily: ROUNDED_FONT,
                fontWeight: 600,
              }}
            >
              <Lock className="w-3.5 h-3.5" /> Planos Krypta
            </div>

            <h1
              className="text-5xl md:text-6xl mb-4 tracking-tight"
              style={{
                fontFamily: ROUNDED_FONT,
                fontWeight: 700,
                ...(isDark
                  ? {
                      backgroundImage:
                        'linear-gradient(90deg, #B4A0C8 0%, #B4A0C8 25%, #7c3aed 50%, #B4A0C8 75%, #B4A0C8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }
                  : { color: '#5100BD' }),
              }}
            >
              Escolha sua Proteção
            </h1>

            <p className="text-base md:text-lg" style={{ color: muted, fontFamily: ROUNDED_FONT }}>
              Todos os planos incluem criptografia AES-256 e autenticação física via hardware.
            </p>

            {user && (
              <div
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: isDark ? 'rgba(97,49,201,0.15)' : 'rgba(81,0,189,0.08)',
                  border: `1px solid ${isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.25)'}`,
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: bright }} />
                <span className="text-xs" style={{ color: muted }}>Plano atual:</span>
                <span className="text-xs font-bold uppercase" style={{ color: fg }}>
                  {user.plan === 'free' ? 'Gratuito' : user.plan}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ============ GRID: TODOS NA MESMA FILEIRA ============ */}
        {/* Em telas menores a fileira rola na horizontal, mantendo os 5 cards alinhados */}
        <div className="overflow-x-auto pb-6 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="grid grid-cols-5 gap-4 xl:gap-5 min-w-[1150px] xl:min-w-0">
            {plans.map((plan, idx) => {
              const tier = plan.tier as PlanTier;
              const isCurrent = user?.plan === tier;
              const color = PLAN_COLORS[tier] || PURPLE;
              const Icon = PLAN_ICONS[tier] || Zap;

              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 + idx * 0.1 }}
                  whileHover={{ y: -6 }}
                  onClick={() => handleSelect(tier)}
                  className="relative rounded-2xl p-5 xl:p-6 flex flex-col cursor-pointer"
                  style={{
                    background: isDark
                      ? 'linear-gradient(160deg, rgba(30,6,60,0.92) 0%, rgba(0,0,0,0.88) 100%)'
                      : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.97) 100%)',
                    border: `1px solid ${
                      plan.highlighted || isCurrent
                        ? bright
                        : isDark
                          ? 'rgba(141,81,255,0.35)'
                          : 'rgba(81,0,189,0.25)'
                    }`,
                    boxShadow: plan.highlighted
                      ? isDark
                        ? `0 0 50px ${purple}66, inset 0 0 30px ${purple}18`
                        : '0 14px 40px rgba(81,0,189,0.25)'
                      : isDark
                        ? `0 0 22px ${purple}22`
                        : '0 6px 22px rgba(81,0,189,0.1)',
                  }}
                >
                  {/* Cantos estilo "hub" */}
                  <span className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderLeft: corner }} />
                  <span className="absolute top-0 right-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderRight: corner }} />
                  <span className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderLeft: corner }} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderRight: corner }} />

                  {plan.highlighted && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(90deg, #5100BD 0%, #8d51ff 100%)',
                        boxShadow: `0 0 18px ${purple}99`,
                        fontFamily: ROUNDED_FONT,
                      }}
                    >
                      MAIS POPULAR
                    </div>
                  )}

                  {/* Ícone */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `${color}22`,
                      border: `1px solid ${color}66`,
                      boxShadow: `0 0 18px ${color}33`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>

                  <h3
                    className="text-lg xl:text-xl mb-1 leading-tight"
                    style={{ color: fg, fontFamily: ROUNDED_FONT, fontWeight: 700 }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className="text-[11.5px] leading-snug mb-4 min-h-[48px]"
                    style={{ color: muted, fontFamily: ROUNDED_FONT }}
                  >
                    {plan.description}
                  </p>

                  <div
                    className="flex items-end gap-1 pb-4 mb-4"
                    style={{ borderBottom: `1px solid ${isDark ? 'rgba(141,81,255,0.2)' : 'rgba(81,0,189,0.12)'}` }}
                  >
                    <span
                      className="text-3xl leading-none"
                      style={{ color: fg, fontFamily: ROUNDED_FONT, fontWeight: 700 }}
                    >
                      {plan.priceLabel}
                    </span>
                    <span className="text-[11px] mb-0.5" style={{ color: muted }}>
                      {plan.period}
                    </span>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[11.5px] leading-snug"
                        style={{ color: muted, fontFamily: ROUNDED_FONT }}
                      >
                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: bright }} strokeWidth={2.5} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(tier);
                    }}
                    className="w-full py-3 rounded-lg font-bold text-[13px] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                    style={
                      plan.highlighted || isCurrent
                        ? {
                            background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                            color: '#fff',
                            boxShadow: isDark ? `0 0 22px ${purple}88` : '0 6px 18px rgba(81,0,189,0.35)',
                            fontFamily: ROUNDED_FONT,
                          }
                        : {
                            background: 'transparent',
                            color: bright,
                            border: `1px solid ${bright}`,
                            fontFamily: ROUNDED_FONT,
                          }
                    }
                  >
                    {isCurrent ? 'Plano Atual' : 'Ver plano'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}