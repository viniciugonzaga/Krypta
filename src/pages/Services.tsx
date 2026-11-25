import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { normalizePlan } from '../utils/plan';
import {
  Check,
  X,
  Cpu,
  Lock,
  CircuitBoard,
  Smartphone,
  Headphones,
  Layers,
} from 'lucide-react';

import spriteRoboX from '../assets/cody/cody_x.webp';
import spriteRoboVerificado from '../assets/cody/cody_verificado.webp';
import spriteRoboAnimado from '../assets/cody/cody_animado.webp';

import logoTextoClaro from '../assets/Logos/Krypta_de_texto.png';
import logoTextoEscuro from '../assets/Logos/Krypta_de_texto2.png';

// ============================================================
// FONTE E CORES
// ============================================================
const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const PURPLE = '#8d51ff';
const PURPLE_BRIGHT = '#a97aff';
const WHITE = '#FFFFFF';

const titleHeroStyle = (isDark: boolean): React.CSSProperties => ({
  fontFamily: ROUNDED_FONT,
  fontWeight: 600,
  letterSpacing: '0.01em',
  color: isDark ? WHITE : '#1a1a1a',
});

const titleGradientStyle = (isDark: boolean): React.CSSProperties =>
  isDark
    ? {
        fontFamily: ROUNDED_FONT,
        fontWeight: 700,
        letterSpacing: '0.01em',
        backgroundImage:
          'linear-gradient(90deg, #B4A0C8 0%, #B4A0C8 25%, #7c3aed 50%, #B4A0C8 75%, #B4A0C8 100%)',
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

const cardTitleStyle = (isDark: boolean): React.CSSProperties => ({
  fontFamily: ROUNDED_FONT,
  fontWeight: 700,
  letterSpacing: '0.01em',
  color: isDark ? WHITE : '#1a1a1a',
});

// ============================================================
// SESSÃO 1 — HERO
// ============================================================
function ServicesHero({ isDark }: { isDark: boolean }) {
  const bracketLen = 65;
  const bracketColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(81,0,189,0.6)';

  return (
    <section className="relative w-full pt-40 pb-20 px-6 md:px-12 lg:px-20 z-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${
            isDark ? 'rgba(97,49,201,0.12)' : 'rgba(97,49,201,0.06)'
          } 0%, transparent 60%)`,
        }}
      />

      <div className="max-w-6xl mx-auto relative px-10 md:px-16 py-14">
        <div
          className="absolute top-0 right-0 pointer-events-none"
          style={{ width: bracketLen, height: bracketLen }}
        >
          <div
            className="absolute top-0 right-0 h-[1.5px]"
            style={{ width: bracketLen, backgroundColor: bracketColor }}
          />
          <div
            className="absolute top-0 right-0 w-[1.5px]"
            style={{ height: bracketLen, backgroundColor: bracketColor }}
          />
        </div>

        <div
          className="absolute bottom-0 left-0 pointer-events-none"
          style={{ width: bracketLen, height: bracketLen }}
        >
          <div
            className="absolute bottom-0 left-0 h-[1.5px]"
            style={{ width: bracketLen, backgroundColor: bracketColor }}
          />
          <div
            className="absolute bottom-0 left-0 w-[1.5px]"
            style={{ height: bracketLen, backgroundColor: bracketColor }}
          />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight"
          style={titleHeroStyle(isDark)}
        >
          Tudo o que você
          <br />
          precisa para proteger
          <br />
          sua identidade digital.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-base md:text-lg leading-relaxed mt-8 max-w-2xl"
          style={{
            color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(26,26,26,0.82)',
            fontFamily: ROUNDED_FONT,
          }}
        >
          O Krypta reúne recursos de segurança, autenticação e gerenciamento de
          credenciais em uma experiência simples, portátil e desenvolvida para
          manter você no controle.
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 2 — SUPERANDO OS DESAFIOS
// ============================================================
function OvercomingSection({ isDark }: { isDark: boolean }) {
  const separator = isDark
    ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)'
    : 'linear-gradient(90deg, transparent 0%, rgba(81,0,189,0.45) 50%, transparent 100%)';

  return (
    <section className="relative w-full pt-10 pb-16 px-6 md:px-12 lg:px-20 z-10">
      <div
        className="max-w-6xl mx-auto mb-12 h-[1.5px]"
        style={{ background: separator }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <motion.h2
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight"
            style={titleGradientStyle(isDark)}
          >
            Superando os
            <br />
            desafios da
            <br />
            segurança digital
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="pt-3"
          >
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{
                color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(26,26,26,0.85)',
                fontFamily: ROUNDED_FONT,
              }}
            >
              Senhas esquecidas, credenciais espalhadas e acessos desprotegidos
              tornam a segurança digital cada vez mais difícil de gerenciar no
              dia a dia. Muitas pessoas acabam reutilizando a mesma senha em
              vários serviços, anotando informações em locais inseguros ou até
              perdendo o acesso às próprias contas por não conseguirem lembrar
              das credenciais. O Krypta combina um cofre digital portátil,
              autenticação por hardware e criptografia de ponta para proteger
              suas credenciais e sua identidade, mantendo tudo sob seu controle,
              de forma simples, prática e segura para todos.
            </p>
          </motion.div>
        </div>
      </div>

      <div
        className="max-w-6xl mx-auto mt-14 h-[1.5px]"
        style={{ background: separator }}
      />
    </section>
  );
}

// ============================================================
// SESSÃO 3 — DESAFIOS / SOLUÇÕES / BENEFÍCIOS
// ============================================================
function ProblemSolutionSection({ isDark }: { isDark: boolean }) {
  const challenges = [
    'Senhas esquecidas podem dificultar o acesso às suas contas.',
    'Credenciais espalhadas dificultam a organização e proteção dos seus dados.',
    'Perder um dispositivo pode comprometer o acesso às suas informações.',
    'Credenciais comprometidas podem permitir acessos não autorizados.',
    'Muitas credenciais tornam difícil manter senhas fortes e únicas.',
  ];

  const solutions = [
    'Leva suas credenciais protegidas em um cofre digital portátil.',
    'Combina senha, hardware e autenticação para reforçar sua segurança.',
    'Mantém suas credenciais organizadas e sob seu controle.',
    'Bloqueia acessos não autorizados com mecanismos de identidade e segurança.',
    'Segurança não apenas para você, mas para toda a sua família.',
  ];

  const benefits = [
    'Tenha mais controle sobre suas credenciais.',
    'Acesse suas informações com mais praticidade.',
    'Reduza os riscos de acessos não autorizados.',
    'Proteja sua identidade em diferentes situações.',
    'Simplifique o gerenciamento das suas senhas.',
  ];

  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(46,8,83,0.4) 0%, rgba(0,0,0,0.6) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)';

  const cardBorder = isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.22)';
  const textColor = isDark ? 'rgba(255,255,255,0.78)' : 'rgba(26,26,26,0.85)';
  const iconColor = isDark ? PURPLE : '#5100BD';

  return (
    <section className="relative w-full pt-4 pb-16 px-6 md:px-12 lg:px-20 z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative grid grid-cols-1 lg:grid-cols-3 rounded-2xl overflow-hidden border"
          style={{
            background: cardBg,
            borderColor: cardBorder,
            boxShadow: isDark
              ? '0 0 40px rgba(97,49,201,0.2), inset 0 0 30px rgba(141,81,255,0.04)'
              : '0 8px 30px rgba(81,0,189,0.1)',
          }}
        >
          <div
            className="relative p-9 lg:p-8 flex flex-col"
            style={{
              borderRight: `1px solid ${
                isDark ? 'rgba(141,81,255,0.18)' : 'rgba(81,0,189,0.12)'
              }`,
            }}
          >
            <h3
              className="text-[18px] md:text-[19px] font-bold mb-6 leading-snug tracking-tight"
              style={cardTitleStyle(isDark)}
            >
              Desafios comuns na proteção de credenciais
            </h3>
            <ul className="space-y-3.5">
              {challenges.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[13.5px] leading-relaxed"
                  style={{ color: textColor, fontFamily: ROUNDED_FONT }}
                >
                  <X className="w-4 h-4 shrink-0 mt-0.5" style={{ color: iconColor }} strokeWidth={2.4} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex-1 min-h-[100px]" />
            <div className="absolute bottom-4 left-4 pointer-events-none">
              <img
                src={spriteRoboX}
                alt=""
                className="w-20 h-20 object-contain"
                style={{
                  opacity: isDark ? 0.95 : 1,
                  filter: isDark
                    ? 'drop-shadow(0 0 18px rgba(141,81,255,0.55))'
                    : 'drop-shadow(0 3px 8px rgba(81,0,189,0.3))',
                }}
                draggable={false}
              />
            </div>
          </div>

          <div
            className="relative p-9 lg:p-8 flex flex-col"
            style={{
              borderRight: `1px solid ${
                isDark ? 'rgba(141,81,255,0.18)' : 'rgba(81,0,189,0.12)'
              }`,
            }}
          >
            <h3
              className="text-[18px] md:text-[19px] font-bold mb-6 leading-snug tracking-tight"
              style={cardTitleStyle(isDark)}
            >
              Como o Krypta resolve isso
            </h3>
            <ul className="space-y-3.5">
              {solutions.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[13.5px] leading-relaxed"
                  style={{ color: textColor, fontFamily: ROUNDED_FONT }}
                >
                  <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: iconColor }} strokeWidth={2.6} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex-1 min-h-[100px]" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
              <img
                src={spriteRoboVerificado}
                alt=""
                className="w-20 h-20 object-contain"
                style={{
                  opacity: isDark ? 0.95 : 1,
                  filter: isDark
                    ? 'drop-shadow(0 0 18px rgba(141,81,255,0.55))'
                    : 'drop-shadow(0 3px 8px rgba(81,0,189,0.3))',
                }}
                draggable={false}
              />
            </div>
          </div>

          <div className="relative p-9 lg:p-8 flex flex-col">
            <h3
              className="text-[18px] md:text-[19px] font-bold mb-6 leading-snug tracking-tight"
              style={cardTitleStyle(isDark)}
            >
              Uma segurança completa feita para você
            </h3>
            <ul className="space-y-3.5">
              {benefits.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[13.5px] leading-relaxed"
                  style={{ color: textColor, fontFamily: ROUNDED_FONT }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
                    style={{ backgroundColor: iconColor }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex-1 min-h-[100px]" />
            <div className="absolute bottom-4 right-4 pointer-events-none">
              <img
                src={spriteRoboAnimado}
                alt=""
                className="w-20 h-20 object-contain"
                style={{
                  opacity: isDark ? 0.95 : 1,
                  filter: isDark
                    ? 'drop-shadow(0 0 18px rgba(141,81,255,0.55))'
                    : 'drop-shadow(0 3px 8px rgba(81,0,189,0.3))',
                }}
                draggable={false}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 4 — POR QUE O KRYPTA EXISTE?
// ============================================================
function WhyKryptaSection({ isDark }: { isDark: boolean }) {
  return (
    <section className="relative w-full py-16 px-6 md:px-12 lg:px-20 z-10">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl lg:text-6xl mb-5 tracking-tight"
          style={titleGradientStyle(isDark)}
        >
          Por que o Krypta existe?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-base md:text-lg leading-relaxed max-w-3xl mx-auto"
          style={{
            color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(26,26,26,0.82)',
            fontFamily: ROUNDED_FONT,
          }}
        >
          O Krypta foi desenvolvido para ir além de um simples gerenciador de
          senhas. Ele combina software, hardware e criptografia para criar uma
          camada adicional de proteção para suas credenciais e identidade digital.
        </motion.p>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 5 — KRYPTA HUB
// ============================================================
const HUB_CX = 400;
const HUB_CY = 250;
const INNER_R = 95;
const SAT_RX = 290;
const SAT_RY = 195;
const VB_W = 800;
const VB_H = 500;

function hexVertices(cx: number, cy: number, r: number) {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const deg = 90 - i * 60;
    const rad = (deg * Math.PI) / 180;
    verts.push({
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    });
  }
  return verts;
}

const toPath = (verts: { x: number; y: number }[]) =>
  'M ' + verts.map((v) => `${v.x.toFixed(1)} ${v.y.toFixed(1)}`).join(' L ') + ' Z';

interface HubSatellite {
  id: string;
  deg: number;
  Icon: React.ElementType;
  title: string;
  subtitle: string;
  flip?: boolean;
}

const HUB_SATELLITES: HubSatellite[] = [
  { id: 'acessos', deg: 90, Icon: Layers, title: 'ACESSOS', subtitle: 'Planos de diferentes necessidades' },
  { id: 'cripto', deg: 30, Icon: Lock, title: 'CRIPTOGRAFIA', subtitle: 'Proteção dos dados', flip: true },
  { id: 'mobile', deg: -30, Icon: Smartphone, title: 'MOBILE', subtitle: 'Acesso prático', flip: true },
  { id: 'hardware', deg: -90, Icon: CircuitBoard, title: 'HARDWARE', subtitle: 'Posse física do dispositivo' },
  { id: 'suporte', deg: -150, Icon: Headphones, title: 'SUPORTE', subtitle: 'Recursos de equipe e bot' },
  { id: 'software', deg: 150, Icon: Cpu, title: 'SOFTWARE', subtitle: 'Gerenciamento e controle' },
];

interface HubCardViewProps {
  Icon: React.ElementType;
  title: string;
  subtitle: string;
  isDark: boolean;
  flip?: boolean;
  className?: string;
}

function HubCardView({ Icon, title, subtitle, isDark, flip, className = '' }: HubCardViewProps) {
  const purpleBright = isDark ? PURPLE_BRIGHT : '#6131C9';
  const textColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.7)';
  const cardBorder = isDark ? 'rgba(141,81,255,0.55)' : 'rgba(81,0,189,0.4)';

  const solidBg = isDark ? '#0a0214' : '#ffffff';
  const gradient = isDark
    ? 'linear-gradient(160deg, rgba(30,6,60,0.95) 0%, rgba(0,0,0,0.92) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.98) 100%)';

  const corner = `1.5px solid ${purpleBright}`;

  return (
    <div
      className={`relative rounded-xl px-4 py-3 ${className}`}
      style={{
        backgroundColor: solidBg,
        backgroundImage: gradient,
        border: `1px solid ${cardBorder}`,
        boxShadow: isDark
          ? `0 0 24px ${PURPLE}55, inset 0 0 20px ${PURPLE}15`
          : `0 8px 24px rgba(81,0,189,0.15)`,
      }}
    >
      <span className="absolute top-0 left-0 w-2.5 h-2.5 pointer-events-none" style={{ borderTop: corner, borderLeft: corner }} />
      <span className="absolute top-0 right-0 w-2.5 h-2.5 pointer-events-none" style={{ borderTop: corner, borderRight: corner }} />
      <span className="absolute bottom-0 left-0 w-2.5 h-2.5 pointer-events-none" style={{ borderBottom: corner, borderLeft: corner }} />
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 pointer-events-none" style={{ borderBottom: corner, borderRight: corner }} />

      <span
        className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
        style={{ background: purpleBright, boxShadow: `0 0 8px ${purpleBright}` }}
      />

      <div className={`flex items-start gap-3 ${flip ? 'flex-row-reverse text-right' : ''}`}>
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: isDark ? 'rgba(141,81,255,0.15)' : 'rgba(81,0,189,0.08)',
            border: `1px solid ${cardBorder}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: purpleBright }} strokeWidth={1.8} />
        </div>

        <div className={`flex-1 min-w-0 ${flip ? 'flex flex-col items-end' : ''}`}>
          <p
            className="text-[10px] font-bold tracking-[0.25em] mb-0.5 whitespace-nowrap"
            style={{ color: purpleBright, fontFamily: ROUNDED_FONT }}
          >
            {title}
          </p>
          <div
            className="h-[1px] w-6 mb-1.5"
            style={{ background: purpleBright, opacity: 0.4, marginLeft: flip ? 'auto' : undefined }}
          />
          <p className="text-[10.5px] leading-snug" style={{ color: textColor, fontFamily: ROUNDED_FONT }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

interface HubCardProps extends Omit<HubCardViewProps, 'className'> {
  x: number;
  y: number;
  delay: number;
}

function HubCard({ x, y, delay, ...view }: HubCardProps) {
  return (
    <div
      className="absolute z-20"
      style={{
        left: `${(x / VB_W) * 100}%`,
        top: `${(y / VB_H) * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        <HubCardView {...view} className="w-[215px]" />
      </motion.div>
    </div>
  );
}

function KryptaHubSection({ isDark }: { isDark: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const logoTextoAtual = isDark ? logoTextoClaro : logoTextoEscuro;

  const purple = isDark ? PURPLE : '#5100BD';
  const purpleBright = isDark ? PURPLE_BRIGHT : '#6131C9';
  const whiteFrame = isDark ? WHITE : '#1a1a1a';

  const outerVerts = hexVertices(HUB_CX, HUB_CY, INNER_R);
  const innerVerts = hexVertices(HUB_CX, HUB_CY, INNER_R * 0.88);
  const hexPath = toPath(outerVerts);
  const hexPathInner = toPath(innerVerts);

  const satellites = HUB_SATELLITES.map((s, i) => {
    const rad = (s.deg * Math.PI) / 180;
    return {
      ...s,
      x: HUB_CX + SAT_RX * Math.cos(rad),
      y: HUB_CY - SAT_RY * Math.sin(rad),
      v: outerVerts[i],
    };
  });

  return (
    <section className="relative w-full pt-4 pb-20 px-6 md:px-12 lg:px-20 z-10">
      <div className="max-w-5xl mx-auto">
        {/* MOBILE */}
        <div className="md:hidden flex flex-col items-center gap-8">
          <img
            src={logoTextoAtual}
            alt="KRYPTA"
            className="w-[180px] object-contain select-none pointer-events-none"
            style={{ filter: `drop-shadow(0 0 15px ${purple}60)` }}
            draggable={false}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {HUB_SATELLITES.map((s) => (
              <HubCardView
                key={s.id}
                Icon={s.Icon}
                title={s.title}
                subtitle={s.subtitle}
                isDark={isDark}
                className="w-full"
              />
            ))}
          </div>
        </div>

        {/* DESKTOP */}
        <div
          className="relative w-full hidden md:block"
          style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter
                id="hubGlow"
                filterUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={VB_W}
                height={VB_H}
              >
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <AnimatePresence>
              {isHovered && (
                <motion.g
                  key="hub-graphics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {satellites.map((s, i) => (
                    <motion.path
                      key={`line-${s.id}`}
                      d={`M ${s.v.x.toFixed(1)} ${s.v.y.toFixed(1)} L ${s.x.toFixed(1)} ${s.y.toFixed(1)}`}
                      stroke={purpleBright}
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      fill="none"
                      filter="url(#hubGlow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{
                        pathLength: { duration: 0.7, ease: 'easeOut', delay: 0.3 + i * 0.08 },
                        opacity: { duration: 0.2, delay: 0.3 + i * 0.08 },
                      }}
                    />
                  ))}

                  {satellites.map((s, i) => (
                    <motion.circle
                      key={`pulse-${s.id}`}
                      r={2.5}
                      fill={WHITE}
                      filter="url(#hubGlow)"
                      initial={{ cx: s.v.x, cy: s.v.y, opacity: 0 }}
                      animate={{
                        cx: [s.v.x, s.x],
                        cy: [s.v.y, s.y],
                        opacity: [0, 1, 1, 0],
                      }}
                      transition={{
                        duration: 1.8,
                        delay: 1.2 + i * 0.3,
                        repeat: Infinity,
                        ease: 'linear',
                        times: [0, 0.1, 0.8, 1],
                      }}
                    />
                  ))}

                  <motion.path
                    d={hexPath}
                    stroke={purpleBright}
                    strokeWidth={1.7}
                    fill="none"
                    strokeLinejoin="round"
                    filter="url(#hubGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { duration: 1.2, ease: 'easeInOut' },
                      opacity: { duration: 0.3 },
                    }}
                  />

                  <motion.path
                    d={hexPathInner}
                    stroke={whiteFrame}
                    strokeWidth={0.7}
                    fill="none"
                    strokeLinejoin="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.25 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  />

                  {outerVerts.map((v, i) => (
                    <motion.circle
                      key={`vx-${i}`}
                      cx={v.x}
                      cy={v.y}
                      fill={whiteFrame}
                      stroke={purpleBright}
                      strokeWidth={1.5}
                      filter="url(#hubGlow)"
                      initial={{ r: 0, opacity: 0 }}
                      animate={{ r: 4, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.5 + i * 0.06 }}
                    />
                  ))}

                  <circle
                    cx={HUB_CX}
                    cy={HUB_CY}
                    r={INNER_R - 14}
                    stroke={purpleBright}
                    strokeWidth={0.8}
                    fill="none"
                    strokeDasharray="4 6"
                    opacity={0.5}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${HUB_CX} ${HUB_CY}`}
                      to={`360 ${HUB_CX} ${HUB_CY}`}
                      dur="24s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </motion.g>
              )}
            </AnimatePresence>
          </svg>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <motion.img
              src={logoTextoAtual}
              alt="KRYPTA"
              className="w-[170px] md:w-[190px] lg:w-[230px] object-contain select-none pointer-events-none"
              draggable={false}
              animate={{
                filter: isHovered
                  ? `drop-shadow(0 0 30px ${purple}AA) drop-shadow(0 0 60px ${purple}55)`
                  : `drop-shadow(0 0 15px ${purple}40)`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <AnimatePresence>
            {isHovered &&
              satellites.map((s, i) => (
                <HubCard
                  key={s.id}
                  Icon={s.Icon}
                  title={s.title}
                  subtitle={s.subtitle}
                  x={s.x}
                  y={s.y}
                  isDark={isDark}
                  delay={0.2 + i * 0.1}
                  flip={s.flip}
                />
              ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SESSÃO 6 — PLANOS (FREE + PRO)
// ============================================================
interface PlanData {
  name: string;
  subtitle: string;
  pricePrefix?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  tier: 'free' | 'pro';
}

const PLANS_MONTHLY: PlanData[] = [
  {
    tier: 'free',
    name: 'Krypta Free',
    subtitle: 'Proteção essencial, sem hardware',
    price: 'R$0',
    period: 'por mês',
    description:
      'Para quem quer começar a proteger suas credenciais sem precisar do dispositivo físico.',
    features: [
      'Cofre digital de credenciais',
      'Senha Mestre',
      'Criptografia',
      'Gerenciamento básico de senhas',
      'Aplicativo Krypta',
      'Acesso pelo software',
      'Cofre em outros aparelhos com senha',
      'Capacidade limitada de armazenamento',
    ],
    cta: 'Experimente Gratuitamente',
  },
  {
    tier: 'pro',
    name: 'Krypta Pro',
    subtitle: 'Todos os recursos do Krypta em um só plano',
    price: 'R$25',
    period: 'por mês',
    description:
      'O nível máximo de proteção do Krypta, reunindo autenticação múltipla, chave física, controle de acesso, recursos de emergência e total personalização.',
    features: [
      'Cofre de credenciais',
      'Senha Mestre',
      'Criptografia AES-256-GCM',
      'Gerenciamento de credenciais',
      'Aplicativo Krypta',
      'Acesso pelo software',
      'Autenticação multifator',
      'PIN de 6 dígitos e biometria no celular',
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
    cta: 'Assine Agora',
  },
];

const PLANS_ANNUAL: PlanData[] = PLANS_MONTHLY.map((p, i) => {
  const annualPrices = ['R$0', 'R$225'];
  return { ...p, price: annualPrices[i], period: 'por ano' };
});

function PlanCard({
  plan,
  isDark,
  isActive,
  isAnnual,
  onSelect,
}: {
  plan: PlanData;
  isDark: boolean;
  isActive: boolean;
  isAnnual: boolean;
  onSelect: (plan: PlanData, isAnnual: boolean) => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const purple = isDark ? PURPLE : '#5100BD';
  const purpleBright = isDark ? PURPLE_BRIGHT : '#6131C9';

  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(30,6,60,0.9) 0%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(240,237,248,0.95) 100%)';

  const cardBorder = isActive
    ? purpleBright
    : isDark
      ? 'rgba(141,81,255,0.35)'
      : 'rgba(81,0,189,0.25)';

  const textColor = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.78)';

  // Se NÃO logado, força "Faça seu cadastro"
  // Planos antigos (essential, advanced, max, custom) contam como Pro
  const isPlanActive = !!user && normalizePlan(user.plan) === plan.tier;
  const buttonLabel = !user
    ? 'Faça seu cadastro'
    : isPlanActive
      ? 'Plano Atual'
      : plan.cta;

  const buttonStyle: React.CSSProperties = (!user || isPlanActive || isActive)
    ? {
        background: `linear-gradient(135deg, #5100BD 0%, ${purple} 100%)`,
        border: 'none',
        color: WHITE,
        boxShadow: isDark
          ? `0 0 24px ${purple}88`
          : `0 6px 20px rgba(81,0,189,0.35)`,
      }
    : {
        background: 'transparent',
        border: `1px solid ${purpleBright}`,
        color: purpleBright,
        boxShadow: 'none',
      };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    if (isPlanActive) return; // já é o plano atual → no-op
    setLoading(true);
    onSelect(plan, isAnnual);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <div
      className="relative rounded-2xl p-6 h-full flex flex-col overflow-hidden"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isActive
          ? isDark
            ? `0 0 40px ${purple}66, inset 0 0 30px ${purple}15`
            : `0 12px 40px rgba(81,0,189,0.25)`
          : isDark
            ? 'none'
            : '0 4px 20px rgba(81,0,189,0.08)',
      }}
    >
      <div className="mb-4">
        <h3
          className="text-[20px] font-bold mb-1 tracking-tight"
          style={{ color: isDark ? WHITE : '#1a1a1a', fontFamily: ROUNDED_FONT }}
        >
          {plan.name}
        </h3>
        <p
          className="text-[11.5px] leading-snug"
          style={{ color: textColor, fontFamily: ROUNDED_FONT }}
        >
          {plan.subtitle}
        </p>
      </div>

      <div className="mb-4">
        {plan.pricePrefix && (
          <p
            className="text-[11px] mb-0.5"
            style={{ color: purpleBright, fontFamily: ROUNDED_FONT }}
          >
            {plan.pricePrefix}
          </p>
        )}
        <div className="flex items-baseline gap-2">
          <span
            className="text-[42px] font-bold leading-none"
            style={{
              color: isDark ? WHITE : '#1a1a1a',
              fontFamily: ROUNDED_FONT,
              textShadow: isActive ? `0 0 24px ${purple}66` : 'none',
            }}
          >
            {plan.price}
          </span>
          <span
            className="text-[12px]"
            style={{ color: textColor, fontFamily: ROUNDED_FONT }}
          >
            {plan.period}
          </span>
        </div>
      </div>

      <p
        className="text-[11.5px] leading-relaxed mb-5 pb-5"
        style={{
          color: textColor,
          fontFamily: ROUNDED_FONT,
          borderBottom: `1px solid ${
            isDark ? 'rgba(141,81,255,0.15)' : 'rgba(81,0,189,0.1)'
          }`,
        }}
      >
        {plan.description}
      </p>

      <ul
        className={`flex-1 mb-5 gap-y-2.5 gap-x-4 ${
          plan.features.length > 8 ? 'grid grid-cols-1 sm:grid-cols-2 content-start' : 'flex flex-col'
        }`}
      >
        {plan.features.map((f, i) => (
          <li
            key={i}
            className="flex gap-2 text-[11.5px] leading-snug"
            style={{ color: textColor, fontFamily: ROUNDED_FONT }}
          >
            <Check
              className="w-3.5 h-3.5 shrink-0 mt-0.5"
              style={{ color: purpleBright }}
              strokeWidth={2.4}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading || isPlanActive}
        className="block w-full text-center py-3 rounded-lg font-bold text-[13px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default disabled:hover:scale-100"
        style={{ ...buttonStyle, fontFamily: ROUNDED_FONT }}
      >
        {loading ? 'Processando...' : buttonLabel}
      </button>

      {isActive && (
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${purple}30 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />
      )}
    </div>
  );
}

function PlansSection({
  isDark,
  onSelectPlan,
  initialTier,
}: {
  isDark: boolean;
  onSelectPlan: (plan: PlanData, isAnnual: boolean) => void;
  initialTier?: string;
}) {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = isAnnual ? PLANS_ANNUAL : PLANS_MONTHLY;

  // Plano em destaque: o que veio da página de Planos, senão o Pro
  const focusedTier = initialTier ? normalizePlan(initialTier) : 'pro';

  const purple = isDark ? PURPLE : '#5100BD';
  const purpleBright = isDark ? PURPLE_BRIGHT : '#6131C9';

  return (
    <section
      id="planos"
      className="relative w-full pt-10 pb-24 px-6 md:px-12 lg:px-20 z-10"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl lg:text-6xl mb-5 tracking-tight text-center"
          style={titleGradientStyle(isDark)}
        >
          Escolha como proteger o que é seu.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto text-center mb-10"
          style={{
            color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.78)',
            fontFamily: ROUNDED_FONT,
          }}
        >
          Comece gratuitamente ou tenha acesso a todos os recursos de segurança,
          autenticação e proteção do Krypta com o plano Pro.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="flex justify-center mb-12"
        >
          <div
            className="inline-flex rounded-xl overflow-hidden p-1"
            style={{
              background: isDark ? 'rgba(20,5,45,0.5)' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${
                isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.2)'
              }`,
            }}
          >
            <button
              onClick={() => setIsAnnual(false)}
              className="px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-300"
              style={{
                background: !isAnnual
                  ? `linear-gradient(135deg, #5100BD 0%, ${purple} 100%)`
                  : 'transparent',
                color: !isAnnual
                  ? WHITE
                  : isDark
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(26,26,26,0.6)',
                boxShadow: !isAnnual
                  ? isDark
                    ? `0 0 20px ${purple}66`
                    : `0 4px 14px rgba(81,0,189,0.3)`
                  : 'none',
                fontFamily: ROUNDED_FONT,
              }}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className="px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-300 inline-flex items-center gap-2"
              style={{
                background: isAnnual
                  ? `linear-gradient(135deg, #5100BD 0%, ${purple} 100%)`
                  : 'transparent',
                color: isAnnual
                  ? WHITE
                  : isDark
                    ? 'rgba(255,255,255,0.6)'
                    : 'rgba(26,26,26,0.6)',
                boxShadow: isAnnual
                  ? isDark
                    ? `0 0 20px ${purple}66`
                    : `0 4px 14px rgba(81,0,189,0.3)`
                  : 'none',
                fontFamily: ROUNDED_FONT,
              }}
            >
              Anualmente
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-black"
                style={{
                  background: isAnnual
                    ? 'rgba(255,255,255,0.25)'
                    : isDark
                      ? 'rgba(141,81,255,0.25)'
                      : 'rgba(81,0,189,0.15)',
                  color: isAnnual ? WHITE : purpleBright,
                }}
              >
                25%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Free + Pro lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
          {plans.map((plan, idx) => {
            const isActive = plan.tier === focusedTier;
            return (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + idx * 0.12 }}
                whileHover={{ y: -6 }}
                className="relative"
              >
                {plan.tier === 'pro' && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(90deg, #5100BD 0%, #8d51ff 100%)',
                      boxShadow: `0 0 18px ${purple}99`,
                      fontFamily: ROUNDED_FONT,
                    }}
                  >
                    TODOS OS RECURSOS
                  </div>
                )}
                <PlanCard
                  plan={plan}
                  isDark={isDark}
                  isActive={isActive}
                  isAnnual={isAnnual}
                  onSelect={onSelectPlan}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PÁGINA
// ============================================================
export function Services() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTier = (location.state as { tier?: string } | null)?.tier;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Efeito de scroll suave para a seção de planos quando a página carrega
  useEffect(() => {
    if (location.hash !== '#planos') return;
    const t = setTimeout(() => {
      document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1600);
    return () => clearTimeout(t);
  }, [location.hash]);

  // Toda a lógica de seleção de plano acontece aqui
  const handlePlanSelect = (plan: PlanData, isAnnual: boolean) => {
    // Não logado → cadastro; depois dele, volta direto para o checkout do plano escolhido
    if (!user) {
      if (plan.tier === 'pro') {
        navigate('/register', { state: { from: { pathname: '/checkout', state: { kind: 'plan', plan, isAnnual } } } });
      } else {
        navigate('/register');
      }
      return;
    }

    const currentPlan = normalizePlan(user.plan);

    // Se for o plano Free
    if (plan.tier === 'free') {
      // Usuário já tem o Pro → abre modal
      if (currentPlan === 'pro') {
        setIsModalOpen(true);
        return;
      }
      // Usuário já está no Free → não faz nada
      return;
    }

    // Já é Pro → leva para o gerenciamento da assinatura
    if (currentPlan === plan.tier) {
      navigate('/profile#assinatura');
      return;
    }

    // Navega para a tela de checkout com o plano escolhido
    navigate('/checkout', { state: { kind: 'plan', plan, isAnnual } });
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: 'rgb(var(--krypta-bg))',
        color: 'rgb(var(--krypta-fg))',
        transition: 'background-color 0.5s ease',
      }}
    >
      <Navbar />

      <div className="relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20 pointer-events-none" />
        <div
          className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[160px] pointer-events-none"
          style={{ background: 'rgb(var(--krypta-purple) / 0.25)' }}
        />

        <ServicesHero isDark={isDark} />
        <OvercomingSection isDark={isDark} />
        <ProblemSolutionSection isDark={isDark} />
        <WhyKryptaSection isDark={isDark} />
        <KryptaHubSection isDark={isDark} />
        
        {/* Passando a prop initialTier para o carrossel */}
        <PlansSection isDark={isDark} onSelectPlan={handlePlanSelect} initialTier={initialTier} />
      </div>

      <Footer />

      {/* ================= MODAL DE AVISO — PLANO GRÁTIS ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6 md:p-8 border relative overflow-hidden"
              style={{
                background: isDark
                  ? 'linear-gradient(160deg, rgba(30,6,60,0.98) 0%, rgba(0,0,0,0.95) 100%)'
                  : 'linear-gradient(160deg, #ffffff 0%, #f0edf8 100%)',
                borderColor: isDark ? 'rgba(141,81,255,0.4)' : 'rgba(81,0,189,0.25)',
                boxShadow: isDark
                  ? '0 0 60px rgba(97,49,201,0.5), inset 0 0 30px rgba(141,81,255,0.08)'
                  : '0 20px 60px rgba(81,0,189,0.15)',
              }}
            >
              {/* Ícone de aviso */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: isDark ? 'rgba(141,81,255,0.15)' : 'rgba(81,0,189,0.08)',
                    border: '1px solid rgba(141,81,255,0.4)',
                  }}
                >
                  <AlertCircle className="w-7 h-7" style={{ color: isDark ? '#a97aff' : '#5100BD' }} />
                </div>
              </div>

              <h3
                className="text-xl font-bold text-center mb-3"
                style={{
                  fontFamily: ROUNDED_FONT,
                  color: isDark ? '#FFFFFF' : '#1a1a1a',
                }}
              >
                Você já é Krypta Pro
              </h3>

              <p
                className="text-sm text-center leading-relaxed mb-6"
                style={{
                  color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.8)',
                  fontFamily: ROUNDED_FONT,
                }}
              >
                Você está no Krypta Pro. Para voltar ao plano gratuito, cancele a assinatura no seu
                perfil. O cofre continua funcionando; só os recursos do Pro ficam travados.
              </p>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  navigate('/profile#assinatura');
                }}
                className="w-full py-3 mb-3 rounded-xl font-bold text-[15px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  border: `1px solid ${isDark ? '#a97aff' : '#5100BD'}`,
                  color: isDark ? '#a97aff' : '#5100BD',
                  fontFamily: ROUNDED_FONT,
                }}
              >
                Gerenciar assinatura
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                  boxShadow: isDark
                    ? '0 0 24px rgba(141,81,255,0.5)'
                    : '0 6px 20px rgba(81,0,189,0.3)',
                  fontFamily: ROUNDED_FONT,
                }}
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}