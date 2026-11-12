import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertTriangle,
  Brain,
  Users,
  Lock,
  Fingerprint,
  Zap,
  Cpu,
  Shield,
  UsersRound,
  Check,
  ArrowRight,
} from 'lucide-react';

import logoTextoClaro from '../assets/logos/Krypta_de_texto.png';
import logoTextoEscuro from '../assets/logos/Krypta_de_texto2.png';
import iconCadeado from '../assets/logos/icon_cadeado.png';

import spriteRoboAnimado from '../assets/sprites/sprite_robo_animado.png';
import spriteRoboVerificado from '../assets/sprites/sprite_robo_verificado.png';
import spriteRoboInterrogacao from '../assets/sprites/sprite_robo_interrogacao.png';

// ============================================================
// FONTE DOS TÍTULOS — QUICKSAND (ARREDONDADA)
// ============================================================
const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";

// ============================================================
// ESTILOS DE TÍTULOS ADAPTATIVOS
// ============================================================
const LILAC = '#B4A0C8';

const titleBaseStyle = (isDark: boolean): React.CSSProperties =>
  isDark
    ? {
        fontFamily: ROUNDED_FONT,
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: LILAC,
      }
    : {
        fontFamily: ROUNDED_FONT,
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: '#1a1a1a',
      };

const titleAccentStyle = (isDark: boolean): React.CSSProperties =>
  isDark
    ? {
        fontFamily: ROUNDED_FONT,
        fontWeight: 700,
        letterSpacing: '0.01em',
        backgroundImage:
          'linear-gradient(90deg, #7c3aed 0%, #7c3aed 5%, #B4A0C8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
      }
    : {
        fontFamily: ROUNDED_FONT,
        fontWeight: 700,
        letterSpacing: '0.01em',
        color: '#5100BD',
        WebkitTextFillColor: '#5100BD',
      };

// ============================================================
// GERADOR DE TRILHA DE CIRCUITO — FIOS CORROMPIDOS
// ============================================================
interface CircuitTrace {
  id: number;
  path: string;
  nodes: { x: number; y: number }[];
  color: string;
  thickness: number;
  duration: number;
  delayMs: number;
}

function generateCircuitTrace(
  id: number,
  cx: number,
  cy: number,
  isDark: boolean,
  isHovered: boolean
): CircuitTrace {
  const directions = ['up', 'down', 'left', 'right'] as const;
  const dir = directions[Math.floor(Math.random() * 4)];

  const purpleDeep = isDark ? '#6131C9' : '#5100BD';
  const purpleBright = isDark ? '#8d51ff' : '#6131C9';
  const violet = isDark ? '#7F35A3' : '#5d2e8a';
  const lilac = isDark ? '#B4A0C8' : '#6a4e8c';
  const colors = [purpleDeep, purpleBright, violet, lilac];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const minLength = isHovered ? 80 : 30;
  const maxLength = isHovered ? 220 : 80;

  const minSegments = isHovered ? 4 : 2;
  const maxSegments = isHovered ? 8 : 4;

  const minThickness = isHovered ? 0.9 : 0.7;
  const maxThickness = isHovered ? 3.8 : 1.6;

  const minDuration = isHovered ? 900 : 700;
  const maxDuration = isHovered ? 2000 : 1300;

  const axisChangeChance = isHovered ? 0.45 : 0.3;
  const signChangeChance = isHovered ? 0.55 : 0.4;

  const totalLength = minLength + Math.random() * (maxLength - minLength);
  const segments =
    minSegments + Math.floor(Math.random() * (maxSegments - minSegments + 1));

  const startRadius = 60 + Math.random() * 30;
  const startAngle = Math.random() * Math.PI * 2;
  let x = cx + Math.cos(startAngle) * startRadius;
  let y = cy + Math.sin(startAngle) * startRadius;

  const pathPoints: { x: number; y: number }[] = [{ x, y }];
  let path = `M ${x.toFixed(1)} ${y.toFixed(1)}`;

  let currentAxis: 'h' | 'v' = dir === 'left' || dir === 'right' ? 'h' : 'v';
  let currentSign = dir === 'left' || dir === 'up' ? -1 : 1;
  const segLength = totalLength / segments;

  for (let i = 0; i < segments; i++) {
    currentAxis = currentAxis === 'h' ? 'v' : 'h';
    if (Math.random() < axisChangeChance)
      currentAxis = currentAxis === 'h' ? 'v' : 'h';
    if (Math.random() < signChangeChance) currentSign = -currentSign;

    const lenVariation = isHovered
      ? 0.35 + Math.random() * 1.7
      : 0.6 + Math.random() * 0.8;
    const len = segLength * lenVariation;

    if (currentAxis === 'h') x += len * currentSign;
    else y += len * currentSign;

    path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    pathPoints.push({ x, y });
  }

  const nodes: { x: number; y: number }[] = [pathPoints[0]];
  for (let i = 1; i < pathPoints.length; i++) {
    if (i % 2 === 0 || i === pathPoints.length - 1) nodes.push(pathPoints[i]);
  }

  const thickness =
    minThickness + Math.random() * (maxThickness - minThickness);
  const duration =
    minDuration + Math.random() * (maxDuration - minDuration);
  const delayMs = Math.random() * 400;

  return { id, path, nodes, color, thickness, duration, delayMs };
}

