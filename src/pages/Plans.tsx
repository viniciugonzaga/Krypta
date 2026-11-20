import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Zap, ArrowLeft, Lock } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { PlanAPI } from '../services/api';
import { normalizePlan, getPlanLabel, type PlanId } from '../utils/plan';

import spriteRoboEncolhido from '../assets/sprites/sprite_robo_encolhido.png';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const PURPLE = '#8d51ff';
const PURPLE_BRIGHT = '#a97aff';

// Tipo local dos planos (só Free e Pro)
interface PlanItem {
  tier: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

// Fallback local — igual ao que o backend devolve em GET /plans
const FALLBACK_PLANS: PlanItem[] = [
  {
    tier: 'free',
    name: 'Krypta Free',
    price: 0,
    priceLabel: 'R$0',
    period: 'por mês',
    description: 'Para quem quer começar a proteger suas credenciais sem precisar do dispositivo físico.',
    features: [
      'Cofre digital de credenciais',
      'Senha Mestre',
      'Criptografia',
      'Gerenciamento básico de senhas',
      'Aplicativo Krypta',
      'Acesso pelo software',
      'Capacidade limitada de armazenamento',
    ],
  },
  {
    tier: 'pro',
    name: 'Krypta Pro',
    price: 25,
    priceLabel: 'R$25',
    period: 'por mês',
    description: 'Todos os recursos do Krypta em um único plano: proteção máxima, autenticação múltipla e controle total.',
    features: [
      'Cofre de credenciais',
      'Senha Mestre',
      'Criptografia AES-256-GCM',
      'Gerenciamento de credenciais',
      'Aplicativo Krypta',
      'Acesso pelo software',
      'Autenticação multifator',
      'Chave de segurança física',
      'Alertas de acesso',
      'Proteção reforçada para credenciais',
      'Bloqueio remoto',
      'Verificações rigorosas de acesso',
      'Recursos de emergência',
      'Herança Digital',
      'Escolha dos métodos de autenticação',
      'Nível de proteção personalizável',
    ],
    highlighted: true,
  },
];

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free: Zap,
  pro: Crown,
};

const PLAN_COLORS: Record<PlanId, string> = {
  free: '#B4A0C8',
  pro: '#8d51ff',
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
  const [plans, setPlans] = useState<PlanItem[]>(FALLBACK_PLANS);

  useEffect(() => {
    PlanAPI.list()
      .then((res: any) => {
        if (!Array.isArray(res) || res.length === 0) return;
        // Aceita só free/pro vindos da API (ignora tiers antigos)
        const valid = (res as PlanItem[]).filter((p) => p.tier === 'free' || p.tier === 'pro');
        if (valid.length > 0) setPlans(valid);
      })
      .catch((err) => {
        console.warn('Falha ao carregar planos da API, usando fallback local.', err);
      });
  }, []);

  const currentPlan = user ? normalizePlan((user as any).plan) : null;

  // Plano atual ou troca para o Free → gerenciar a assinatura no perfil.
  // Assinar o Pro → seção de planos (mensal/anual) que leva ao checkout.
  const handleSelect = (tier: PlanId) => {
    if (currentPlan === tier || (tier === 'free' && currentPlan === 'pro')) {
      navigate('/profile#assinatura');
      return;
    }
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
              Comece grátis ou desbloqueie todos os recursos do Krypta com o plano Pro.
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
                  {getPlanLabel((user as any).plan)}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ============ GRID: FREE + PRO ============ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8 max-w-4xl mx-auto pt-4">
          {plans.map((plan, idx) => {
            const tier = plan.tier;
            const isCurrent = currentPlan === tier;
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
                className="relative rounded-2xl p-6 xl:p-7 flex flex-col cursor-pointer"
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
                    TODOS OS RECURSOS
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
                  className="text-xl xl:text-2xl mb-1 leading-tight"
                  style={{ color: fg, fontFamily: ROUNDED_FONT, fontWeight: 700 }}
                >
                  {plan.name}
                </h3>
                <p
                  className="text-[12.5px] leading-snug mb-4 min-h-[40px]"
                  style={{ color: muted, fontFamily: ROUNDED_FONT }}
                >
                  {plan.description}
                </p>

                <div
                  className="flex items-end gap-1 pb-4 mb-4"
                  style={{ borderBottom: `1px solid ${isDark ? 'rgba(141,81,255,0.2)' : 'rgba(81,0,189,0.12)'}` }}
                >
                  <span
                    className="text-4xl leading-none"
                    style={{ color: fg, fontFamily: ROUNDED_FONT, fontWeight: 700 }}
                  >
                    {plan.priceLabel}
                  </span>
                  <span className="text-[12px] mb-0.5" style={{ color: muted }}>
                    {plan.period}
                  </span>
                </div>

                <ul
                  className={`mb-6 flex-1 gap-y-2.5 gap-x-4 ${
                    plan.features.length > 8 ? 'grid grid-cols-1 sm:grid-cols-2' : 'flex flex-col'
                  }`}
                >
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[12px] leading-snug"
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
                  {isCurrent
                    ? 'Plano atual · Gerenciar'
                    : tier === 'free' && currentPlan === 'pro'
                      ? 'Cancelar o Pro'
                      : 'Assinar o Pro'}
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}