import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  ArrowLeft,
  Lock,
  SearchX,
  ShieldOff,
  Hourglass,
  MoonStar,
  Gauge,
  ServerCrash,
  LogIn,
  LifeBuoy,
  RotateCw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

import spriteX from '../assets/sprites/sprite_robo_x.png';
import spriteInterrogacao from '../assets/sprites/sprite_robo_interrogacao.png';
import spriteDormindo from '../assets/sprites/sprite_robo_dormindo.png';
// ATENÇÃO: este arquivo não aparece na pasta sprites do print. Adicione-o ou troque o import.
import spriteExclamacao from '../assets/sprites/sprite_robo_exclamacao.png';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";

interface ErrorPageProps {
  code?: number;
  title?: string;
  description?: string;
}

type Effect = 'barrier' | 'radar' | 'shards' | 'time' | 'sleep' | 'alert' | 'glitch';

interface Preset {
  title: string;
  description: string;
  sprite: string;
  Icon: React.ElementType;
  effect: Effect;
  /** cor de destaque (sempre dentro da paleta roxa do Krypta) */
  accent: string;
  accentLight: string;
  primary?: { to: string; label: string; Icon: React.ElementType };
}

const PRESETS: Record<number, Preset> = {
  403: {
    title: 'Acesso Negado',
    description: 'Você não tem permissão para acessar este recurso.',
    sprite: spriteX,
    Icon: Lock,
    effect: 'barrier',
    accent: '#7F35A3',
    accentLight: '#c084fc',
  },
  404: {
    title: 'Página Não Encontrada',
    description: 'O recurso que você procura não existe ou foi movido.',
    sprite: spriteInterrogacao,
    Icon: SearchX,
    effect: 'radar',
    accent: '#8d51ff',
    accentLight: '#a97aff',
  },
  410: {
    title: 'Conta Revogada',
    description: 'Esta conta foi permanentemente revogada.',
    sprite: spriteExclamacao,
    Icon: ShieldOff,
    effect: 'shards',
    accent: '#5100BD',
    accentLight: '#9b6bff',
    primary: { to: '/contact', label: 'Falar com o suporte', Icon: LifeBuoy },
  },
  419: {
    title: 'Sessão Expirada',
    description: 'Sua sessão expirou. Faça login novamente.',
    sprite: spriteExclamacao,
    Icon: Hourglass,
    effect: 'time',
    accent: '#6131C9',
    accentLight: '#B4A0C8',
    primary: { to: '/login', label: 'Fazer login', Icon: LogIn },
  },
  423: {
    title: 'Conta Suspensa',
    description: 'Sua conta está suspensa. Contate o suporte.',
    sprite: spriteDormindo,
    Icon: MoonStar,
    effect: 'sleep',
    accent: '#4c2a9a',
    accentLight: '#B4A0C8',
    primary: { to: '/contact', label: 'Contatar o suporte', Icon: LifeBuoy },
  },
  429: {
    title: 'Muitas Tentativas',
    description: 'Você excedeu o limite. Aguarde alguns minutos.',
    sprite: spriteExclamacao,
    Icon: Gauge,
    effect: 'alert',
    accent: '#a855f7',
    accentLight: '#d8b4fe',
  },
  500: {
    title: 'Erro Interno',
    description: 'Algo deu errado. Tente novamente em instantes.',
    sprite: spriteX,
    Icon: ServerCrash,
    effect: 'glitch',
    accent: '#8d51ff',
    accentLight: '#c4a6ff',
  },
};

/* ============================================================
   EFEITOS DE FUNDO — um por tipo de erro
   ============================================================ */