// ============================================================
// FUNDO DE CIRCUITOS CORROMPIDOS
// ============================================================
function CircuitBackground({
  isDark,
  isHovered,
}: {
  isDark: boolean;
  isHovered: boolean;
}) {
  const [traces, setTraces] = useState<CircuitTrace[]>([]);
  const [effectiveHover, setEffectiveHover] = useState(isHovered);
  const idRef = useRef(0);
  const hoveredRef = useRef(isHovered);

  useEffect(() => {
    if (isHovered) {
      hoveredRef.current = true;
      setEffectiveHover(true);
    } else {
      const t = setTimeout(() => {
        hoveredRef.current = false;
        setEffectiveHover(false);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [isHovered]);

  useEffect(() => {
    let cancelled = false;

    function spawn() {
      if (cancelled) return;
      const isH = hoveredRef.current;
      const id = idRef.current++;
      const trace = generateCircuitTrace(id, 250, 250, isDark, isH);

      setTraces((prev) => [...prev, trace]);
      setTimeout(() => {
        if (!cancelled) setTraces((prev) => prev.filter((t) => t.id !== id));
      }, trace.duration + trace.delayMs);
    }

    for (let i = 0; i < 6; i++) setTimeout(spawn, i * 180);

    function scheduleNext() {
      if (cancelled) return;
      const isH = hoveredRef.current;
      const delay = isH ? 60 + Math.random() * 110 : 320 + Math.random() * 380;
      setTimeout(() => {
        spawn();
        scheduleNext();
      }, delay);
    }
    setTimeout(scheduleNext, 800);

    return () => {
      cancelled = true;
    };
  }, [isDark]);

  return (
    <svg
      viewBox="0 0 500 500"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <filter id="traceGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <AnimatePresence>
        {traces.map((trace) => (
          <motion.g
            key={trace.id}
            initial={{ opacity: 0 }}
            animate={{
              opacity: effectiveHover
                ? [0, 1, 1, 0.85, 0]
                : [0, 0.6, 0.6, 0.4, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: trace.duration / 1000,
              delay: trace.delayMs / 1000,
              ease: 'easeOut',
              times: [0, 0.2, 0.55, 0.85, 1],
            }}
          >
            <path
              d={trace.path}
              stroke={trace.color}
              strokeWidth={trace.thickness + 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
              filter="url(#traceGlow)"
            />
            <path
              d={trace.path}
              stroke={trace.color}
              strokeWidth={trace.thickness}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />

            {trace.nodes.map((node, i) => (
              <motion.circle
                key={i}
                cx={node.x}
                cy={node.y}
                r={trace.thickness + 1}
                fill={trace.color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.4, 1, 1, 0],
                  opacity: [0, 1, 0.9, 0.9, 0],
                }}
                transition={{
                  duration: trace.duration / 1000,
                  delay: trace.delayMs / 1000,
                  ease: 'easeOut',
                  times: [0, 0.15, 0.3, 0.8, 1],
                }}
                style={{ filter: `drop-shadow(0 0 4px ${trace.color})` }}
              />
            ))}

            <motion.circle
              cx={trace.nodes[0].x}
              cy={trace.nodes[0].y}
              r={trace.thickness * 0.6}
              fill={isDark ? '#FFFFFF' : '#6131C9'}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.8, 1, 0] }}
              transition={{
                duration: trace.duration / 1000,
                delay: trace.delayMs / 1000,
                times: [0, 0.15, 0.5, 1],
              }}
              style={{
                filter: `drop-shadow(0 0 6px ${
                  isDark ? '#FFFFFF' : '#6131C9'
                })`,
              }}
            />
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );
}

// ============================================================
// HERO LOCK — PNG LIMPO + TODOS OS EFEITOS ATRÁS
// ============================================================
function HeroLock({ isDark }: { isDark: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const purple = isDark ? '#8d51ff' : '#5100BD';
  const purpleBright = isDark ? '#a97aff' : '#6131C9';

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative w-full aspect-square max-w-[520px] mx-auto flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="absolute inset-0 rounded-full blur-[100px] pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle, ${purple}66 0%, ${purple}30 40%, transparent 70%)`,
        }}
        animate={{
          opacity: isHovered ? [0.7, 1, 0.7] : [0.5, 0.8, 0.5],
          scale: [1, 1.12, 1],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 z-0">
        <CircuitBackground isDark={isDark} isHovered={isHovered} />
      </div>

      <motion.div
        className="absolute rounded-full border pointer-events-none z-0"
        style={{
          inset: '6%',
          borderColor: isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.25)',
          borderStyle: 'dashed',
          borderWidth: 1,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="absolute rounded-full border pointer-events-none z-0"
        style={{
          inset: '20%',
          borderColor: isDark ? 'rgba(180,160,200,0.25)' : 'rgba(81,0,189,0.18)',
          borderStyle: 'dotted',
          borderWidth: 1,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="absolute z-[5] rounded-full pointer-events-none"
        style={{
          inset: '20%',
          background: isDark
            ? `radial-gradient(circle, ${purple}55 0%, transparent 65%)`
            : `radial-gradient(circle, ${purple}35 0%, transparent 65%)`,
          filter: 'blur(40px)',
        }}
        animate={{
          opacity: isHovered ? [0.7, 1, 0.7] : [0.4, 0.7, 0.4],
          scale: isHovered ? [1, 1.15, 1] : [1, 1.08, 1],
        }}
        transition={{
          duration: isHovered ? 2 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.img
        src={iconCadeado}
        alt="Cofre Krypta"
        className="relative w-[72%] h-[72%] object-contain pointer-events-none select-none z-10"
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: isHovered ? [0, -8, 0] : [0, -5, 0],
        }}
        transition={{
          opacity: { duration: 1, ease: 'easeOut', delay: 0.4 },
          scale: { duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 },
          y: {
            duration: isHovered ? 1.4 : 3.6,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        draggable={false}
        style={{
          filter: isDark
            ? `drop-shadow(0 0 20px ${purple}AA) drop-shadow(0 0 40px ${purple}55) drop-shadow(0 8px 20px rgba(0,0,0,0.5))`
            : `drop-shadow(0 8px 22px rgba(81,0,189,0.35)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))`,
        }}
      />

      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isHovered ? 0 : 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-[0.28em] uppercase pointer-events-none whitespace-nowrap z-20"
            style={{ color: purpleBright }}
          >
            · passe o mouse ·
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// VARIANTS
// ============================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

// ============================================================
// SESSÃO 2 — PROBLEMA
// ============================================================
function ProblemSection({ isDark }: { isDark: boolean }) {
  const problems = [
    {
      icon: AlertTriangle,
      title: 'Ciberataques',
      desc: 'Vazamentos de dados e invasões remotas crescem exponencialmente no Brasil.',
    },
    {
      icon: Brain,
      title: 'Memória',
      desc: 'Usuários reutilizam senhas ou as anotam de forma insegura por não conseguirem memorizar.',
    },
    {
      icon: Users,
      title: 'Inclusão',
      desc: 'Idosos e pessoas com limitações cognitivas encontram barreiras em gerenciadores complexos.',
    },
    {
      icon: Lock,
      title: 'Roubo de Identidade',
      desc: 'Credenciais comprometidas resultam em fraudes financeiras e perda de privacidade.',
    },
  ];

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-20 z-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${
            isDark ? 'rgba(97,49,201,0.08)' : 'rgba(97,49,201,0.06)'
          } 0%, transparent 70%)`,
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl mb-5"
            style={titleBaseStyle(isDark)}
          >
            Por que o <span style={titleAccentStyle(isDark)}>Krypta</span> existe?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto"
            style={{
              color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.82)',
            }}
          >
            A digitalização dos serviços tornou a segurança de dados uma necessidade.
            Mas os métodos atuais falham em proteger os usuários.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch"
        >
          {problems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                variants={cardVariants}
                whileHover={{ y: -6 }}
                className="relative h-full flex flex-col rounded-2xl p-6 border transition-all duration-500 group cursor-default overflow-hidden"
                style={{
                  background: isDark
                    ? 'linear-gradient(160deg, rgba(46,8,83,0.35) 0%, rgba(0,0,0,0.55) 100%)'
                    : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)',
                  borderColor: isDark
                    ? 'rgba(97,49,201,0.25)'
                    : 'rgba(81,0,189,0.22)',
                  boxShadow: isDark ? 'none' : '0 4px 16px rgba(81,0,189,0.08)',
                }}
              >
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ x: '-120%' }}
                  whileInView={{ x: '120%' }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 1.4,
                    delay: 0.3 + idx * 0.14,
                    ease: 'easeInOut',
                  }}
                  style={{
                    background: isDark
                      ? 'linear-gradient(105deg, transparent 40%, rgba(141,81,255,0.15) 50%, transparent 60%)'
                      : 'linear-gradient(105deg, transparent 40%, rgba(81,0,189,0.1) 50%, transparent 60%)',
                  }}
                />

                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: isDark
                      ? '0 0 30px rgba(141,81,255,0.35), inset 0 0 30px rgba(141,81,255,0.08)'
                      : '0 8px 30px rgba(81,0,189,0.2)',
                    border: `1px solid ${
                      isDark ? 'rgba(141,81,255,0.5)' : 'rgba(81,0,189,0.4)'
                    }`,
                  }}
                />

                <motion.div
                  variants={iconVariants}
                  className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110"
                  style={{
                    background: isDark
                      ? 'rgba(97,49,201,0.15)'
                      : 'rgba(81,0,189,0.1)',
                    border: `1px solid ${
                      isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.35)'
                    }`,
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors duration-500"
                    style={{
                      color: isDark ? 'rgb(var(--krypta-lilac))' : '#5100BD',
                    }}
                    strokeWidth={1.8}
                  />
                </motion.div>

                <h3
                  className="relative text-[17px] font-semibold mb-3 tracking-tight"
                  style={{ color: 'rgb(var(--krypta-fg))' }}
                >
                  {item.title}
                </h3>

                <p
                  className="relative text-[13px] leading-relaxed flex-1"
                  style={{
                    color: isDark
                      ? 'rgba(255,255,255,0.72)'
                      : 'rgba(26,26,26,0.8)',
                  }}
                >
                  {item.desc}
                </p>

                <div
                  className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgb(var(--krypta-purple-bright)) 50%, transparent 100%)`,
                    boxShadow: isDark
                      ? '0 0 12px rgba(141,81,255,0.6)'
                      : '0 0 10px rgba(81,0,189,0.4)',
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 3 — TRINDADE CRIPTOGRÁFICA
// ============================================================
function TrinitySection({ isDark }: { isDark: boolean }) {
  const pillars = [
    {
      icon: Lock,
      tag: 'CRIPTOGRAFIA SIMÉTRICA',
      title: 'AES-256-GCM',
      desc: 'O padrão ouro mundial. Seus dados são cifrados com uma chave de 256 bits e validados com um selo de autenticidade (MAC) que detecta qualquer alteração.',
    },
    {
      icon: Fingerprint,
      tag: 'IDENTIDADE 1:1',
      title: 'Ed25519',
      desc: 'Cada hardware gera um par de chaves único. A chave privada nunca sai do chip, criando um vínculo inquebrável com sua conta.',
    },
    {
      icon: Zap,
      tag: 'DERIVAÇÃO DE CHAVE',
      title: 'Argon2id',
      desc: 'Transforma sua senha mestra em uma chave robusta. Ataques de força bruta por GPU/ASIC se tornam economicamente inviáveis.',
    },
  ];

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-20 z-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${
            isDark ? 'rgba(97,49,201,0.1)' : 'rgba(97,49,201,0.07)'
          } 0%, transparent 65%)`,
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl mb-5"
            style={titleBaseStyle(isDark)}
          >
            A Trindade <span style={titleAccentStyle(isDark)}>Criptográfica</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto"
            style={{
              color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.82)',
            }}
          >
            Três pilares criptográficos trabalhando em conjunto para garantir
            confidencialidade, autenticidade e proteção contra acessos não autorizados.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch"
        >
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                variants={cardVariants}
                whileHover={{ y: -6 }}
                className="relative h-full flex flex-col rounded-2xl p-7 border transition-all duration-500 group cursor-default overflow-hidden"
                style={{
                  background: isDark
                    ? 'linear-gradient(160deg, rgba(46,8,83,0.35) 0%, rgba(0,0,0,0.55) 100%)'
                    : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)',
                  borderColor: isDark
                    ? 'rgba(97,49,201,0.25)'
                    : 'rgba(81,0,189,0.22)',
                  boxShadow: isDark ? 'none' : '0 4px 16px rgba(81,0,189,0.08)',
                }}
              >
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ x: '-120%' }}
                  whileInView={{ x: '120%' }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 1.4,
                    delay: 0.3 + idx * 0.14,
                    ease: 'easeInOut',
                  }}
                  style={{
                    background: isDark
                      ? 'linear-gradient(105deg, transparent 40%, rgba(141,81,255,0.15) 50%, transparent 60%)'
                      : 'linear-gradient(105deg, transparent 40%, rgba(81,0,189,0.1) 50%, transparent 60%)',
                  }}
                />

                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: isDark
                      ? '0 0 30px rgba(141,81,255,0.35), inset 0 0 30px rgba(141,81,255,0.08)'
                      : '0 8px 30px rgba(81,0,189,0.2)',
                    border: `1px solid ${
                      isDark ? 'rgba(141,81,255,0.5)' : 'rgba(81,0,189,0.4)'
                    }`,
                  }}
                />

                <motion.div
                  variants={iconVariants}
                  className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-7 transition-all duration-500 group-hover:scale-110"
                  style={{
                    background: isDark
                      ? 'rgba(97,49,201,0.15)'
                      : 'rgba(81,0,189,0.1)',
                    border: `1px solid ${
                      isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.35)'
                    }`,
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors duration-500"
                    style={{
                      color: isDark ? 'rgb(var(--krypta-lilac))' : '#5100BD',
                    }}
                    strokeWidth={1.8}
                  />
                </motion.div>

                <div
                  className="relative text-[10px] font-mono tracking-[0.22em] uppercase mb-3 font-semibold"
                  style={{
                    color: isDark
                      ? 'rgba(180,160,200,0.85)'
                      : 'rgba(81,0,189,0.85)',
                  }}
                >
                  {item.tag}
                </div>

                <h3
                  className="relative text-[22px] font-display font-bold mb-4 tracking-tight"
                  style={{
                    color: 'rgb(var(--krypta-fg))',
                    textShadow: isDark
                      ? '0 0 20px rgba(141,81,255,0.25)'
                      : 'none',
                  }}
                >
                  {item.title}
                </h3>

                <p
                  className="relative text-[13px] leading-relaxed flex-1"
                  style={{
                    color: isDark
                      ? 'rgba(255,255,255,0.72)'
                      : 'rgba(26,26,26,0.8)',
                  }}
                >
                  {item.desc}
                </p>

                <div
                  className="absolute bottom-0 left-7 right-7 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgb(var(--krypta-purple-bright)) 50%, transparent 100%)`,
                    boxShadow: isDark
                      ? '0 0 12px rgba(141,81,255,0.6)'
                      : '0 0 10px rgba(81,0,189,0.4)',
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 4 — FEITO PARA TODOS
// ============================================================
interface AudienceItemProps {
  icon: typeof Users;
  label: string;
  isDark: boolean;
  delay: number;
}

function AudienceItem({ icon: Icon, label, isDark, delay }: AudienceItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex flex-col items-center gap-4 cursor-default group"
    >
      <div className="relative w-20 h-20 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `1px solid ${
              isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.35)'
            }`,
          }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeOut',
            delay: delay * 2,
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `1px solid ${
              isDark ? 'rgba(141,81,255,0.25)' : 'rgba(81,0,189,0.25)'
            }`,
          }}
          animate={{ scale: [1, 1.55, 1], opacity: [0.3, 0, 0.3] }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: delay * 2 + 1.5,
          }}
        />
        <motion.div
          className="absolute inset-2 rounded-full blur-xl pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(141,81,255,0.35) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(81,0,189,0.25) 0%, transparent 70%)',
          }}
          animate={{
            opacity: isHovered ? 0.9 : [0.35, 0.55, 0.35],
            scale: isHovered ? 1.15 : [1, 1.08, 1],
          }}
          transition={{
            duration: isHovered ? 0.4 : 3.5,
            repeat: isHovered ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500"
          style={{
            background: isDark
              ? 'linear-gradient(160deg, rgba(46,8,83,0.55) 0%, rgba(0,0,0,0.65) 100%)'
              : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)',
            border: `1px solid ${
              isDark ? 'rgba(141,81,255,0.4)' : 'rgba(81,0,189,0.4)'
            }`,
            boxShadow: isDark ? 'none' : '0 4px 12px rgba(81,0,189,0.12)',
          }}
          animate={{ scale: isHovered ? 1.15 : 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: isDark
                ? '0 0 22px rgba(141,81,255,0.6), inset 0 0 15px rgba(141,81,255,0.15)'
                : '0 6px 22px rgba(81,0,189,0.35)',
            }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            animate={{
              rotate: isHovered ? [0, -8, 8, 0] : 0,
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <Icon
              className="w-7 h-7 transition-colors duration-500"
              style={{
                color: isHovered
                  ? isDark
                    ? 'rgb(var(--krypta-lilac))'
                    : '#5100BD'
                  : isDark
                    ? 'rgba(180,160,200,0.9)'
                    : 'rgba(81,0,189,0.9)',
              }}
              strokeWidth={1.7}
            />
          </motion.div>
        </motion.div>
      </div>

      <motion.span
        className="text-[13px] font-medium text-center whitespace-nowrap"
        style={{ color: 'rgb(var(--krypta-fg))' }}
        animate={{ opacity: isHovered ? 1 : 0.9 }}
        transition={{ duration: 0.3 }}
      >
        {label}
      </motion.span>

      <motion.div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgb(var(--krypta-purple-bright)) 50%, transparent 100%)`,
          boxShadow: isDark
            ? '0 0 10px rgba(141,81,255,0.7)'
            : '0 0 10px rgba(81,0,189,0.5)',
        }}
        animate={{ width: isHovered ? '70%' : '0%', opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </motion.div>
  );
}

function AudienceSection({ isDark }: { isDark: boolean }) {
  const audiences = [
    { icon: Users, label: 'Usuários online' },
    { icon: Cpu, label: 'Empresas' },
    { icon: Brain, label: 'Estudantes' },
    { icon: Shield, label: 'Profissionais' },
    { icon: UsersRound, label: 'Famílias' },
    { icon: Lock, label: 'Quem busca segurança' },
  ];

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-20 z-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${
            isDark ? 'rgba(97,49,201,0.08)' : 'rgba(97,49,201,0.06)'
          } 0%, transparent 70%)`,
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl mb-5"
            style={titleBaseStyle(isDark)}
          >
            Feito para <span style={titleAccentStyle(isDark)}>todos</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto"
            style={{
              color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.82)',
            }}
          >
            Segurança não deveria ser complicada. O Krypta foi pensado para tornar a
            proteção das suas credenciais simples, acessível e intuitiva para todos.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-6">
          {audiences.map((item, idx) => (
            <AudienceItem
              key={idx}
              icon={item.icon}
              label={item.label}
              isDark={isDark}
              delay={0.2 + idx * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 5 — EXPLORE O SISTEMA
// ============================================================
interface ExploreCardProps {
  sprite: string;
  title: string;
  desc: string;
  href: string;
  isDark: boolean;
  delay: number;
}

function ExploreCard({ sprite, title, desc, href, isDark, delay }: ExploreCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isExternal = href === '#';

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative h-full flex flex-col rounded-2xl p-7 border cursor-pointer overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(160deg, rgba(46,8,83,0.35) 0%, rgba(0,0,0,0.55) 100%)'
          : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)',
        borderColor: isDark ? 'rgba(97,49,201,0.25)' : 'rgba(81,0,189,0.22)',
        boxShadow: isDark ? 'none' : '0 4px 16px rgba(81,0,189,0.08)',
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        transition:
          'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s ease, box-shadow 0.4s ease',
      }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ x: '-120%' }}
        whileInView={{ x: '120%' }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, delay: delay + 0.3, ease: 'easeInOut' }}
        style={{
          background: isDark
            ? 'linear-gradient(105deg, transparent 40%, rgba(141,81,255,0.15) 50%, transparent 60%)'
            : 'linear-gradient(105deg, transparent 40%, rgba(81,0,189,0.1) 50%, transparent 60%)',
        }}
      />

      <div
        className="absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: isDark
            ? '0 0 30px rgba(141,81,255,0.35), inset 0 0 30px rgba(141,81,255,0.08)'
            : '0 8px 30px rgba(81,0,189,0.2)',
          border: `1px solid ${
            isDark ? 'rgba(141,81,255,0.5)' : 'rgba(81,0,189,0.4)'
          }`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      <div className="relative w-16 h-16 mb-6 flex items-center justify-center shrink-0">
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(141,81,255,0.5) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(81,0,189,0.3) 0%, transparent 70%)',
            filter: 'blur(6px)',
          }}
          animate={{
            scale: isHovered ? [1, 1.25, 1.1] : [1, 1.15, 1],
            opacity: isHovered ? [0.7, 1, 0.9] : [0.4, 0.75, 0.4],
          }}
          transition={{
            duration: isHovered ? 1.5 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div
          className="relative w-14 h-14 rounded-xl flex items-center justify-center"
          style={{
            background: isDark ? 'rgba(20,5,45,0.85)' : 'rgba(255,255,255,1)',
            border: `1px solid ${
              isDark ? 'rgba(141,81,255,0.4)' : 'rgba(81,0,189,0.35)'
            }`,
            boxShadow: isHovered
              ? isDark
                ? '0 0 22px rgba(141,81,255,0.6), inset 0 0 12px rgba(141,81,255,0.15)'
                : '0 6px 22px rgba(81,0,189,0.3)'
              : isDark
                ? '0 0 12px rgba(141,81,255,0.2)'
                : '0 2px 8px rgba(81,0,189,0.12)',
            transition: 'box-shadow 0.5s ease',
          }}
        >
          <motion.img
            src={sprite}
            alt={title}
            className="w-9 h-9 object-contain select-none pointer-events-none"
            animate={
              isHovered
                ? { y: [0, -3, 0, 3, 0], rotate: [0, -8, 8, -4, 0], scale: 1.15 }
                : { y: [0, -2, 0], scale: 1 }
            }
            transition={
              isHovered
                ? { duration: 0.7, ease: 'easeInOut' }
                : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
            }
            draggable={false}
          />
        </div>
      </div>

      <h3
        className="relative text-[20px] font-medium mb-3 tracking-tight leading-[1.3]"
        style={{ color: 'rgb(var(--krypta-fg))' }}
      >
        {title}
      </h3>

      <p
        className="relative text-[13px] leading-relaxed flex-1 mb-6"
        style={{
          color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.8)',
        }}
      >
        {desc}
      </p>

      <div
        className="relative mt-auto flex items-center gap-2 text-[14px] font-medium"
        style={{
          color: isHovered
            ? 'rgb(var(--krypta-purple-bright))'
            : isDark
              ? 'rgba(255,255,255,0.6)'
              : 'rgba(26,26,26,0.75)',
          transition: 'color 0.4s ease',
        }}
      >
        <span>Acessar</span>
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ x: isHovered ? 6 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </motion.svg>
      </div>

      <div
        className="absolute bottom-0 left-7 right-7 h-[2px] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgb(var(--krypta-purple-bright)) 50%, transparent 100%)`,
          boxShadow: isDark
            ? '0 0 12px rgba(141,81,255,0.6)'
            : '0 0 10px rgba(81,0,189,0.4)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />
    </motion.div>
  );

  if (isExternal) {
    return <div className="h-full">{content}</div>;
  }

  return (
    <Link to={href} className="block h-full">
      {content}
    </Link>
  );
}

function ExploreSection({
  isDark,
  isLoggedIn,
}: {
  isDark: boolean;
  isLoggedIn: boolean;
}) {
  const allCards = [
    {
      sprite: spriteRoboAnimado,
      title: 'Comece a proteger o que é seu.',
      desc: 'Crie sua conta e dê o primeiro passo para uma vida digital mais segura.',
      href: '/register',
    },
    {
      sprite: spriteRoboVerificado,
      title: 'Tenha a segurança ao seu alcance.',
      desc: 'Acesse os serviços Krypta e descubra uma nova forma de proteger seus acessos.',
      href: '/services',
    },
    {
      sprite: spriteRoboInterrogacao,
      title: 'Precisa de ajuda? Estamos aqui.',
      desc: 'Fale com nossa equipe ou com o chat de suporte e tire suas dúvidas sempre que precisar.',
      href: '#',
    },
  ];

  // Usuário logado NÃO vê o card de "Crie sua conta"
  const cards = isLoggedIn
    ? allCards.filter((c) => c.href !== '/register')
    : allCards;

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-20 z-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${
            isDark ? 'rgba(97,49,201,0.1)' : 'rgba(97,49,201,0.07)'
          } 0%, transparent 65%)`,
        }}
      />
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl mb-5"
            style={titleBaseStyle(isDark)}
          >
            Explore o <span style={titleAccentStyle(isDark)}>Sistema</span>
          </motion.h2>
        </div>
        <div
          className={`grid grid-cols-1 ${
            isLoggedIn ? 'md:grid-cols-2' : 'md:grid-cols-3'
          } gap-5 items-stretch`}
        >
          {cards.map((card, idx) => (
            <ExploreCard
              key={idx}
              sprite={card.sprite}
              title={card.title}
              desc={card.desc}
              href={card.href}
              isDark={isDark}
              delay={0.2 + idx * 0.14}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 6 — O QUE TORNA O KRYPTA ÚNICO
// ============================================================
interface UniquenessItemProps {
  label: string;
  isDark: boolean;
  delay: number;
}

function UniquenessItem({ label, isDark, delay }: UniquenessItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center gap-4 rounded-2xl px-5 py-4 border cursor-default overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(160deg, rgba(46,8,83,0.4) 0%, rgba(0,0,0,0.6) 100%)'
          : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)',
        borderColor: isDark
          ? isHovered
            ? 'rgba(141,81,255,0.6)'
            : 'rgba(97,49,201,0.28)'
          : isHovered
            ? 'rgba(81,0,189,0.5)'
            : 'rgba(81,0,189,0.22)',
        boxShadow: isDark
          ? isHovered
            ? '0 0 24px rgba(141,81,255,0.3), inset 0 0 20px rgba(141,81,255,0.06)'
            : 'none'
          : isHovered
            ? '0 6px 24px rgba(81,0,189,0.18)'
            : '0 2px 8px rgba(81,0,189,0.06)',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition:
          'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
      }}
    >
      <div
        className="relative shrink-0 w-8 h-8 rounded-full flex items-center justify-center border"
        style={{
          background: isDark
            ? isHovered
              ? 'rgba(141,81,255,0.25)'
              : 'rgba(97,49,201,0.18)'
            : isHovered
              ? 'rgba(81,0,189,0.15)'
              : 'rgba(81,0,189,0.08)',
          borderColor: isDark
            ? isHovered
              ? 'rgba(141,81,255,0.7)'
              : 'rgba(141,81,255,0.4)'
            : isHovered
              ? 'rgba(81,0,189,0.6)'
              : 'rgba(81,0,189,0.35)',
          transition: 'all 0.4s ease',
        }}
      >
        <Check
          className="w-4 h-4 transition-colors duration-400"
          style={{
            color: isDark
              ? isHovered
                ? '#FFFFFF'
                : 'rgb(var(--krypta-lilac))'
              : '#5100BD',
          }}
          strokeWidth={2.5}
        />
      </div>

      <span
        className="relative text-[14px] md:text-[15px] font-medium leading-snug"
        style={{
          color: isDark
            ? isHovered
              ? '#FFFFFF'
              : 'rgba(255,255,255,0.85)'
            : isHovered
              ? '#2e0853'
              : 'rgba(26,26,26,0.85)',
          transition: 'color 0.35s ease',
        }}
      >
        {label}
      </span>

      <div
        className="absolute right-0 top-0 bottom-0 w-[2px] rounded-r-2xl transition-opacity duration-400"
        style={{
          background: `linear-gradient(180deg, transparent 0%, rgb(var(--krypta-purple-bright)) 50%, transparent 100%)`,
          boxShadow: isDark
            ? '0 0 10px rgba(141,81,255,0.6)'
            : '0 0 8px rgba(81,0,189,0.4)',
          opacity: isHovered ? 1 : 0,
        }}
      />
    </motion.div>
  );
}

function UniquenessSection({ isDark }: { isDark: boolean }) {
  const features = [
    'Autenticação em múltiplos fatores',
    'Comunicação NFC por proximidade',
    'Criptografia AES-256 das credenciais',
    'Dispositivo físico portátil',
    'Backup criptografado em nuvem',
    'Bloqueio instantâneo ao desconectar',
  ];

  return (
    <section className="relative w-full py-24 px-6 md:px-12 lg:px-20 z-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${
            isDark ? 'rgba(97,49,201,0.08)' : 'rgba(97,49,201,0.06)'
          } 0%, transparent 70%)`,
        }}
      />

      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-5xl lg:text-6xl mb-5"
            style={titleBaseStyle(isDark)}
          >
            O que torna o <span style={titleAccentStyle(isDark)}>Krypta único</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, idx) => (
            <UniquenessItem
              key={idx}
              label={feature}
              isDark={isDark}
              delay={0.15 + idx * 0.08}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 7 — CTA FINAL
// ============================================================
function CTASection({ isDark }: { isDark: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative w-full py-20 px-6 md:px-12 lg:px-20 z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative rounded-3xl overflow-hidden border"
          style={{
            background: isDark
              ? 'linear-gradient(160deg, rgba(46,8,83,0.55) 0%, rgba(0,0,0,0.7) 100%)'
              : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(230,220,245,0.95) 100%)',
            borderColor: isDark ? 'rgba(141,81,255,0.4)' : 'rgba(81,0,189,0.3)',
            boxShadow: isDark
              ? '0 0 50px rgba(97,49,201,0.35), inset 0 0 40px rgba(141,81,255,0.08)'
              : '0 10px 50px rgba(81,0,189,0.15)',
          }}
        >
          <motion.div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
            style={{
              background: isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.2)',
            }}
            animate={{ opacity: isHovered ? 1 : 0.6, scale: isHovered ? 1.15 : 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
            style={{
              background: isDark ? 'rgba(127,53,163,0.25)' : 'rgba(97,49,201,0.15)',
            }}
            animate={{ opacity: isHovered ? 1 : 0.6, scale: isHovered ? 1.15 : 1 }}
            transition={{ duration: 0.6 }}
          />

          <div className="relative p-8 md:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-10">
            <motion.div
              className="relative shrink-0"
              animate={{ y: isHovered ? [0, -4, 0, 4, 0] : [0, -3, 0] }}
              transition={{
                duration: isHovered ? 0.9 : 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div
                className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl flex items-center justify-center"
                style={{
                  background: isDark
                    ? 'linear-gradient(160deg, rgba(20,5,45,0.9) 0%, rgba(0,0,0,0.85) 100%)'
                    : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)',
                  border: `1px solid ${
                    isDark ? 'rgba(141,81,255,0.5)' : 'rgba(81,0,189,0.4)'
                  }`,
                  boxShadow: isDark
                    ? '0 0 30px rgba(141,81,255,0.5), inset 0 0 20px rgba(141,81,255,0.15)'
                    : '0 8px 30px rgba(81,0,189,0.2)',
                }}
              >
                <img
                  src={spriteRoboAnimado}
                  alt="Krypta"
                  className="w-16 h-16 md:w-20 md:h-20 object-contain select-none pointer-events-none"
                  draggable={false}
                />
              </div>
            </motion.div>

            <div className="flex-1 text-center lg:text-left">
              <h3
                className="text-2xl md:text-3xl lg:text-4xl mb-3 leading-tight"
                style={titleBaseStyle(isDark)}
              >
                Faça seu cadastro no{' '}
                <span style={titleAccentStyle(isDark)}>Krypta</span>
              </h3>
              <p
                className="text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:mx-0"
                style={{
                  color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.8)',
                }}
              >
                Crie sua conta administrativa, adquira seu hardware e comece a
                proteger suas credenciais com criptografia AES-256 e autenticação
                por fator de posse física.
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
              <Link
                to="/register"
                className="group relative flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[15px] text-white overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                  boxShadow: isDark
                    ? '0 0 24px rgba(141,81,255,0.55)'
                    : '0 6px 20px rgba(81,0,189,0.35)',
                }}
              >
                <span className="relative z-10">Criar Conta</span>
                <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #8d51ff 0%, #B4A0C8 100%)',
                  }}
                />
              </Link>

              <Link
                to="/login"
                className="flex items-center justify-center px-7 py-3.5 rounded-xl font-bold text-[15px] border transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  borderColor: isDark
                    ? 'rgba(141,81,255,0.5)'
                    : 'rgba(81,0,189,0.4)',
                  color: 'rgb(var(--krypta-fg))',
                  background: isDark
                    ? 'rgba(0,0,0,0.3)'
                    : 'rgba(255,255,255,0.6)',
                }}
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// WELCOME
// ============================================================
export function Welcome() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const logoTextoAtual = isDark ? logoTextoClaro : logoTextoEscuro;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500"
      style={{
        backgroundColor: 'rgb(var(--krypta-bg))',
        color: 'rgb(var(--krypta-fg))',
      }}
    >
      <Navbar />

      {/* SESSÃO 1 — HERO */}
      <div className="relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20 pointer-events-none" />
        <div
          className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none"
          style={{ background: 'rgb(var(--krypta-purple) / 0.25)' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none"
          style={{ background: 'rgb(var(--krypta-cyan) / 0.15)' }}
        />

        <main className="relative z-10 pt-32 pb-16 px-6 md:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center min-h-[68vh]">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="hidden lg:block absolute -bottom-6 -left-6 w-10 h-10 pointer-events-none"
              >
                <div
                  className="absolute bottom-0 left-0 w-full h-[1.5px]"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(26,26,26,0.85)',
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 w-[1.5px] h-full"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(26,26,26,0.85)',
                  }}
                />
              </motion.div>

              <div className="space-y-1 mb-6">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.15]"
                  style={{ color: 'rgb(var(--krypta-fg))', fontWeight: 300 }}
                >
                  Sua identidade.
                </motion.h1>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                  className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.15]"
                  style={{ color: 'rgb(var(--krypta-fg))', fontWeight: 300 }}
                >
                  Suas chaves.
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="flex items-center gap-5 pt-2"
                >
                  <span
                    className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.15]"
                    style={{ color: 'rgb(var(--krypta-fg))', fontWeight: 300 }}
                  >
                    Seu
                  </span>
                  <img
                    src={logoTextoAtual}
                    alt="KRYPTA"
                    className="h-7 md:h-9 lg:h-11 w-auto object-contain select-none"
                    draggable={false}
                    style={{
                      transform: 'translateY(-2px)',
                      filter: isDark
                        ? 'drop-shadow(0 0 16px rgba(141,81,255,0.5))'
                        : 'drop-shadow(0 1px 2px rgba(81,0,189,0.15))',
                    }}
                  />
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="text-sm md:text-[15px] leading-relaxed max-w-md"
                style={{
                  color: isDark
                    ? 'rgba(255,255,255,0.7)'
                    : 'rgba(26,26,26,0.78)',
                }}
              >
                Suas senhas não precisam depender da sua memória. Proteja suas
                credenciais e sua identidade digital em um{' '}
                <span
                  style={{
                    color: 'rgb(var(--krypta-purple-bright))',
                    fontWeight: 500,
                  }}
                >
                  cofre físico, portátil e seguro
                </span>
                . Tenha suas chaves sempre com você e mantenha o controle sobre seus
                acessos, onde quer que esteja.
              </motion.p>
            </div>

            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="hidden lg:block absolute -top-6 -right-6 w-10 h-10 pointer-events-none z-20"
              >
                <div
                  className="absolute top-0 right-0 w-full h-[1.5px]"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(26,26,26,0.85)',
                  }}
                />
                <div
                  className="absolute top-0 right-0 w-[1.5px] h-full"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(26,26,26,0.85)',
                  }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="w-full"
              >
                <HeroLock isDark={isDark} />
              </motion.div>
            </div>
          </div>
        </main>
      </div>

      <ProblemSection isDark={isDark} />
      <TrinitySection isDark={isDark} />
      <AudienceSection isDark={isDark} />
      <ExploreSection isDark={isDark} isLoggedIn={!!user} />
      <UniquenessSection isDark={isDark} />

      {/* CTA final apenas para usuários NÃO logados */}
      {!user && <CTASection isDark={isDark} />}

      <Footer />
    </div>
  );
}