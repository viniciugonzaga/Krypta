import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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

import spriteRoboX from '../assets/sprites/sprite_robo_x.png';
import spriteRoboVerificado from '../assets/sprites/sprite_robo_verificado.png';
import spriteRoboAnimado from '../assets/sprites/sprite_robo_animado.png';

import logoTextoClaro from '../assets/logos/Krypta_de_texto.png';
import logoTextoEscuro from '../assets/logos/Krypta_de_texto2.png';

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
// SESSÃO 6 — PLANOS (CARROSSEL)
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
  tier: 'free' | 'essential' | 'advanced' | 'max' | 'custom';
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
      'Capacidade limitada de armazenamento',
    ],
    cta: 'Experimente Gratuitamente',
  },
  {
    tier: 'essential',
    name: 'Krypta Essencial',
    subtitle: 'Proteção essencial, com ou sem hardware (grátis para quem o possui)',
    price: 'R$10',
    period: 'por mês',
    description:
      'Proteção essencial para suas credenciais, com autenticação simples e criptografia de ponta, mantendo praticidade e facilidade de acesso.',
    features: [
      'Cofre de credenciais',
      'Senha Mestre',
      'Criptografia AES-256-GCM',
      'Gerenciamento de credenciais',
      'Aplicativo Krypta',
      'Acesso pelo software (opcional caso possua o Krypta)',
    ],
    cta: 'Assine Agora',
  },
  {
    tier: 'advanced',
    name: 'Krypta Avançado',
    subtitle: 'Para quem precisa de mais proteção',
    price: 'R$15',
    period: 'por mês',
    description:
      'Adiciona camadas extras de segurança para proteger credenciais importantes e reforçar o controle sobre sua identidade digital.',
    features: [
      'Tudo do Essencial',
      'Autenticação multifator',
      'Chave de segurança física',
      'Alertas de acesso',
      'Proteção reforçada para credenciais',
    ],
    cta: 'Assine Agora',
  },
  {
    tier: 'max',
    name: 'Krypta Máximo',
    subtitle: 'Para quem não abre mão da segurança',
    price: 'R$25',
    period: 'por mês',
    description:
      'O nível máximo de proteção do Krypta, combinando múltiplas formas de autenticação, controle de acesso e recursos avançados de segurança.',
    features: [
      'Tudo do Avançado',
      'Bloqueio remoto',
      'Verificações rigorosas de acesso',
      'Recursos de emergência',
      'Herança Digital',
    ],
    cta: 'Assine Agora',
  },
  {
    tier: 'custom',
    name: 'Krypta Personalizado',
    subtitle: 'Proteção do seu jeito',
    pricePrefix: 'A partir de',
    price: 'R$10',
    period: 'por mês',
    description:
      'Configure os recursos de segurança, privacidade e autenticação de acordo com suas necessidades e preferências.',
    features: [
      'Escolha os métodos de autenticação',
      'Defina os recursos de segurança',
      'Adapte o Krypta às suas necessidades',
      'Personalize o nível de proteção',
    ],
    cta: 'Assine Agora',
  },
];