function BarrierEffect({ c }: { c: string }) {
  // faixas diagonais de "bloqueio" + feixe de varredura
  return (
    <>
      <div
        className="absolute inset-x-0 top-0 h-24 opacity-30"
        style={{ background: `repeating-linear-gradient(-45deg, ${c} 0 14px, transparent 14px 34px)` }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-24 opacity-30"
        style={{ background: `repeating-linear-gradient(-45deg, ${c} 0 14px, transparent 14px 34px)` }}
      />
      <motion.div
        className="absolute inset-x-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)`, boxShadow: `0 0 24px ${c}` }}
        animate={{ top: ['15%', '85%', '15%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  );
}

function RadarEffect({ c }: { c: string }) {
  const marks = [
    { x: '12%', y: '22%', d: 0 },
    { x: '82%', y: '18%', d: 0.8 },
    { x: '20%', y: '72%', d: 1.6 },
    { x: '76%', y: '70%', d: 2.4 },
    { x: '50%', y: '10%', d: 3.2 },
  ];
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{ width: 300, height: 300, marginLeft: -150, marginTop: -150, border: `1.5px solid ${c}` }}
          animate={{ scale: [0.4, 3.2], opacity: [0.6, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: i * 1.6, ease: 'easeOut' }}
        />
      ))}
      {marks.map((m, i) => (
        <motion.span
          key={i}
          className="absolute text-4xl font-bold select-none"
          style={{ left: m.x, top: m.y, color: c, fontFamily: ROUNDED_FONT, textShadow: `0 0 18px ${c}` }}
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.6, 0.15], rotate: [-8, 8, -8] }}
          transition={{ duration: 5, repeat: Infinity, delay: m.d, ease: 'easeInOut' }}
        >
          ?
        </motion.span>
      ))}
    </>
  );
}

function ShardsEffect({ c }: { c: string }) {
  // hexágonos quebrados que se soltam e se apagam
  const shards = Array.from({ length: 9 }, (_, i) => ({
    x: 8 + ((i * 11) % 84),
    y: 10 + ((i * 23) % 70),
    s: 26 + ((i * 13) % 30),
    r: (i * 37) % 60,
    d: i * 0.5,
  }));
  return (
    <>
      {shards.map((s, i) => (
        <motion.svg
          key={i}
          className="absolute"
          width={s.s}
          height={s.s}
          viewBox="0 0 40 40"
          style={{ left: `${s.x}%`, top: `${s.y}%`, rotate: s.r }}
          animate={{ y: [0, 40], opacity: [0, 0.7, 0], rotate: [s.r, s.r + 40] }}
          transition={{ duration: 6, repeat: Infinity, delay: s.d, ease: 'easeIn' }}
        >
          <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="14 6" />
        </motion.svg>
      ))}
      <motion.div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 50%, transparent 30%, ${c}22 100%)` }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </>
  );
}

function TimeEffect({ c }: { c: string }) {
  // areia caindo + anel tracejado girando
  return (
    <>
      <motion.svg
        className="absolute top-1/2 left-1/2 opacity-40"
        width="640"
        height="640"
        viewBox="0 0 640 640"
        style={{ marginLeft: -320, marginTop: -320 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="320" cy="320" r="300" fill="none" stroke={c} strokeWidth="1" strokeDasharray="2 14" />
        <circle cx="320" cy="320" r="230" fill="none" stroke={c} strokeWidth="1" strokeDasharray="30 12" opacity="0.6" />
      </motion.svg>
      {Array.from({ length: 16 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: `${6 + ((i * 6) % 90)}%`, top: '-2%', width: 3, height: 3, background: c, boxShadow: `0 0 8px ${c}` }}
          animate={{ y: ['0vh', '105vh'], opacity: [0, 0.9, 0] }}
          transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: i * 0.45, ease: 'linear' }}
        />
      ))}
    </>
  );
}

function SleepEffect({ c }: { c: string }) {
  // "Z z z" subindo + luz suave que "respira"
  return (
    <>
      <motion.div
        className="absolute top-1/2 left-1/2 rounded-full blur-[120px]"
        style={{ width: 520, height: 520, marginLeft: -260, marginTop: -260, background: `${c}55` }}
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute font-bold select-none"
          style={{
            left: `${60 + i * 5}%`,
            top: '42%',
            fontSize: 22 + i * 8,
            color: c,
            fontFamily: ROUNDED_FONT,
            textShadow: `0 0 16px ${c}`,
          }}
          animate={{ y: [0, -140], x: [0, 30], opacity: [0, 0.9, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: i * 1.1, ease: 'easeOut' }}
        >
          Z
        </motion.span>
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={`s${i}`}
          className="absolute rounded-full"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 80}%`, width: 2, height: 2, background: '#fff' }}
          animate={{ opacity: [0.1, 0.8, 0.1] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </>
  );
}

