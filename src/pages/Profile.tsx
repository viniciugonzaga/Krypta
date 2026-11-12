import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

import spriteRoboAcenando from '../assets/sprites/sprite_robo_acenando.png';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const PURPLE = '#8d51ff';
const PURPLE_BRIGHT = '#a97aff';

const PARTICLES = [
  { x: '5%', y: '20%', s: 4, d: 0 },
  { x: '12%', y: '70%', s: 3, d: 1.1 },
  { x: '24%', y: '40%', s: 5, d: 0.6 },
  { x: '40%', y: '10%', s: 3, d: 2 },
  { x: '55%', y: '82%', s: 4, d: 0.3 },
  { x: '68%', y: '30%', s: 3, d: 1.6 },
  { x: '82%', y: '62%', s: 5, d: 0.9 },
  { x: '93%', y: '16%', s: 3, d: 2.4 },
  { x: '33%', y: '92%', s: 4, d: 1.8 },
  { x: '88%', y: '88%', s: 3, d: 0.4 },
];

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative inline-flex items-center shrink-0 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      style={{
        width: 40,
        height: 18,
        background: on ? '#8d51ff' : 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(141,81,255,0.7)',
        boxShadow: on ? '0 0 12px rgba(141,81,255,0.6)' : 'none',
      }}
    >
      <span
        className="absolute text-[7px] font-bold text-white"
        style={{ [on ? 'left' : 'right']: 5 } as React.CSSProperties}
      >
        {on ? 'ON' : 'OFF'}
      </span>
      <span
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200"
        style={{ width: 12, height: 12, left: on ? 24 : 2 }}
      />
    </button>
  );
}