const PLANS_ANNUAL: PlanData[] = PLANS_MONTHLY.map((p, i) => {
  const annualPrices = ['R$0', 'R$90', 'R$135', 'R$225', 'R$90'];
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
  const isPlanActive = user?.plan === plan.tier;
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

      <ul className="space-y-2.5 flex-1 mb-5">
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

function CenterBurstEffect({ trigger }: { trigger: number }) {
  const [wires, setWires] = useState<{ d: string; delay: number; duration: number }[]>([]);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (trigger === 0) return;

    const cx = 576;
    const cy = 280;
    const halfW = 160;
    const halfH = 250;

    const count = 6 + Math.floor(Math.random() * 5);
    const generated: { d: string; delay: number; duration: number }[] = [];

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let sx = cx;
      let sy = cy;
      let dxMain = 0;
      let dyMain = 0;

      if (edge === 0) {
        sx = cx + (Math.random() - 0.5) * halfW * 1.7;
        sy = cy - halfH;
        dxMain = (Math.random() - 0.5) * 60;
        dyMain = -(45 + Math.random() * 45);
      } else if (edge === 1) {
        sx = cx + halfW;
        sy = cy + (Math.random() - 0.5) * halfH * 1.7;
        dxMain = 45 + Math.random() * 45;
        dyMain = (Math.random() - 0.5) * 60;
      } else if (edge === 2) {
        sx = cx + (Math.random() - 0.5) * halfW * 1.7;
        sy = cy + halfH;
        dxMain = (Math.random() - 0.5) * 60;
        dyMain = 45 + Math.random() * 45;
      } else {
        sx = cx - halfW;
        sy = cy + (Math.random() - 0.5) * halfH * 1.7;
        dxMain = -(45 + Math.random() * 45);
        dyMain = (Math.random() - 0.5) * 60;
      }

      const pts: { x: number; y: number }[] = [{ x: sx, y: sy }];
      let x = sx;
      let y = sy;
      const segs = 3 + Math.floor(Math.random() * 3);

      for (let j = 0; j < segs; j++) {
        if (j % 2 === 0) {
          x += dxMain * (0.5 + Math.random() * 0.5);
          y += (Math.random() - 0.5) * 12;
        } else {
          x += (Math.random() - 0.5) * 22;
          y += dyMain * (0.5 + Math.random() * 0.5);
        }
        pts.push({ x, y });
      }

      generated.push({
        d:
          'M ' +
          pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '),
        delay: Math.random() * 0.12,
        duration: 0.4 + Math.random() * 0.35,
      });
    }

    setWires(generated);
    setPhase(trigger);
  }, [trigger]);

  if (phase === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1152 560"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ zIndex: 0 }}
    >
      <defs>
        <filter id="planBurstGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {wires.map((w, i) => (
        <motion.path
          key={`${phase}-${i}`}
          d={w.d}
          stroke={i % 2 === 0 ? PURPLE_BRIGHT : PURPLE}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#planBurstGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0.85, 0] }}
          transition={{
            pathLength: { duration: w.duration, ease: 'easeOut', delay: w.delay },
            opacity: {
              duration: w.duration + 0.25,
              delay: w.delay,
              times: [0, 0.2, 0.7, 1],
            },
          }}
        />
      ))}
    </svg>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionKey, setTransitionKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.25 });

  const plans = isAnnual ? PLANS_ANNUAL : PLANS_MONTHLY;

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    setTransitionKey((k) => k + 1);
  }, [activeIndex]);

  useEffect(() => {
    if (!inView) {
      setIsPaused(false);
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    }
  }, [inView]);

  useEffect(() => {
    const id = setInterval(() => {
      if (isPausedRef.current) return;
      setActiveIndex((prev) => (prev + 1) % plans.length);
    }, 3500);
    return () => clearInterval(id);
  }, [plans.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [isAnnual]);

  // Adicionado o useEffect para buscar o plano inicial (após o de isAnnual)
  useEffect(() => {
    if (!initialTier) return;
    const i = plans.findIndex((p) => p.tier === initialTier);
    if (i >= 0) setActiveIndex(i);
  }, [initialTier]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const scheduleResume = (ms = 5000) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, ms);
  };

  const pause = () => {
    setIsPaused(true);
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => pause();
  const handleMouseLeave = () => scheduleResume(5000);

  const handleCardClick = (idx: number) => {
    if (idx === activeIndex) return;
    pause();
    scheduleResume(6000);
    setActiveIndex(idx);
  };

  const goToDot = (idx: number) => {
    if (idx === activeIndex) return;
    pause();
    scheduleResume(6000);
    setActiveIndex(idx);
  };

  const purple = isDark ? PURPLE : '#5100BD';
  const purpleBright = isDark ? PURPLE_BRIGHT : '#6131C9';

  const SLOT_SPACING = 340;
  const CARD_WIDTH = 320;

  return (
    <section
      id="planos"
      ref={sectionRef}
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
          Cada pessoa possui necessidades diferentes. Por isso, o Krypta oferece
          planos pensados para diferentes níveis de proteção, armazenamento e
          recursos.
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

        <div
          className="relative w-full"
          style={{ height: 560 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CenterBurstEffect trigger={transitionKey} />

          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 10 }}
          >
            <div className="relative" style={{ width: '100%', height: '100%' }}>
              {plans.map((plan, idx) => {
                let offset = idx - activeIndex;
                const half = Math.floor(plans.length / 2);
                if (offset > half) offset -= plans.length;
                if (offset < -half) offset += plans.length;

                const isVisible = Math.abs(offset) <= 1;
                const x = offset * SLOT_SPACING;
                const isActive = offset === 0;

                return (
                  <motion.div
                    key={plan.tier}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      width: CARD_WIDTH,
                      height: 500,
                      marginLeft: -CARD_WIDTH / 2,
                      marginTop: -250,
                      cursor: isActive ? 'default' : 'pointer',
                    }}
                    animate={{
                      x,
                      opacity: isVisible ? (isActive ? 1 : 0.35) : 0,
                      scale: isActive ? 1 : 0.88,
                      zIndex: isActive ? 20 : 10,
                    }}
                    transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                    onClick={() => {
                      if (!isActive) handleCardClick(idx);
                    }}
                  >
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
        </div>

        <div className="flex justify-center items-center gap-2.5 mt-8">
          {plans.map((_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                onClick={() => goToDot(idx)}
                aria-label={`Ir para plano ${idx + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 28 : 8,
                  height: 8,
                  background: isActive
                    ? `linear-gradient(90deg, #5100BD 0%, ${purpleBright} 100%)`
                    : isDark
                      ? 'rgba(141,81,255,0.3)'
                      : 'rgba(81,0,189,0.2)',
                  boxShadow: isActive ? `0 0 12px ${purpleBright}88` : 'none',
                }}
              />
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
    // Não logado → redireciona para cadastro
    if (!user) {
      navigate('/register');
      return;
    }

    // Se for o plano Free
    if (plan.tier === 'free') {
      // Usuário já tem um plano pago → abre modal
      if (user.plan && user.plan !== 'free') {
        setIsModalOpen(true);
        return;
      }
      // Usuário já está no Free → não faz nada
      if (!user.plan || user.plan === 'free') return;
    }

    // Navega para a tela de checkout com o plano escolhido
    navigate('/checkout', { state: { plan, isAnnual } });
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
                Plano Pago em Uso
              </h3>

              <p
                className="text-sm text-center leading-relaxed mb-6"
                style={{
                  color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(26,26,26,0.8)',
                  fontFamily: ROUNDED_FONT,
                }}
              >
                Prezado usuário, identificamos que você possui um plano pago ativo no momento.
                Para retornar ao plano gratuito, é necessário cancelar sua assinatura atual ou
                aguardar o término do período vigente.
              </p>

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