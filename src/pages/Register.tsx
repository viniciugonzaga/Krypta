import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROUNDED_FONT, GoogleIcon, GithubIcon, useAuthTheme } from '../components/auth/authShared';

import logoTextoClaro from '../assets/logos/Krypta_de_texto.png';
import logoTextoEscuro from '../assets/logos/Krypta_de_texto2.png';

// ============================================================
// FUNDO ANIMADO: FORMAS ORGÂNICAS + MUITAS LINHAS EM LOOP
// ============================================================
interface Harmonic {
  k: number;
  a: number;
  w: number;
  p: number;
}

interface BlobCfg {
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  px: number;
  py: number;
  r: number;
  sx: number;
  sy: number;
  rot: number;
  c: number;
  h: Harmonic[];
}

const mkHarmonics = (): Harmonic[] =>
  (
    [
      [2, 0.16],
      [3, 0.11],
      [4, 0.07],
      [5, 0.04],
    ] as [number, number][]
  ).map(([k, a]) => ({ k, a, w: 0.25 + Math.random() * 0.35, p: Math.random() * Math.PI * 2 }));

const BLOB_BASE = [
  { cx: 0.22, cy: 0.3, ax: 0.1, ay: 0.08, fx: 0.11, fy: 0.09, px: 0, py: 1, r: 0.34, sx: 1.0, sy: 1.25, rot: 0.2, c: 0 },
  { cx: 0.85, cy: 0.45, ax: 0.08, ay: 0.12, fx: 0.08, fy: 0.13, px: 2, py: 0.5, r: 0.26, sx: 0.85, sy: 1.4, rot: -0.4, c: 1 },
  { cx: 0.35, cy: 0.92, ax: 0.12, ay: 0.06, fx: 0.1, fy: 0.07, px: 4, py: 2, r: 0.38, sx: 1.4, sy: 0.8, rot: 0.1, c: 2 },
  { cx: 0.7, cy: 0.1, ax: 0.09, ay: 0.07, fx: 0.14, fy: 0.1, px: 1, py: 3, r: 0.2, sx: 1.1, sy: 1.0, rot: 0.6, c: 0 },
  { cx: 0.1, cy: 0.75, ax: 0.07, ay: 0.09, fx: 0.09, fy: 0.12, px: 3, py: 5, r: 0.18, sx: 1.0, sy: 1.2, rot: -0.2, c: 1 },
];

const FILL_DARK = [
  ['rgba(130,120,255,0.55)', 'rgba(70,40,170,0.5)', 'rgba(22,8,66,0.6)'],
  ['rgba(170,110,255,0.5)', 'rgba(95,45,185,0.5)', 'rgba(30,8,75,0.6)'],
  ['rgba(210,120,255,0.55)', 'rgba(120,40,170,0.5)', 'rgba(38,8,70,0.65)'],
];

const FILL_LIGHT = [
  ['rgba(160,130,255,0.38)', 'rgba(120,80,230,0.26)', 'rgba(81,0,189,0.12)'],
  ['rgba(185,140,255,0.36)', 'rgba(130,80,230,0.26)', 'rgba(81,0,189,0.12)'],
  ['rgba(215,150,255,0.36)', 'rgba(150,80,210,0.24)', 'rgba(100,0,170,0.12)'],
];

interface Particle {
  x: number;
  y: number;
  s: number;
  sp: number;
  p: number;
}