function AlertEffect({ c }: { c: string }) {
  // anéis de pulso rápidos + bordas "piscando"
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{ width: 240, height: 240, marginLeft: -120, marginTop: -120, border: `2px solid ${c}` }}
          animate={{ scale: [0.5, 3], opacity: [0.7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: `inset 0 0 120px ${c}66` }}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </>
  );
}

function GlitchEffect({ c }: { c: string }) {
  // scanlines + barras de glitch horizontais
  return (
    <>
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: `repeating-linear-gradient(0deg, transparent 0 3px, ${c}33 3px 4px)` }}
      />
      {[18, 42, 66, 84].map((t, i) => (
        <motion.div
          key={t}
          className="absolute h-[6px]"
          style={{ top: `${t}%`, left: 0, background: c, opacity: 0.35, boxShadow: `0 0 18px ${c}` }}
          animate={{ width: ['0%', '45%', '0%'], x: ['-10%', '60%', '110%'], opacity: [0, 0.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut', repeatDelay: 1.5 }}
        />
      ))}
    </>
  );
}

function BackgroundEffect({ effect, accent, light }: { effect: Effect; accent: string; light: string }) {
  switch (effect) {
    case 'barrier': return <BarrierEffect c={accent} />;
    case 'radar': return <RadarEffect c={light} />;
    case 'shards': return <ShardsEffect c={light} />;
    case 'time': return <TimeEffect c={light} />;
    case 'sleep': return <SleepEffect c={light} />;
    case 'alert': return <AlertEffect c={light} />;
    case 'glitch': return <GlitchEffect c={light} />;
  }
}

/* ============================================================
   ANIMAÇÃO DO ROBÔ — cada erro tem o seu "jeito"
   ============================================================ */
const SPRITE_MOTION: Record<Effect, any> = {
  barrier: { animate: { x: [0, -8, 8, -6, 6, 0] }, transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2.4 } },
  radar: { animate: { y: [0, -14, 0], rotate: [-5, 5, -5] }, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
  shards: { animate: { opacity: [1, 0.55, 1, 0.8, 1], y: [0, 4, 0] }, transition: { duration: 3.2, repeat: Infinity } },
  time: { animate: { y: [0, -8, 0], rotate: [0, -3, 3, 0] }, transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } },
  sleep: { animate: { y: [0, 6, 0], scale: [1, 1.03, 1] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } },
  alert: { animate: { scale: [1, 1.08, 1], y: [0, -6, 0] }, transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } },
  glitch: { animate: { x: [0, -4, 5, -3, 0], opacity: [1, 0.85, 1, 0.9, 1] }, transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1.8 } },
};

/* ============================================================
   PÁGINA
   ============================================================ */
