// src/pages/Checkout.tsx
// ============================================================
// CHECKOUT SIMULADO — serve para o PLANO (Krypta Pro) e para o
// PRODUTO (Dispositivo Krypta).
//
// Como chegar aqui:
//   Plano   → navigate('/checkout', { state: { kind: 'plan', plan, isAnnual } })
//   Produto → navigate('/checkout', { state: { kind: 'product', quantity } })
// (o formato antigo { plan, isAnnual } sem "kind" continua funcionando)
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CreditCard,
  ArrowLeft,
  AlertCircle,
  Lock,
  ShieldCheck,
  Copy,
  Truck,
  Minus,
  Plus,
  Sparkles,
  Crown,
  Clock,
  RefreshCw,
  LogIn,
  Package,
  Wand2,
  Ban,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ROUNDED_FONT, LILAC, AppleIcon } from '../components/auth/authShared';
import { normalizePlan } from '../utils/plan';
import { OrdersAPI } from '../services/api';
import { KRYPTA_DEVICE } from '../data/catalog';
import {
  BRAND_LABEL,
  PROCESSING_STEPS,
  PaymentDeclinedError,
  TEST_CARDS,
  detectBrand,
  formatBRL,
  formatCardNumber,
  formatCep,
  formatCvv,
  formatExpiry,
  generateOrderId,
  generatePixCode,
  maskToken,
  onlyDigits,
  parsePrice,
  saveOrder,
  simulatePayment,
  validateCard,
  type CardBrand,
  type OrderKind,
  type PaymentMethod,
  type SimulatedOrder,
} from '../services/fakePayment';

import spriteRoboAbraco from '../assets/sprites/sprite_robo_abraco.png';

const PURPLE = '#8d51ff';
const DEEP = '#5100BD';

const PRO_FEATURES_FALLBACK = [
  'Cofre de credenciais',
  'Senha Mestre',
  'Criptografia AES-256-GCM',
  'Autenticação multifator',
  'Chave de segurança física',
  'Alertas de acesso',
  'Bloqueio remoto',
  'Recursos de emergência',
  'Herança Digital',
  'Nível de proteção personalizável',
];

interface CheckoutState {
  kind?: OrderKind;
  plan?: {
    tier?: string;
    name?: string;
    description?: string;
    price?: string;
    period?: string;
    features?: string[];
  };
  isAnnual?: boolean;
  quantity?: number;
}

type Stage = 'form' | 'processing' | 'success' | 'error';
type ErrorKind = 'declined' | 'session' | 'generic';

// ============================================================
// QR CODE FICTÍCIO (desenhado a partir do código PIX)
// ============================================================
function seededRandom(seedText: string) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function FakeQr({ code, color }: { code: string; color: string }) {
  const size = 29;
  const cells = useMemo(() => {
    const rnd = seededRandom(code);
    const out: { x: number; y: number }[] = [];
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (inFinder(x, y)) continue;
        if (rnd() > 0.52) out.push({ x, y });
      }
    }
    return out;
  }, [code]);

  const finder = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width={7} height={7} fill={color} rx={1.2} />
      <rect x={ox + 1} y={oy + 1} width={5} height={5} fill="#FFFFFF" rx={0.8} />
      <rect x={ox + 2} y={oy + 2} width={3} height={3} fill={color} rx={0.6} />
    </g>
  );

  return (
    <svg viewBox={`-1 -1 ${size + 2} ${size + 2}`} className="w-full h-full" shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={size + 2} height={size + 2} fill="#FFFFFF" rx={2} />
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={color} />
      ))}
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
    </svg>
  );
}