function FlowField({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blobs: BlobCfg[] = BLOB_BASE.map((b) => ({ ...b, h: mkHarmonics() }));
    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.8 + Math.random() * 1.6,
      sp: 0.2 + Math.random() * 0.6,
      p: Math.random() * Math.PI * 2,
    }));

    const lineRgb = isDark ? '170,140,255' : '81,0,189';
    const fills = isDark ? FILL_DARK : FILL_LIGHT;
    const blend: GlobalCompositeOperation = isDark ? 'lighter' : 'source-over';

    let W = 0;
    let H = 0;
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = parent.clientWidth;
      H = parent.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const N = 72;

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const S = Math.min(W, H);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';

      if (isDark) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0b0426');
        g.addColorStop(0.55, '#160840');
        g.addColorStop(1, '#2a0b5c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        const glow = ctx.createRadialGradient(W * 0.5, H * 1.05, 0, W * 0.5, H * 1.05, H * 0.6);
        glow.addColorStop(0, 'rgba(170,70,255,0.35)');
        glow.addColorStop(1, 'rgba(170,70,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.globalCompositeOperation = blend;
      ctx.lineWidth = 1;
      const LINES = 26;
      for (let j = 0; j < LINES; j++) {
        const y0 = ((j + 0.5) / LINES) * H;
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 14) {
          const y =
            y0 +
            Math.sin(x * 0.006 + t * 0.25 + j * 0.4) * 22 +
            Math.sin(x * 0.013 - t * 0.18 + j * 0.9) * 12;
          if (x === -10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${lineRgb},${0.05 + 0.05 * Math.sin(j + t * 0.3)})`;
        ctx.stroke();
      }

      for (const b of blobs) {
        const x = (b.cx + b.ax * Math.sin(t * b.fx + b.px)) * W;
        const y = (b.cy + b.ay * Math.sin(t * b.fy + b.py)) * H;
        const ang = b.rot + 0.12 * Math.sin(t * 0.1 + b.px);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);

        const trace = (tt: number, scale: number) => {
          ctx.beginPath();
          for (let i = 0; i <= N; i++) {
            const th = (i / N) * Math.PI * 2;
            let m = 1;
            for (const h of b.h) m += h.a * Math.sin(h.k * th + h.p + h.w * tt);
            const rr = b.r * S * m * scale;
            const ux = Math.cos(th) * b.sx * rr;
            const uy = Math.sin(th) * b.sy * rr;
            const px = x + ux * ca - uy * sa;
            const py = y + ux * sa + uy * ca;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        };

        ctx.globalCompositeOperation = 'source-over';
        const R = b.r * S * Math.max(b.sx, b.sy) * 1.2;
        const col = fills[b.c];
        const grad = ctx.createRadialGradient(x - R * 0.3, y - R * 0.4, R * 0.08, x, y, R);
        grad.addColorStop(0, col[0]);
        grad.addColorStop(0.45, col[1]);
        grad.addColorStop(1, col[2]);
        trace(t, 1);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.globalCompositeOperation = blend;
        ctx.lineWidth = 1;
        for (let i = -4; i <= 16; i++) {
          if (i === 0) continue;
          const alpha = i > 0 ? 0.3 * Math.pow(1 - i / 17, 1.4) : 0.12;
          trace(t - i * 0.45, 1 + i * 0.07);
          ctx.strokeStyle = `rgba(${lineRgb},${alpha})`;
          ctx.stroke();
        }

        trace(t, 1);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isDark ? 'rgba(190,170,255,0.4)' : 'rgba(81,0,189,0.4)';
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      const ox = (0.62 + 0.12 * Math.sin(t * 0.13)) * W;
      const oy = (0.28 + 0.1 * Math.sin(t * 0.1 + 1)) * H;
      const or = S * 0.055;

      ctx.save();
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(150,80,255,0.8)';
      const og = ctx.createRadialGradient(ox - or * 0.35, oy - or * 0.35, or * 0.1, ox, oy, or);
      og.addColorStop(0, isDark ? 'rgba(170,120,255,0.95)' : 'rgba(150,100,255,0.95)');
      og.addColorStop(0.5, 'rgba(70,25,140,0.95)');
      og.addColorStop(1, 'rgba(20,5,50,0.95)');
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(ox, oy, or, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.globalCompositeOperation = blend;
      ctx.lineWidth = 1;
      [1.7, 2.3, 3.1].forEach((k, i) => {
        ctx.beginPath();
        ctx.ellipse(ox, oy, or * k, or * k * 0.35, 0.4 + 0.15 * Math.sin(t * 0.2 + i), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${lineRgb},${0.28 - i * 0.07})`;
        ctx.stroke();
      });

      for (const p of particles) {
        const py = (((p.y - t * p.sp * 0.01) % 1) + 1) % 1;
        const px = p.x + Math.sin(t * 0.3 + p.p) * 0.015;
        const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.2 + p.p));
        ctx.beginPath();
        ctx.arc(px * W, py * H, p.s, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? `rgba(200,180,255,${a})` : `rgba(81,0,189,${a * 0.7})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isDark]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

// ============================================================
// CADASTRO — PAINEL VISUAL
// ============================================================
export function RegisterVisual() {
  const { isDark } = useAuthTheme();

  return (
    <div className="relative h-full w-full flex flex-col justify-between px-10 pt-36 pb-12 overflow-hidden">
      <FlowField isDark={isDark} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to top, rgba(5,1,10,0.85) 0%, rgba(5,1,10,0.45) 30%, transparent 58%), linear-gradient(to bottom, rgba(5,1,10,0.55) 0%, transparent 20%)'
            : 'linear-gradient(to top, rgba(243,239,250,0.9) 0%, rgba(243,239,250,0.5) 30%, transparent 58%), linear-gradient(to bottom, rgba(243,239,250,0.6) 0%, transparent 20%)',
        }}
      />

      <div className="relative z-10">
        <img
          src={isDark ? logoTextoClaro : logoTextoEscuro}
          alt="KRYPTA"
          className="h-8 md:h-10 w-auto object-contain select-none"
          draggable={false}
        />
      </div>

      <div className="relative z-10 w-full mt-auto flex flex-col gap-8">
        <div className="max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-3xl xl:text-4xl font-black leading-tight mb-3"
            style={{ fontFamily: ROUNDED_FONT, color: isDark ? '#FFFFFF' : '#1a1a1a' }}
          >
            Faça parte
            <br />
            do Krypta
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-sm leading-relaxed"
            style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(26,26,26,0.75)' }}
          >
            Faça seu cadastro e garanta a segurança dos seus dados.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: isDark ? 'rgba(141,81,255,0.2)' : 'rgba(81,0,189,0.1)',
              border: `1px solid ${isDark ? 'rgba(141,81,255,0.5)' : 'rgba(81,0,189,0.3)'}`,
              color: isDark ? '#C6AEF6' : '#5100BD',
            }}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-[11px] leading-snug" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(26,26,26,0.7)' }}>
            <p className="font-semibold">Criptografia de ponta a ponta</p>
            <p style={{ opacity: 0.75 }}>Só você acessa os seus dados.</p>
          </div>
        </motion.div>

        <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,26,0.5)' }}>
          © 2026 Krypta. Todos os direitos reservados.
        </span>
      </div>
    </div>
  );
}

// ============================================================
// CADASTRO — FORMULÁRIO
// ============================================================
const STRENGTH_LABELS = ['Fraca', 'Razoável', 'Boa', 'Forte'];
const STRENGTH_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'];

function getStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s);
}

export function RegisterForm() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { isDark, inputStyle, labelStyle, mutedText, accent, divider } = useAuthTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const iconColor = isDark ? 'rgba(180,160,200,0.6)' : 'rgba(81,0,189,0.5)';

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError('Você precisa aceitar os termos e condições.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await signUp(fullName, email, password);
      navigate('/profile'); // Alterado para redirecionar ao perfil
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const socialBtn = {
    borderColor: divider,
    color: isDark ? '#FFFFFF' : '#1a1a1a',
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
  };

  return (
    <>
      <div className="mb-6">
        <h2
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: ROUNDED_FONT, color: isDark ? '#FFFFFF' : '#1a1a1a' }}
        >
          Crie sua conta
        </h2>
        <p className="text-xs" style={{ color: mutedText }}>
          Faça parte do Krypta
        </p>
      </div>

      <form onSubmit={handleRegister} className="w-full space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold tracking-wide mb-1.5" style={labelStyle}>
              NOME
            </label>
            <input
              type="text"
              placeholder="Seu nome"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full py-3 px-4 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wide mb-1.5" style={labelStyle}>
              SOBRENOME
            </label>
            <input
              type="text"
              placeholder="Seu sobrenome"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full py-3 px-4 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold tracking-wide mb-1.5" style={labelStyle}>
            E-MAIL
          </label>
          <div className="relative">
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-3 pl-4 pr-11 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2"
              style={inputStyle}
            />
            <Mail
              className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: iconColor }}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold tracking-wide mb-1.5" style={labelStyle}>
            SENHA
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Crie uma senha forte"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full py-3 pl-4 pr-11 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: isDark ? '#FFFFFF' : '#5100BD' }}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {password && (
            <div className="flex items-center gap-1.5 mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{ background: i < strength ? STRENGTH_COLORS[strength - 1] : divider }}
                />
              ))}
              <span className="text-[10px] ml-1 w-14 text-right" style={{ color: mutedText }}>
                {STRENGTH_LABELS[strength - 1]}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-purple-600 rounded cursor-pointer"
          />
          <label htmlFor="terms" className="text-[11px] leading-tight cursor-pointer" style={{ color: mutedText }}>
            Eu concordo com os{' '}
            <span className="font-semibold" style={{ color: accent }}>
              Termos e Condições
            </span>{' '}
            e a{' '}
            <span className="font-semibold" style={{ color: accent }}>
              Política de Privacidade
            </span>
            .
          </label>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-2.5 flex items-start gap-2 text-xs"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 rounded-xl font-bold text-[14px] text-white mt-1 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
            boxShadow: isDark ? '0 0 30px rgba(141,81,255,0.4)' : '0 6px 24px rgba(81,0,189,0.3)',
            fontFamily: ROUNDED_FONT,
          }}
        >
          <span className="relative z-10">{loading ? 'Criando conta...' : 'Criar conta'}</span>
          {!loading && <ArrowRight className="w-4 h-4 relative z-10" />}
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(135deg, #8d51ff 0%, #B4A0C8 100%)' }}
          />
        </motion.button>
      </form>

      <div className="w-full flex items-center gap-3 mt-5 mb-4">
        <div className="h-[1px] flex-1" style={{ background: divider }} />
        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: mutedText }}>
          ou continue com
        </span>
        <div className="h-[1px] flex-1" style={{ background: divider }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="py-2.5 rounded-xl flex items-center justify-center gap-2 border text-[12px] font-medium transition-colors hover:bg-white/5"
          style={socialBtn}
        >
          <GoogleIcon size={16} />
          Continuar com Google
        </button>
        <button
          type="button"
          className="py-2.5 rounded-xl flex items-center justify-center gap-2 border text-[12px] font-medium transition-colors hover:bg-white/5"
          style={socialBtn}
        >
          <GithubIcon size={16} />
          Continuar com GitHub
        </button>
      </div>

      <p className="text-xs mt-5 text-center" style={{ color: mutedText }}>
        Já tem uma conta?{' '}
        <Link to="/login" className="font-bold transition-colors" style={{ color: accent }}>
          Faça login
        </Link>
      </p>
    </>
  );
}