export function ErrorPage({ code = 500, title, description }: ErrorPageProps) {
  const { isDark } = useTheme();
  const location = useLocation();
  const stateCode = (location.state as any)?.code ?? code;
  const preset = PRESETS[stateCode] ?? PRESETS[500];
  const finalTitle = title ?? preset.title;
  const finalDesc = description ?? preset.description;
  const { Icon, effect, accent, accentLight } = preset;

  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.78)';
  const tone = isDark ? accentLight : accent;
  const corner = `1.5px solid ${tone}`;

  // Contagem regressiva para "Muitas tentativas"
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    if (stateCode !== 429) return;
    setSeconds(60);
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [stateCode]);

  const showRetry = stateCode === 500 || (stateCode === 429 && seconds === 0);
  const PrimaryIcon = preset.primary?.Icon ?? Home;

  return (
    <div
      className="min-h-screen flex items-center justify-center relative p-6 overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: 'rgb(var(--krypta-fg))' }}
    >
      {/* Base comum */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-20 pointer-events-none" />
      <div
        className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none"
        style={{ background: `${accent}55` }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none"
        style={{ background: 'rgba(141,81,255,0.25)' }}
      />

      {/* Efeito exclusivo deste erro */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <BackgroundEffect effect={effect} accent={accent} light={tone} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl"
      >
        {/* Código gigante atrás do card */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-24 md:-top-32 select-none pointer-events-none text-[9rem] md:text-[13rem] leading-none"
          style={{
            fontFamily: ROUNDED_FONT,
            fontWeight: 800,
            color: 'transparent',
            WebkitTextStroke: `2px ${tone}`,
            opacity: 0.35,
            filter: `drop-shadow(0 0 30px ${accent})`,
          }}
        >
          {stateCode}
        </div>

        <div
          className="relative rounded-2xl backdrop-blur-xl text-center px-6 md:px-10 pt-24 pb-10 mt-16"
          style={{
            background: isDark
              ? 'linear-gradient(160deg, rgba(30,6,60,0.88) 0%, rgba(0,0,0,0.88) 100%)'
              : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(240,237,248,0.95) 100%)',
            border: `1px solid ${tone}88`,
            boxShadow: isDark ? `0 0 60px ${accent}55, inset 0 0 30px ${accent}18` : `0 20px 60px ${accent}33`,
          }}
        >
          <span className="absolute top-0 left-0 w-3.5 h-3.5 pointer-events-none" style={{ borderTop: corner, borderLeft: corner }} />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 pointer-events-none" style={{ borderTop: corner, borderRight: corner }} />
          <span className="absolute bottom-0 left-0 w-3.5 h-3.5 pointer-events-none" style={{ borderBottom: corner, borderLeft: corner }} />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none" style={{ borderBottom: corner, borderRight: corner }} />

          {/* Robô saindo do topo do card */}
          {/* O wrapper centraliza; o framer-motion anima só a imagem dentro dele */}
          <div className="absolute inset-x-0 -top-24 flex justify-center pointer-events-none">
            <motion.img
              src={preset.sprite}
              alt=""
              draggable={false}
              className="w-40 md:w-44 select-none"
              style={{ filter: `drop-shadow(0 0 28px ${accent}CC)` }}
              {...SPRITE_MOTION[effect]}
            />
          </div>

          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 text-xs"
            style={{
              background: `${accent}22`,
              border: `1px solid ${tone}66`,
              color: tone,
              fontFamily: ROUNDED_FONT,
              fontWeight: 700,
            }}
          >
            <Icon className="w-3.5 h-3.5" /> Erro {stateCode}
          </div>

          <h1
            className="text-3xl md:text-4xl mb-3"
            style={{ fontFamily: ROUNDED_FONT, fontWeight: 700, color: fg }}
          >
            {finalTitle}
          </h1>
          <p className="leading-relaxed mb-6" style={{ color: muted, fontFamily: ROUNDED_FONT }}>
            {finalDesc}
          </p>

          {/* Extra do 429: contagem regressiva */}
          {stateCode === 429 && (
            <div className="mb-6">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${accent}33` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, #5100BD, ${tone})`, width: `${((60 - seconds) / 60) * 100}%` }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: muted, fontFamily: ROUNDED_FONT }}>
                {seconds > 0 ? `Tente novamente em ${seconds}s` : 'Pronto! Você já pode tentar de novo.'}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showRetry && (
              <button
                onClick={() => window.location.reload()}
                className="px-7 py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                  boxShadow: `0 0 24px ${accent}88`,
                  fontFamily: ROUNDED_FONT,
                }}
              >
                <RotateCw className="w-4 h-4" /> Tentar novamente
              </button>
            )}

            {!showRetry && (
              <Link
                to={preset.primary?.to ?? '/'}
                className="px-7 py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                  boxShadow: `0 0 24px ${accent}88`,
                  fontFamily: ROUNDED_FONT,
                }}
              >
                <PrimaryIcon className="w-4 h-4" /> {preset.primary?.label ?? 'Voltar ao Início'}
              </Link>
            )}

            {(preset.primary || showRetry) && (
              <Link
                to="/"
                className="px-7 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.03]"
                style={{ border: `1px solid ${tone}`, color: tone, fontFamily: ROUNDED_FONT }}
              >
                <Home className="w-4 h-4" /> Início
              </Link>
            )}

            {!preset.primary && !showRetry && (
              <button
                onClick={() => window.history.back()}
                className="px-7 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.03]"
                style={{ border: `1px solid ${tone}`, color: tone, fontFamily: ROUNDED_FONT }}
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}