// ============================================================
// CARTÃO 3D (vira quando o CVV está em foco)
// ============================================================
function CardPreview({
  number,
  holder,
  expiry,
  cvv,
  brand,
  flipped,
}: {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  brand: CardBrand | null;
  flipped: boolean;
}) {
  const digits = onlyDigits(number).padEnd(16, '•');
  const shown = digits.replace(/(.{4})/g, '$1 ').trim();

  const face: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    background:
      'radial-gradient(circle at 85% 15%, rgba(198,174,246,0.55) 0%, transparent 45%), linear-gradient(135deg, #2a0a63 0%, #5100BD 45%, #8d51ff 100%)',
    boxShadow: '0 18px 40px rgba(81,0,189,0.45), inset 0 0 0 1px rgba(255,255,255,0.18)',
  };

  return (
    <div className="w-full max-w-[340px] mx-auto aspect-[1.586/1]" style={{ perspective: 1200 }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
      >
        {/* FRENTE */}
        <div className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between overflow-hidden text-white" style={face}>
          <motion.span
            className="absolute top-0 bottom-0 w-1/3 -skew-x-12 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
            initial={{ left: '-40%' }}
            animate={{ left: '140%' }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
          />
          <div className="flex items-start justify-between">
            <div
              className="w-10 h-7 rounded-md"
              style={{
                background: 'linear-gradient(135deg, #f6e7b0 0%, #d4b45c 50%, #f3e3a6 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
              }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={brand ?? 'none'}
                initial={{ opacity: 0, y: -6, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-black italic tracking-wide"
              >
                {brand ? BRAND_LABEL[brand] : 'KRYPTA PAY'}
              </motion.span>
            </AnimatePresence>
          </div>

          <p className="font-mono text-[17px] sm:text-lg tracking-[0.12em]" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.35)' }}>
            {shown}
          </p>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-[0.2em] opacity-70">Titular</p>
              <p className="text-xs font-semibold uppercase truncate">{holder.trim() || 'Seu nome aqui'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] uppercase tracking-[0.2em] opacity-70">Validade</p>
              <p className="text-xs font-semibold font-mono">{expiry || 'MM/AA'}</p>
            </div>
          </div>
        </div>

        {/* VERSO */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden text-white flex flex-col"
          style={{ ...face, transform: 'rotateY(180deg)' }}
        >
          <div className="h-10 mt-6 w-full" style={{ background: 'rgba(5,0,15,0.85)' }} />
          <div className="px-5 mt-5 flex items-center gap-3">
            <div className="flex-1 h-8 rounded" style={{ background: 'repeating-linear-gradient(45deg, #f3f0fa, #f3f0fa 6px, #e4dcf7 6px, #e4dcf7 12px)' }} />
            <div className="w-14 h-8 rounded bg-white flex items-center justify-center font-mono text-sm text-[#1a1a1a]">
              {cvv || '•••'}
            </div>
          </div>
          <p className="px-5 mt-auto mb-4 text-[9px] opacity-70">
            Cartão de demonstração • Krypta Pay (simulação)
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// OVERLAY: PROCESSANDO
// ============================================================
function ProcessingOverlay({
  steps,
  current,
  isDark,
}: {
  steps: string[];
  current: number;
  isDark: boolean;
}) {
  const progress = Math.min(1, current / steps.length);
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: isDark ? 'rgba(3,0,10,0.78)' : 'rgba(26,10,60,0.45)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative w-full max-w-sm rounded-2xl p-7 overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, rgba(25,6,55,0.97) 0%, rgba(5,0,15,0.97) 100%)'
            : 'linear-gradient(160deg, #FFFFFF 0%, #F0EDF8 100%)',
          border: `1px solid ${isDark ? 'rgba(141,81,255,0.55)' : 'rgba(81,0,189,0.3)'}`,
          boxShadow: isDark ? '0 0 60px rgba(97,49,201,0.5)' : '0 20px 60px rgba(81,0,189,0.25)',
        }}
      >
        {/* Robô com anel girando */}
        <div className="relative w-32 h-32 mx-auto mb-5">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, #8d51ff 30%, #C6AEF6 45%, transparent 60%)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.img
            src={spriteRoboAbraco}
            alt=""
            draggable={false}
            className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] object-contain"
            animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <h3
          className="text-center text-lg font-bold mb-1"
          style={{ fontFamily: ROUNDED_FONT, color: isDark ? '#FFFFFF' : '#1a1a1a' }}
        >
          Processando pagamento
        </h3>
        <p className="text-center text-xs mb-5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.6)' }}>
          Não feche esta página. O robô está cuidando de tudo.
        </p>

        <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: isDark ? 'rgba(141,81,255,0.15)' : 'rgba(81,0,189,0.1)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #5100BD, #8d51ff, #C6AEF6)', boxShadow: '0 0 12px rgba(141,81,255,0.8)' }}
            animate={{ width: `${Math.max(8, progress * 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <ul className="space-y-2.5">
          {steps.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: done || active ? 1 : 0.4, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-2.5 text-[12.5px]"
                style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: done ? 'linear-gradient(135deg, #5100BD, #8d51ff)' : 'transparent',
                    border: `1.5px solid ${done || active ? PURPLE : isDark ? 'rgba(255,255,255,0.25)' : 'rgba(26,26,26,0.2)'}`,
                  }}
                >
                  {done ? (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  ) : active ? (
                    <motion.span
                      className="w-2 h-2 rounded-full"
                      style={{ background: PURPLE }}
                      animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    />
                  ) : null}
                </span>
                {s}
              </motion.li>
            );
          })}
        </ul>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// OVERLAY: SUCESSO
// ============================================================
const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: 'Cartão de crédito',
  pix: 'PIX',
  apple: 'Apple Pay',
  google: 'Google Pay',
};

function SuccessOverlay({
  order,
  isDark,
  onPrimary,
  onSecondary,
}: {
  order: SimulatedOrder;
  isDark: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.6)';
  const isPlan = order.kind === 'plan';

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(order.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sem permissão de área de transferência */
    }
  };

  const rows: [string, string][] = [
    ['Pedido', order.id],
    ['Método', `${METHOD_LABEL[order.method]}${order.cardLast4 ? ` •••• ${order.cardLast4}` : ''}`],
    ['Parcelas', order.installments > 1 ? `${order.installments}x de ${formatBRL(order.total / order.installments)}` : 'À vista'],
    ['Total', formatBRL(order.total)],
    ['Data', new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })],
    ...((order.serials ?? []).map((s, i) => [`Dispositivo ${i + 1}`, s]) as [string, string][]),
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: isDark ? 'rgba(3,0,10,0.8)' : 'rgba(26,10,60,0.45)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative w-full max-w-md rounded-2xl p-7 my-8"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, rgba(25,6,55,0.98) 0%, rgba(5,0,15,0.98) 100%)'
            : 'linear-gradient(160deg, #FFFFFF 0%, #F0EDF8 100%)',
          border: `1px solid ${isDark ? 'rgba(141,81,255,0.6)' : 'rgba(81,0,189,0.3)'}`,
          boxShadow: isDark ? '0 0 70px rgba(97,49,201,0.55)' : '0 20px 60px rgba(81,0,189,0.25)',
        }}
      >
        {/* Explosão de partículas + check */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          {Array.from({ length: 14 }).map((_, i) => {
            const ang = (i / 14) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full"
                style={{ background: i % 2 ? '#C6AEF6' : PURPLE, boxShadow: `0 0 10px ${PURPLE}` }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(ang) * 70, y: Math.sin(ang) * 70, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
              />
            );
          })}
          <motion.div
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', boxShadow: '0 0 40px rgba(141,81,255,0.7)' }}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
          >
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </motion.div>
        </div>

        <h3 className="text-center text-2xl font-bold mb-1" style={{ fontFamily: ROUNDED_FONT, color: fg }}>
          {isPlan ? 'Bem-vindo ao Krypta Pro!' : 'Pedido confirmado!'}
        </h3>
        <p className="text-center text-sm mb-6" style={{ color: muted }}>
          {isPlan
            ? 'Seu plano já está ativo. Todos os recursos foram liberados.'
            : 'Pedido gravado na sua conta. Quando o dispositivo chegar, confirme o recebimento em "Minhas compras" e pareie em Meu Krypta.'}
        </p>

        <div
          className="rounded-xl p-4 space-y-2 mb-4 text-[12.5px]"
          style={{
            background: isDark ? 'rgba(141,81,255,0.08)' : 'rgba(81,0,189,0.05)',
            border: `1px solid ${isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.15)'}`,
          }}
        >
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span style={{ color: muted }}>{k}</span>
              <span className="font-semibold text-right" style={{ color: fg }}>{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center gap-3 pt-2 mt-1 border-t" style={{ borderColor: isDark ? 'rgba(141,81,255,0.25)' : 'rgba(81,0,189,0.12)' }}>
            <span style={{ color: muted }}>Token da transação</span>
            <button
              type="button"
              onClick={copyToken}
              className="flex items-center gap-1.5 font-mono text-[11.5px] px-2 py-1 rounded-md transition-colors"
              style={{ color: isDark ? '#C6AEF6' : DEEP, background: isDark ? 'rgba(141,81,255,0.12)' : 'rgba(81,0,189,0.08)' }}
              title="Copiar token completo"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : maskToken(order.token)}
            </button>
          </div>
        </div>

        <p className="text-[10.5px] text-center mb-5" style={{ color: muted }}>
          Isto é uma simulação: nenhum valor foi cobrado.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onPrimary}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', boxShadow: '0 0 24px rgba(141,81,255,0.5)', fontFamily: ROUNDED_FONT }}
          >
            {isPlan ? 'Ir para Meu Krypta' : 'Ver minhas compras'}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: isDark ? '#C6AEF6' : DEEP, fontFamily: ROUNDED_FONT }}
          >
            {isPlan ? 'Conhecer o Dispositivo Krypta' : 'Ir para Meu Krypta'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// OVERLAY: ERRO / RECUSA / SESSÃO EXPIRADA
// ============================================================
function ErrorOverlay({
  kind,
  message,
  isDark,
  onRetry,
  onLogin,
}: {
  kind: ErrorKind;
  message: string;
  isDark: boolean;
  onRetry: () => void;
  onLogin: () => void;
}) {
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(26,26,26,0.65)';
  const title =
    kind === 'declined' ? 'Pagamento recusado' : kind === 'session' ? 'Sua sessão expirou' : 'Algo deu errado';

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: isDark ? 'rgba(3,0,10,0.8)' : 'rgba(26,10,60,0.45)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, x: [0, -10, 10, -6, 6, 0] }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm rounded-2xl p-7 text-center"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, rgba(25,6,55,0.98) 0%, rgba(5,0,15,0.98) 100%)'
            : 'linear-gradient(160deg, #FFFFFF 0%, #F0EDF8 100%)',
          border: `1px solid ${kind === 'session' ? (isDark ? 'rgba(141,81,255,0.6)' : 'rgba(81,0,189,0.3)') : 'rgba(239,68,68,0.45)'}`,
          boxShadow: isDark ? '0 0 50px rgba(97,49,201,0.4)' : '0 20px 60px rgba(81,0,189,0.2)',
        }}
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{
            background: kind === 'session' ? 'rgba(141,81,255,0.15)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${kind === 'session' ? 'rgba(141,81,255,0.5)' : 'rgba(239,68,68,0.4)'}`,
          }}
        >
          {kind === 'session' ? (
            <Clock className="w-8 h-8" style={{ color: PURPLE }} />
          ) : kind === 'declined' ? (
            <Ban className="w-8 h-8 text-red-400" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-400" />
          )}
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: ROUNDED_FONT, color: fg }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed mb-6" style={{ color: muted }}>
          {message}
        </p>

        <div className="flex flex-col gap-2.5">
          {kind === 'session' ? (
            <button
              type="button"
              onClick={onLogin}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', fontFamily: ROUNDED_FONT }}
            >
              <LogIn className="w-4 h-4" /> Entrar novamente
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', fontFamily: ROUNDED_FONT }}
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          )}
          {kind === 'session' && (
            <button type="button" onClick={onRetry} className="text-sm font-semibold py-2" style={{ color: muted }}>
              Voltar ao checkout
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// PÁGINA
// ============================================================
export function Checkout() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser, signOut } = useAuth();

  const state = (location.state ?? null) as CheckoutState | null;
  const kind: OrderKind | null = state?.kind ?? (state?.plan ? 'plan' : null);
  const plan = state?.plan;
  const isAnnual = !!state?.isAnnual;
  const planTier = normalizePlan(plan?.tier);

  // ---------- estado ----------
  const [quantity, setQuantity] = useState(() =>
    Math.min(KRYPTA_DEVICE.maxQuantity, Math.max(1, state?.quantity ?? 1))
  );
  const [method, setMethod] = useState<'card' | 'pix'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [holder, setHolder] = useState(user?.name ?? '');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cvvFocused, setCvvFocused] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [saveDetails, setSaveDetails] = useState(false);

  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');

  const [stage, setStage] = useState<Stage>('form');
  const [stepIndex, setStepIndex] = useState(0);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('card');
  const [order, setOrder] = useState<SimulatedOrder | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>('generic');
  const [errorMsg, setErrorMsg] = useState('');

  const [pixOrderId] = useState(() => generateOrderId());
  const [pixSeconds, setPixSeconds] = useState(600);
  const [pixCopied, setPixCopied] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------- valores ----------
  const unitPrice = kind === 'plan' ? parsePrice(plan?.price) : KRYPTA_DEVICE.price;
  const qty = kind === 'product' ? quantity : 1;
  const total = unitPrice * qty;
  const maxInstallments = kind === 'product' ? KRYPTA_DEVICE.maxInstallments : 1;
  const brand = detectBrand(cardNumber);
  const pixCode = useMemo(() => generatePixCode(pixOrderId, total), [pixOrderId, total]);
  const alreadyActive = kind === 'plan' && !!user && normalizePlan(user.plan) === planTier;

  useEffect(() => {
    if (installments > maxInstallments) setInstallments(maxInstallments);
  }, [maxInstallments, installments]);

  // Contagem regressiva do PIX
  useEffect(() => {
    if (method !== 'pix' || stage !== 'form') return;
    const id = setInterval(() => setPixSeconds((s) => (s > 0 ? s - 1 : 600)), 1000);
    return () => clearInterval(id);
  }, [method, stage]);

  // ---------- cores ----------
  const textMain = isDark ? '#FFFFFF' : '#1a1a1a';
  const mutedText = isDark ? 'rgba(255,255,255,0.62)' : 'rgba(26,26,26,0.65)';
  const accent = isDark ? LILAC : DEEP;
  const bright = isDark ? '#a97aff' : '#6131C9';
  const fieldBorder = isDark ? 'rgba(110,55,230,0.7)' : 'rgba(81,0,189,0.3)';
  const panelBg = isDark
    ? 'linear-gradient(160deg, rgba(25,6,55,0.88) 0%, rgba(5,0,15,0.85) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,0.97) 0%, rgba(244,240,252,0.95) 100%)';
  const panelBorder = isDark ? 'rgba(120,64,240,0.6)' : 'rgba(81,0,189,0.22)';
  const panelShadow = isDark ? '0 0 36px rgba(97,49,201,0.28)' : '0 10px 40px rgba(81,0,189,0.1)';
  const corner = `1.5px solid ${bright}`;

  const fieldStyle: React.CSSProperties = {
    background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.95)',
    border: `1px solid ${fieldBorder}`,
    color: textMain,
  };
  const fieldClass = `w-full py-3 px-4 rounded-lg text-[13px] outline-none transition-all duration-300 focus:ring-2 focus:ring-purple-500/50 focus:shadow-[0_0_18px_rgba(141,81,255,0.35)] ${
    isDark ? 'placeholder:text-white/45' : 'placeholder:text-black/40'
  }`;
  const labelClass = 'block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5';

  const Corners = () => (
    <>
      <span className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderLeft: corner }} />
      <span className="absolute top-0 right-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderRight: corner }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderLeft: corner }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderRight: corner }} />
    </>
  );

  // ---------- nada para comprar ----------
  if (!kind || (kind === 'plan' && (!plan || planTier === 'free'))) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative text-center max-w-md rounded-2xl p-8"
            style={{ background: panelBg, border: `1px solid ${panelBorder}`, boxShadow: panelShadow }}
          >
            <Corners />
            <motion.img
              src={spriteRoboAbraco}
              alt=""
              className="w-24 h-24 mx-auto mb-4 object-contain"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              draggable={false}
            />
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
              Seu carrinho está vazio
            </h1>
            <p className="text-sm mb-6" style={{ color: mutedText }}>
              Escolha o plano Krypta Pro ou o Dispositivo Krypta para continuar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/services#planos')}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}
              >
                Ver planos
              </button>
              <button
                onClick={() => navigate('/products')}
                className="px-5 py-2.5 rounded-lg text-sm font-bold"
                style={{ border: `1px solid ${bright}`, color: bright }}
              >
                Ver dispositivo
              </button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // ---------- validação ----------
  const validate = (pay: PaymentMethod): string | null => {
    if (alreadyActive) return 'Você já possui o Krypta Pro ativo.';
    if (kind === 'product') {
      if (onlyDigits(cep).length !== 8) return 'Informe um CEP válido para a entrega.';
      if (address.trim().length < 4) return 'Informe o endereço de entrega.';
      if (!addressNumber.trim()) return 'Informe o número do endereço.';
    }
    if (pay === 'card') return validateCard({ number: cardNumber, holder, expiry, cvv });
    return null;
  };

  // ---------- pagamento ----------
  const runPayment = async (pay: PaymentMethod) => {
    const err = validate(pay);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setActiveMethod(pay);
    setStepIndex(0);
    setStage('processing');

    try {
      const { token } = await simulatePayment({ method: pay, cardNumber }, (i) => {
        if (mountedRef.current) setStepIndex(i);
      });

      // Grava o PEDIDO no servidor (rota protegida por JWT). O servidor recalcula
      // o preço e aplica o efeito: plano → conta Pro · produto → dispositivos com nº de série.
      const cartaoFinal = pay === 'card' ? onlyDigits(cardNumber).slice(-4) : undefined;
      const resposta = await OrdersAPI.create(
        kind === 'plan'
          ? {
              tipo: 'PLANO',
              plano: 'pro',
              periodo: isAnnual ? 'ANUAL' : 'MENSAL',
              metodo: pay,
              parcelas: 1,
              cartao_final: cartaoFinal,
              token_transacao: token,
            }
          : {
              tipo: 'PRODUTO',
              produto: KRYPTA_DEVICE.id,
              quantidade: qty,
              metodo: pay,
              parcelas: pay === 'card' ? installments : 1,
              cartao_final: cartaoFinal,
              token_transacao: token,
              endereco: { cep, endereco: address, numero: addressNumber },
            }
      );
      await refreshUser(); // plano novo aparece na hora em todo o site

      const newOrder: SimulatedOrder = {
        id: resposta.pedido.codigo ?? (pay === 'pix' ? pixOrderId : generateOrderId()),
        token,
        kind,
        items: [
          kind === 'plan'
            ? { id: `plan-${planTier}`, name: plan?.name ?? 'Krypta Pro', unitPrice, quantity: 1 }
            : { id: KRYPTA_DEVICE.id, name: KRYPTA_DEVICE.shortName, unitPrice, quantity: qty },
        ],
        total,
        method: pay,
        installments: pay === 'card' ? installments : 1,
        cardBrand: pay === 'card' ? brand : null,
        cardLast4: pay === 'card' ? onlyDigits(cardNumber).slice(-4) : undefined,
        isAnnual: kind === 'plan' ? isAnnual : undefined,
        shipping: kind === 'product' ? { cep, address, number: addressNumber } : undefined,
        serials: resposta.dispositivos,
        createdAt: new Date().toISOString(),
      };
      saveOrder(newOrder);

      if (!mountedRef.current) return;
      setOrder(newOrder);
      setStage('success');
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (e instanceof PaymentDeclinedError) {
        setErrorKind('declined');
        setErrorMsg(e.message);
      } else {
        const msg = String(e?.message ?? '');
        const status = e?.status ?? e?.response?.status ?? e?.code;
        const isSession = status === 401 || /token|sess[aã]o|expirad|autentica/i.test(msg);
        setErrorKind(isSession ? 'session' : 'generic');
        setErrorMsg(
          isSession
            ? 'Por segurança, seu acesso expirou antes de concluirmos a assinatura. Entre novamente e repita a compra. Nenhum valor foi cobrado.'
            : msg || 'Não foi possível concluir o pagamento. Tente novamente.'
        );
      }
      setStage('error');
    }
  };

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 1600);
    } catch {
      /* ignora */
    }
  };

  const handleSessionLogin = () => {
    signOut();
    navigate('/login');
  };

  const methods = [
    { id: 'card' as const, label: 'Cartão de crédito', icon: <CreditCard className="w-4 h-4" /> },
    {
      id: 'pix' as const,
      label: 'PIX',
      icon: (
        <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor">
          <path d="M12 1.5 9.5 4 12 6.5 14.5 4 12 1.5ZM4 9.5 1.5 12 4 14.5 6.5 12 4 9.5ZM20 9.5 17.5 12 20 14.5 22.5 12 20 9.5ZM12 17.5 9.5 20 12 22.5 14.5 20 12 17.5Z" />
        </svg>
      ),
    },
  ];

  const features = (plan?.features?.length ? plan.features : PRO_FEATURES_FALLBACK) as string[];
  const planTitle = plan?.name ?? 'Krypta Pro';
  const pixMM = String(Math.floor(pixSeconds / 60)).padStart(2, '0');
  const pixSS = String(pixSeconds % 60).padStart(2, '0');
  const payLabel = alreadyActive
    ? 'Plano já ativo'
    : method === 'pix'
      ? 'Já paguei o PIX'
      : `Pagar ${formatBRL(total)}`;

  const stepperIndex = stage === 'success' ? 2 : stage === 'processing' ? 1 : 0;

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden relative transition-colors duration-500"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}
    >
      <Navbar />

      {/* ============ FUNDO ============ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <motion.div
          className="absolute top-24 right-[4%] w-[520px] h-[520px] rounded-full blur-[150px]"
          style={{ background: isDark ? 'rgba(97,49,201,0.28)' : 'rgba(81,0,189,0.1)' }}
          animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-[2%] w-[440px] h-[440px] rounded-full blur-[150px]"
          style={{ background: isDark ? 'rgba(81,0,189,0.22)' : 'rgba(141,81,255,0.1)' }}
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <main className="flex-1 w-full pt-32 pb-24 px-4 sm:px-6 md:px-12 relative z-10">
        <div className="max-w-6xl mx-auto relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <button
              onClick={() => navigate(kind === 'plan' ? '/services#planos' : '/products')}
              className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
              style={{ color: accent }}
            >
              <ArrowLeft className="w-4 h-4" /> {kind === 'plan' ? 'Voltar para planos' : 'Voltar para o produto'}
            </button>

            {/* Etapas */}
            <div className="flex items-center gap-2 text-[11px]" style={{ fontFamily: ROUNDED_FONT }}>
              {['Dados', 'Pagamento', 'Confirmação'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-500"
                    style={{
                      background: i <= stepperIndex ? 'linear-gradient(135deg, #5100BD, #8d51ff)' : isDark ? 'rgba(141,81,255,0.1)' : 'rgba(81,0,189,0.06)',
                      color: i <= stepperIndex ? '#FFFFFF' : mutedText,
                      boxShadow: i === stepperIndex ? '0 0 14px rgba(141,81,255,0.5)' : 'none',
                    }}
                  >
                    <b>{i + 1}</b> {s}
                  </span>
                  {i < 2 && <span className="w-4 h-px" style={{ background: panelBorder }} />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-start">
            {/* ===================== COLUNA ESQUERDA ===================== */}
            <div className="flex flex-col gap-7 w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-4"
              >
                <div className="flex-1">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider mb-3"
                    style={{
                      background: isDark ? 'rgba(141,81,255,0.14)' : 'rgba(81,0,189,0.08)',
                      border: `1px solid ${panelBorder}`,
                      color: bright,
                    }}
                  >
                    <Sparkles className="w-3 h-3" /> MODO SIMULAÇÃO · nenhum valor é cobrado
                  </span>
                  <h1
                    className="text-3xl sm:text-4xl font-semibold leading-snug"
                    style={{ fontFamily: ROUNDED_FONT, color: textMain }}
                  >
                    Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Vamos
                    <br />
                    finalizar sua compra
                  </h1>
                </div>
                <motion.img
                  src={spriteRoboAbraco}
                  alt="Robô Krypta"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain shrink-0"
                  style={{ filter: `drop-shadow(0 0 22px ${isDark ? 'rgba(141,81,255,0.6)' : 'rgba(81,0,189,0.3)'})` }}
                  animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  draggable={false}
                />
              </motion.div>

              {/* ---------- Entrega (produto) ---------- */}
              {kind === 'product' && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="relative rounded-xl p-5"
                  style={{ background: panelBg, border: `1px solid ${panelBorder}`, boxShadow: panelShadow }}
                >
                  <Corners />
                  <h2 className="flex items-center gap-2 text-base font-semibold mb-4" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
                    <Truck className="w-4 h-4" style={{ color: bright }} /> Endereço de entrega
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3">
                    <div>
                      <label className={labelClass} style={{ color: mutedText }}>CEP</label>
                      <input
                        className={fieldClass}
                        style={fieldStyle}
                        inputMode="numeric"
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => setCep(formatCep(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={labelClass} style={{ color: mutedText }}>Endereço</label>
                      <input
                        className={fieldClass}
                        style={fieldStyle}
                        placeholder="Rua, avenida..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-3 mt-3">
                    <div>
                      <label className={labelClass} style={{ color: mutedText }}>Número</label>
                      <input
                        className={fieldClass}
                        style={fieldStyle}
                        placeholder="123"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value.slice(0, 8))}
                      />
                    </div>
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 text-[12px] self-end h-[46px]"
                      style={{ background: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)', color: isDark ? '#86efac' : '#15803d', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      <Package className="w-4 h-4 shrink-0" /> Frete grátis · 5 a 8 dias úteis
                    </div>
                  </div>
                </motion.section>
              )}

              {/* ---------- Pagamento ---------- */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 }}
                className="relative rounded-xl p-5"
                style={{ background: panelBg, border: `1px solid ${panelBorder}`, boxShadow: panelShadow }}
              >
                <Corners />
                <h2 className="flex items-center gap-2 text-base font-semibold mb-4" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
                  <Lock className="w-4 h-4" style={{ color: bright }} /> Pagamento
                </h2>

                {/* Carteiras digitais */}
                <div className="grid grid-cols-2 gap-3">
                  {(['apple', 'google'] as const).map((w) => (
                    <motion.button
                      key={w}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => runPayment(w)}
                      disabled={alreadyActive}
                      className="h-11 rounded-lg flex items-center justify-center gap-1.5 text-white text-[15px] font-medium transition-shadow disabled:opacity-50"
                      style={{
                        background: isDark ? '#05010a' : '#111111',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.35)' : '#111111'}`,
                        boxShadow: isDark ? '0 0 16px rgba(97,49,201,0.3)' : '0 4px 12px rgba(0,0,0,0.18)',
                      }}
                    >
                      {w === 'apple' ? (
                        <>
                          <AppleIcon size={17} /> Pay
                        </>
                      ) : (
                        <>
                          <span className="font-bold">G</span> Pay
                        </>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-4 my-4">
                  <div className="h-px flex-1" style={{ background: panelBorder }} />
                  <span className="text-[11px]" style={{ color: mutedText }}>ou pague com</span>
                  <div className="h-px flex-1" style={{ background: panelBorder }} />
                </div>

                {/* Abas com pílula animada */}
                <div
                  className="relative grid grid-cols-2 p-1 rounded-xl mb-5"
                  style={{ background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(81,0,189,0.05)', border: `1px solid ${panelBorder}` }}
                >
                  {methods.map((m) => {
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMethod(m.id);
                          setFormError(null);
                        }}
                        className="relative h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors"
                        style={{ color: active ? '#FFFFFF' : mutedText }}
                      >
                        {active && (
                          <motion.span
                            layoutId="checkout-method-pill"
                            className="absolute inset-0 rounded-lg"
                            style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', boxShadow: '0 0 18px rgba(141,81,255,0.5)' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          {m.icon}
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {method === 'card' ? (
                    <motion.div
                      key="card"
                      initial={{ opacity: 0, x: -40, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: -40, filter: 'blur(6px)' }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col gap-4"
                    >
                      <CardPreview
                        number={cardNumber}
                        holder={holder}
                        expiry={expiry}
                        cvv={cvv}
                        brand={brand}
                        flipped={cvvFocused}
                      />

                      {/* Cartões de teste */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: mutedText }}>
                        <Wand2 className="w-3.5 h-3.5" style={{ color: bright }} />
                        Cartões de teste:
                        <button
                          type="button"
                          onClick={() => {
                            setCardNumber(TEST_CARDS.approved);
                            if (!expiry) setExpiry('12/30');
                            if (!cvv) setCvv('123');
                          }}
                          className="px-2 py-0.5 rounded-md font-mono transition-colors hover:brightness-125"
                          style={{ background: 'rgba(34,197,94,0.12)', color: isDark ? '#86efac' : '#15803d' }}
                        >
                          aprovado
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCardNumber(TEST_CARDS.declined);
                            if (!expiry) setExpiry('12/30');
                            if (!cvv) setCvv('123');
                          }}
                          className="px-2 py-0.5 rounded-md font-mono transition-colors hover:brightness-125"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                        >
                          recusado
                        </button>
                      </div>

                      <div>
                        <label className={labelClass} style={{ color: mutedText }}>Número do cartão</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-number"
                            placeholder="0000 0000 0000 0000"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            className={`${fieldClass} pr-28 font-mono tracking-wider`}
                            style={fieldStyle}
                          />
                          <AnimatePresence>
                            {brand && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-black italic text-white"
                                style={{ background: 'linear-gradient(135deg, #5100BD, #8d51ff)' }}
                              >
                                {BRAND_LABEL[brand]}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass} style={{ color: mutedText }}>Nome impresso no cartão</label>
                        <input
                          type="text"
                          autoComplete="cc-name"
                          placeholder="Como está no cartão"
                          value={holder}
                          onChange={(e) => setHolder(e.target.value.slice(0, 26))}
                          className={fieldClass}
                          style={fieldStyle}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass} style={{ color: mutedText }}>Validade</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/AA"
                            value={expiry}
                            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                            className={fieldClass}
                            style={fieldStyle}
                          />
                        </div>
                        <div>
                          <label className={labelClass} style={{ color: mutedText }}>CVV</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            placeholder={brand === 'amex' ? '0000' : '000'}
                            value={cvv}
                            onFocus={() => setCvvFocused(true)}
                            onBlur={() => setCvvFocused(false)}
                            onChange={(e) => setCvv(formatCvv(e.target.value, brand))}
                            className={fieldClass}
                            style={fieldStyle}
                          />
                        </div>
                      </div>

                      {maxInstallments > 1 && (
                        <div>
                          <label className={labelClass} style={{ color: mutedText }}>Parcelas</label>
                          <select
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            className={`${fieldClass} cursor-pointer`}
                            style={fieldStyle}
                          >
                            {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n} style={{ color: '#1a1a1a' }}>
                                {n === 1 ? `À vista — ${formatBRL(total)}` : `${n}x de ${formatBRL(total / n)} sem juros`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveDetails}
                          onChange={(e) => setSaveDetails(e.target.checked)}
                          className="sr-only"
                        />
                        <motion.span
                          className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center shrink-0"
                          animate={{ scale: saveDetails ? [1, 1.2, 1] : 1 }}
                          style={{
                            background: saveDetails ? PURPLE : isDark ? 'rgba(0,0,0,0.4)' : '#FFFFFF',
                            border: `1px solid ${saveDetails ? PURPLE : fieldBorder}`,
                          }}
                        >
                          {saveDetails && <Check className="w-3 h-3 text-white" />}
                        </motion.span>
                        <span className="text-[11px]" style={{ color: mutedText }}>
                          Salvar cartão para compras futuras no Krypta.
                        </span>
                      </label>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pix"
                      initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="relative">
                        <motion.div
                          className="absolute -inset-3 rounded-2xl"
                          style={{ background: 'conic-gradient(from 0deg, #5100BD, #8d51ff, #C6AEF6, #5100BD)', filter: 'blur(14px)', opacity: 0.55 }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="relative w-48 h-48 p-3 rounded-xl bg-white overflow-hidden">
                          <FakeQr code={pixCode} color="#2a0a63" />
                          <motion.div
                            className="absolute inset-x-0 h-10 pointer-events-none"
                            style={{ background: 'linear-gradient(180deg, transparent, rgba(141,81,255,0.35), transparent)' }}
                            animate={{ top: ['-20%', '100%'] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs" style={{ color: mutedText }}>
                        <Clock className="w-3.5 h-3.5" style={{ color: bright }} />
                        Código expira em
                        <span className="font-mono font-bold" style={{ color: textMain }}>
                          {pixMM}:{pixSS}
                        </span>
                      </div>

                      <div className="w-full">
                        <label className={labelClass} style={{ color: mutedText }}>PIX copia e cola</label>
                        <div className="flex gap-2">
                          <input readOnly value={pixCode} className={`${fieldClass} font-mono text-[10.5px]`} style={fieldStyle} />
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={copyPix}
                            className="px-3 rounded-lg flex items-center gap-1.5 text-xs font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #5100BD, #8d51ff)' }}
                          >
                            {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {pixCopied ? 'Copiado' : 'Copiar'}
                          </motion.button>
                        </div>
                      </div>

                      <ol className="w-full text-[11.5px] space-y-1.5" style={{ color: mutedText }}>
                        <li>1. Abra o app do seu banco e escolha pagar com PIX.</li>
                        <li>2. Escaneie o QR Code ou cole o código.</li>
                        <li>3. Volte aqui e clique em <b style={{ color: textMain }}>“Já paguei o PIX”</b>.</li>
                      </ol>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            </div>

            {/* ===================== RESUMO ===================== */}
            <motion.aside
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full lg:sticky lg:top-28 flex flex-col gap-4"
            >
              <div
                className="relative w-full flex flex-col rounded-xl p-5 gap-4 overflow-hidden"
                style={{ background: panelBg, border: `1px solid ${panelBorder}`, boxShadow: panelShadow, backdropFilter: 'blur(20px)' }}
              >
                <Corners />
                <motion.div
                  className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(141,81,255,0.3) 0%, transparent 70%)', filter: 'blur(30px)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />

                <p className="text-[10.5px] font-bold tracking-[0.2em] uppercase" style={{ color: bright }}>
                  Resumo do pedido
                </p>

                {kind === 'plan' ? (
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', boxShadow: '0 0 20px rgba(141,81,255,0.5)' }}
                    >
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
                        {planTitle}
                      </h3>
                      <p className="text-[11.5px] leading-relaxed" style={{ color: mutedText }}>
                        {plan?.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-white p-1.5 shrink-0" style={{ border: `1px solid ${panelBorder}` }}>
                      <img src={KRYPTA_DEVICE.image} alt="" className="w-full h-full object-contain" draggable={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
                        {KRYPTA_DEVICE.shortName}
                      </h3>
                      <p className="text-[11.5px] leading-relaxed mb-2" style={{ color: mutedText }}>
                        {KRYPTA_DEVICE.description}
                      </p>
                      <div className="inline-flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${panelBorder}` }}>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-purple-500/15"
                          style={{ color: textMain }}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={quantity}
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            className="w-8 text-center text-sm font-bold"
                            style={{ color: textMain }}
                          >
                            {quantity}
                          </motion.span>
                        </AnimatePresence>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(KRYPTA_DEVICE.maxQuantity, q + 1))}
                          className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-purple-500/15"
                          style={{ color: textMain }}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {kind === 'plan' && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                    {features.map((f, idx) => (
                      <motion.li
                        key={f}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.03 }}
                        className="flex items-start gap-2 text-[11px]"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: bright }} strokeWidth={2.6} />
                        <span style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(26,26,26,0.85)' }}>{f}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}

                {alreadyActive && (
                  <div
                    className="rounded-lg p-2.5 flex items-start gap-2 text-xs"
                    style={{ background: 'rgba(141,81,255,0.12)', border: '1px solid rgba(141,81,255,0.4)', color: isDark ? '#C6AEF6' : DEEP }}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Você já possui o Krypta Pro ativo. Não é preciso assinar de novo.</span>
                  </div>
                )}

                {kind === 'product' && !!user && normalizePlan(user.plan) !== 'pro' && (
                  <div
                    className="rounded-lg p-2.5 flex items-start gap-2 text-xs"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', color: isDark ? '#fcd34d' : '#92400e' }}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Você está no Krypta Free. O dispositivo fica salvo em Minhas compras, mas só pode ser pareado no cofre com o{' '}
                      <Link to="/services#planos" className="underline font-semibold">Krypta Pro</Link>.
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4 border-t text-[12px]" style={{ borderColor: panelBorder }}>
                  <div className="flex justify-between">
                    <span style={{ color: mutedText }}>
                      {kind === 'plan'
                        ? isAnnual
                          ? 'Assinatura anual'
                          : 'Assinatura mensal'
                        : `${qty}x ${formatBRL(unitPrice)}`}
                    </span>
                    <span style={{ color: textMain }}>{formatBRL(total)}</span>
                  </div>
                  {kind === 'plan' && isAnnual && (
                    <div className="flex justify-between">
                      <span style={{ color: mutedText }}>Desconto anual</span>
                      <span className="font-semibold" style={{ color: isDark ? '#86efac' : '#15803d' }}>25% aplicado</span>
                    </div>
                  )}
                  {kind === 'product' && (
                    <div className="flex justify-between">
                      <span style={{ color: mutedText }}>Frete</span>
                      <span className="font-semibold" style={{ color: isDark ? '#86efac' : '#15803d' }}>Grátis</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end mt-1">
                    <span className="font-bold text-xs tracking-wider" style={{ color: textMain }}>TOTAL</span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={total}
                        initial={{ y: -12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        className="text-2xl font-bold"
                        style={{ color: textMain, fontFamily: ROUNDED_FONT }}
                      >
                        {formatBRL(total)}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  {kind === 'product' && method === 'card' && installments > 1 && (
                    <p className="text-right text-[11px]" style={{ color: mutedText }}>
                      em {installments}x de {formatBRL(total / installments)} sem juros
                    </p>
                  )}
                </div>

                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -3, 3, 0] }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg p-2.5 flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-400"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="button"
                  onClick={() => runPayment(method)}
                  disabled={stage === 'processing' || alreadyActive}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full h-12 rounded-xl text-[15px] font-bold text-white overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                    boxShadow: isDark ? '0 0 28px rgba(141,81,255,0.55)' : '0 8px 24px rgba(81,0,189,0.35)',
                    fontFamily: ROUNDED_FONT,
                  }}
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={payLabel}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" /> {payLabel}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>

                <div className="flex items-center justify-center gap-4 text-[10.5px]" style={{ color: mutedText }}>
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" style={{ color: bright }} /> Criptografado</span>
                  <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" style={{ color: bright }} /> Ambiente seguro</span>
                </div>
              </div>

              <p className="text-[10px] leading-relaxed px-1" style={{ color: mutedText }}>
                {kind === 'plan' ? (
                  <>
                    A assinatura será renovada {isAnnual ? 'anualmente' : 'mensalmente'} até ser cancelada, no valor de{' '}
                    {formatBRL(total)}.{' '}
                    <Link to="/settings" className="underline" style={{ color: PURPLE }}>
                      Cancele quando quiser
                    </Link>{' '}
                    em Configurações.{' '}
                  </>
                ) : (
                  <>Garantia de 12 meses. Você pode devolver o produto em até 7 dias após o recebimento. </>
                )}
                Ao continuar, você concorda com os{' '}
                <a href="#" className="underline" style={{ color: PURPLE }}>Termos de uso</a> e a{' '}
                <a href="#" className="underline" style={{ color: PURPLE }}>Política de Privacidade</a>. Esta é uma
                compra simulada para demonstração.
              </p>
            </motion.aside>
          </div>
        </div>
      </main>

      <Footer />

      {/* ============ OVERLAYS ============ */}
      <AnimatePresence>
        {stage === 'processing' && (
          <ProcessingOverlay key="processing" steps={PROCESSING_STEPS[activeMethod]} current={stepIndex} isDark={isDark} />
        )}
        {stage === 'success' && order && (
          <SuccessOverlay
            key="success"
            order={order}
            isDark={isDark}
            onPrimary={() => navigate(order.kind === 'plan' ? '/device' : '/compras')}
            onSecondary={() => navigate(order.kind === 'plan' ? '/products' : '/device')}
          />
        )}
        {stage === 'error' && (
          <ErrorOverlay
            key="error"
            kind={errorKind}
            message={errorMsg}
            isDark={isDark}
            onRetry={() => setStage('form')}
            onLogin={handleSessionLogin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}