export function Profile() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const u = (user ?? {}) as any;
  const [mfa, setMfa] = useState({
    written: !!u.mfaPassword,
    fingerprint: u.mfaFingerprint ?? true,
    nfc: u.mfaNfc ?? true,
    usb: !!u.mfaUsb,
    lastResort: u.mfaLastResort ?? true,
  });

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  const purple = isDark ? PURPLE : '#5100BD';
  const bright = isDark ? PURPLE_BRIGHT : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(26,26,26,0.75)';
  const accent = isDark ? '#B4A0C8' : '#5100BD';
  const border = isDark ? 'rgba(141,81,255,0.55)' : 'rgba(81,0,189,0.35)';
  const corner = `1.5px solid ${bright}`;
  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(25,6,55,0.9) 0%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,251,0.95) 100%)';
  const glow = isDark ? '0 0 28px rgba(97,49,201,0.35)' : '0 10px 30px rgba(81,0,189,0.12)';

  const card: React.CSSProperties = {
    background: cardBg,
    border: `1px solid ${border}`,
    boxShadow: glow,
    color: fg,
  };

  const lastAccess = formatDate(u.lastLoginAt);
  const memberSince = formatDate(u.createdAt);
  const deviceConfigured = !!u.hardwareUuid;
  const masterPasswordSet = u.masterPasswordSet ?? true;
  const firstName = (user.name ?? '').trim().split(' ')[0] || 'por aqui';

  const statusLabel: Record<string, string> = {
    ATIVA: 'Ativa',
    SUSPENSA: 'Suspensa',
    REVOGADA: 'Revogada',
    PENDENTE_VERIFICACAO: 'Pendente de verificação',
  };

  const mfaRows: { key: keyof typeof mfa; label: string }[] = [
    { key: 'written', label: 'Senha escrita' },
    { key: 'fingerprint', label: 'Digital' },
    { key: 'nfc', label: 'NFC' },
    { key: 'usb', label: 'Cabo USB' },
  ];

  const toggle = (k: keyof typeof mfa) => setMfa((s) => ({ ...s, [k]: !s[k] }));

  const enter = (i: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
  });

  const Corners = () => (
    <>
      <span className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderLeft: corner }} />
      <span className="absolute top-0 right-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderRight: corner }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderLeft: corner }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderRight: corner }} />
    </>
  );

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: 'rgb(var(--krypta-fg))' }}
    >
      <Navbar />

      {/* ============ FUNDO ACOLHEDOR ============ */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <motion.div
          className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full blur-[180px]"
          style={{ background: `${purple}40` }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[40%] right-[-12%] w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: `${purple}33` }}
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute bottom-[-18%] left-[25%] w-[700px] h-[500px] rounded-full blur-[200px]"
          style={{ background: `${purple}2e` }}
        />

        {/* Anéis suaves */}
        <svg className="absolute top-20 right-[-200px] opacity-40" width="700" height="700" viewBox="0 0 700 700" fill="none">
          {[120, 200, 280, 340].map((r, i) => (
            <circle
              key={r}
              cx="350"
              cy="350"
              r={r}
              stroke={bright}
              strokeWidth="0.8"
              strokeDasharray={i % 2 ? '3 9' : '1 0'}
              opacity={0.35 - i * 0.06}
            />
          ))}
        </svg>

        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s, background: bright, boxShadow: `0 0 12px ${bright}` }}
            animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -14, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: p.d, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* AQUI FOI AUMENTADO O PT-32 PARA PT-44 PARA NÃO COBRIR O ROBÔ */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-44 pb-16">
        {/* ============ TÍTULO + ROBÔ ACENANDO ============ */}
        <motion.header {...enter(0)} className="relative mb-8">
          <h1 className="text-4xl md:text-5xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 600, color: fg }}>
            Profile
          </h1>
          <p className="text-sm mt-1" style={{ color: muted }}>
            Veja todos os detalhes do seu perfil aqui
          </p>
          <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(90deg, ${bright}, transparent)` }} />

          {/* Robô acenando + balão de boas-vindas */}
          <div className="hidden md:flex absolute right-0 -top-14 items-end gap-2 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="relative mb-12 px-4 py-2.5 rounded-2xl rounded-br-sm text-sm"
              style={{
                background: isDark ? 'rgba(30,6,60,0.92)' : '#ffffff',
                border: `1px solid ${border}`,
                boxShadow: `0 0 22px ${purple}44`,
                color: fg,
                fontFamily: ROUNDED_FONT,
              }}
            >
              Olá, <strong>{firstName}</strong>! Está tudo certo e protegido por aqui.
            </motion.div>
            <motion.img
              src={spriteRoboAcenando}
              alt="Robô do Krypta acenando"
              draggable={false}
              className="w-32 select-none"
              style={{ filter: `drop-shadow(0 0 24px ${purple}AA)` }}
              animate={{ y: [0, -10, 0], rotate: [-2, 3, -2] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,1fr)_2fr] gap-5">
          {/* Coluna esquerda */}
          <div className="flex flex-col gap-4">
            <motion.section
              {...enter(1)}
              whileHover={{ y: -4 }}
              className="relative rounded-lg p-6 flex flex-col items-center text-center"
              style={card}
            >
              <Corners />
              <h2 className="text-xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 500 }}>
                {user.name}
              </h2>
              <p className="text-sm tracking-wide uppercase" style={{ color: muted }}>
                {user.plan}
              </p>

              {/* Avatar com anéis girando */}
              <div className="relative my-7 w-44 h-44 md:w-52 md:h-52 flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1.5px dashed ${bright}`, opacity: 0.55 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full"
                  style={{ border: `1px solid ${bright}`, opacity: 0.35 }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                    boxShadow: isDark ? '0 0 40px rgba(141,81,255,0.6)' : '0 8px 24px rgba(81,0,189,0.3)',
                  }}
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  aria-label="Ícone de usuário"
                >
                  <User className="w-16 h-16 md:w-20 md:h-20 text-white" strokeWidth={1.8} />
                </motion.div>
              </div>

              <p className="text-sm break-all" style={{ color: fg }}>
                {user.email}
              </p>

              <dl className="mt-5 w-full text-left text-xs space-y-1.5" style={{ color: muted }}>
                <div className="flex justify-between gap-3">
                  <dt>Status da conta</dt>
                  <dd className="flex items-center gap-1.5" style={{ color: fg }}>
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full animate-ping opacity-60" style={{ background: bright }} />
                      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: bright }} />
                    </span>
                    {statusLabel[u.status] ?? u.status ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Tipo de conta</dt>
                  <dd style={{ color: fg }}>{u.role === 'admin' ? 'Administrador' : 'Usuário'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Membro desde</dt>
                  <dd style={{ color: fg }}>{memberSince ?? '—'}</dd>
                </div>
              </dl>
            </motion.section>

            <motion.section {...enter(2)} whileHover={{ y: -4 }} className="relative rounded-lg px-5 py-4 text-sm" style={card}>
              <Corners />
              <p style={{ color: muted }}>Último acesso:</p>
              <p>{lastAccess ?? 'Primeiro acesso'}</p>
            </motion.section>
          </div>

          {/* Coluna direita */}
          <motion.section {...enter(2)} className="relative rounded-lg p-6 md:p-8 self-start" style={card}>
            <Corners />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 500 }}>
                Outros Detalhes
              </h2>
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
                style={{
                  background: isDark ? 'rgba(141,81,255,0.14)' : 'rgba(81,0,189,0.08)',
                  border: `1px solid ${border}`,
                  color: bright,
                  fontFamily: ROUNDED_FONT,
                  fontWeight: 600,
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Conta protegida
              </span>
            </div>
            <div className="mt-2 mb-6 h-px w-full" style={{ background: `linear-gradient(90deg, ${bright}, transparent)` }} />

            <div className="space-y-5 text-[15px]" style={{ color: muted }}>
              <p>
                Senha Mestre:{' '}
                <span style={{ color: fg }}>{masterPasswordSet ? 'Configurada' : 'Não configurada'}</span>
              </p>

              <p>Autenticação em múltiplos fatores:</p>

              {mfaRows.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <span>{row.label} -</span>
                  <Toggle on={mfa[row.key]} onChange={() => toggle(row.key)} label={row.label} />
                </div>
              ))}

              <div>
                <div className="flex items-center gap-2">
                  <span>Senha de última instância -</span>
                  <Toggle on={mfa.lastResort} onChange={() => toggle('lastResort')} label="Senha de última instância" />
                </div>
                <p className="text-sm mt-1">
                  *Apenas desligar a senha de última instância se for extremamente necessário.*
                </p>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Card inferior */}
        <motion.section
          {...enter(3)}
          className="relative mt-6 rounded-lg p-5 md:p-6 space-y-4 text-[15px] overflow-hidden"
          style={{ ...card, borderWidth: 3, borderColor: isDark ? 'rgba(141,81,255,0.8)' : 'rgba(81,0,189,0.5)' }}
        >
          <motion.div
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${purple}22, transparent)` }}
            initial={{ left: '-40%' }}
            animate={{ left: '140%' }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          />
          <p className="relative" style={{ color: muted }}>
            Dispositivo Krypta:{' '}
            <span style={{ color: fg }}>{deviceConfigured ? 'Configurado' : 'Não configurado'}</span>
            {deviceConfigured && <span style={{ color: accent }}> ({u.hardwareUuid})</span>}
          </p>
          <p className="relative" style={{ color: muted }}>
            Tema atual: <span style={{ color: fg }}>{isDark ? 'Escuro' : 'Claro'}</span>
          </p>
          <p className="relative" style={{ color: muted }}>
            Idioma: <span style={{ color: fg }}>Português</span>
          </p>
          <p className="relative" style={{ color: muted }}>Preferências de privacidade</p>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
}