import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import {
  ROUNDED_FONT,
  BAR_COLOR,
  BAR_GLOW,
  AppleIcon,
  GithubIcon,
  useAuthTheme,
} from '../components/auth/authShared';

import logoTextoClaro from '../assets/logos/Krypta_de_texto.png';
import logoTextoEscuro from '../assets/logos/Krypta_de_texto2.png';
import iconKrypta from '../assets/logos/icon_krypta.png';
import iconKryptaRoxo from '../assets/logos/icon_Krypta_roxo.png';
import spriteRoboAbraco from '../assets/sprites/sprite_robo_abraco.gif';

// ============================================================
// FUNDO ANIMADO: ONDAS DE CIRCUITOS ROXOS DESCENDO
// ============================================================
interface Pt {
  x: number;
  y: number;
  d: number;
  node: 0 | 1 | 2;
}

interface Trace {
  pts: Pt[];
  total: number;
  offset: number;
  width: number;
}

interface Wave {
  traces: Trace[];
  dist: number;
  speed: number;
  amp: number;
  freq: number;
  phase: number;
  age: number;
  trail: number;
  rgb: [number, number, number];
  maxDist: number;
}

const GRID = 16;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
const snap = (v: number) => Math.round(v / GRID) * GRID;

const PALETTE: [number, number, number][] = [
  [141, 81, 255],
  [112, 54, 220],
  [180, 140, 255],
  [127, 53, 163],
  [97, 49, 201],
];

function genPath(x0: number, W: number, H: number, y0 = -20): Pt[] {
  let x = snap(x0);
  let y = y0;
  let d = 0;
  let dir = Math.random() < 0.5 ? -1 : 1;
  let last: 'v' | 'd' | 'h' = 'v';
  const pts: Pt[] = [{ x, y, d: 0, node: 0 }];

  while (y < H + 40) {
    const r = Math.random();
    let kind: 'v' | 'd' | 'h';
    if (last === 'h') kind = r < 0.55 ? 'v' : 'd';
    else if (last === 'd') kind = r < 0.35 ? 'v' : r < 0.7 ? 'd' : 'h';
    else kind = r < 0.35 ? 'v' : r < 0.7 ? 'd' : 'h';

    if (Math.random() < 0.3) dir = -dir;

    let dx = 0;
    let dy = 0;
    if (kind === 'v') {
      dy = randInt(2, 12) * GRID;
    } else if (kind === 'd') {
      const L = randInt(2, 8) * GRID;
      dx = dir * L;
      dy = L;
    } else {
      dx = dir * randInt(1, 5) * GRID;
    }

    if (x + dx < -20 || x + dx > W + 20) {
      dir = -dir;
      dx = -dx;
    }

    x += dx;
    y += dy;
    d += Math.hypot(dx, dy);
    pts.push({
      x,
      y,
      d,
      node: Math.random() < 0.35 ? (Math.random() < 0.25 ? 2 : 1) : 0,
    });
    last = kind;
  }
  return pts;
}

function CircuitRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let raf = 0;
    let last = performance.now();
    let waves: Wave[] = [];
    let spawnIn = 0;
    let resizeTimer: number | undefined;

    const makeWave = (initialProgress = 0): Wave => {
      const count = randInt(4, 24);
      const center = rand(0.05, 0.95) * W;
      const spread = rand(0.18, 0.65) * W;
      const speed = Math.random() < 0.3 ? rand(40, 90) : rand(110, 320);
      const trail = rand(160, 620);
      const traces: Trace[] = [];

      for (let i = 0; i < count; i++) {
        const x0 = Math.min(W + 10, Math.max(-10, center + rand(-1, 1) * spread));
        const pts = genPath(x0, W, H);
        const trace: Trace = {
          pts,
          total: pts[pts.length - 1].d,
          offset: rand(0, 280),
          width: rand(0.8, 1.6),
        };
        traces.push(trace);

        const branches = Math.random() < 0.45 ? randInt(1, 2) : 0;
        for (let b = 0; b < branches; b++) {
          if (pts.length < 6) break;
          const k = randInt(2, pts.length - 4);
          pts[k].node = 2;
          const child = genPath(pts[k].x, W, H, pts[k].y);
          traces.push({
            pts: child,
            total: child[child.length - 1].d,
            offset: trace.offset + pts[k].d,
            width: rand(0.7, 1.3),
          });
        }
      }

      const maxDist = Math.max(...traces.map((t) => t.offset + t.total)) + trail;
      return {
        traces,
        dist: initialProgress,
        speed,
        amp: rand(0.15, 0.75),
        freq: rand(0.15, 0.6),
        phase: rand(0, Math.PI * 2),
        age: 0,
        trail,
        rgb: PALETTE[randInt(0, PALETTE.length - 1)],
        maxDist,
      };
    };

    const applySize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = parent.clientWidth;
      H = parent.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const rebuild = () => {
      waves = [makeWave(H * 0.75), makeWave(H * 0.3), makeWave(0)];
      spawnIn = rand(1.5, 3);
    };

    const onResize = () => {
      const nw = parent.clientWidth;
      const nh = parent.clientHeight;
      const widthChanged = Math.abs(nw - W) > 8;
      const bigHeightChange = H === 0 || Math.abs(nh - H) / Math.max(H, 1) > 0.25;
      applySize();
      if (widthChanged || bigHeightChange) rebuild();
    };

    const drawTrace = (t: Trace, w: Wave) => {
      const h = w.dist - t.offset;
      if (h <= 0) return;
      const tail = h - w.trail;
      if (tail > t.total) return;
      const [r, g, b] = w.rgb;
      const pts = t.pts;
      let headX = 0;
      let headY = 0;
      let hasHead = false;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const c = pts[i + 1];
        if (c.d < tail) continue;
        if (a.d > h) break;

        const segLen = c.d - a.d;
        const s0 = Math.max(a.d, tail);
        const s1 = Math.min(c.d, h);
        const n = Math.max(1, Math.ceil((s1 - s0) / 18));

        for (let k = 0; k < n; k++) {
          const u0 = s0 + ((s1 - s0) * k) / n;
          const u1 = s0 + ((s1 - s0) * (k + 1)) / n;
          const f0 = (u0 - a.d) / segLen;
          const f1 = (u1 - a.d) / segLen;
          const tt = Math.min(1, Math.max(0, ((u0 + u1) / 2 - tail) / w.trail));
          const alpha = Math.pow(tt, 1.8);

          ctx.beginPath();
          ctx.moveTo(a.x + (c.x - a.x) * f0, a.y + (c.y - a.y) * f0);
          ctx.lineTo(a.x + (c.x - a.x) * f1, a.y + (c.y - a.y) * f1);

          ctx.strokeStyle = `rgba(${r},${g},${b},${0.14 * alpha})`;
          ctx.lineWidth = t.width * 4;
          ctx.stroke();
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.1 + 0.75 * alpha})`;
          ctx.lineWidth = t.width;
          ctx.stroke();
        }

        if (c.d >= h && a.d <= h) {
          const f = (h - a.d) / segLen;
          headX = a.x + (c.x - a.x) * f;
          headY = a.y + (c.y - a.y) * f;
          hasHead = true;
        }
      }

      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (!p.node || p.d < tail || p.d > h) continue;
        const tt = (p.d - tail) / w.trail;
        const alpha = 0.15 + 0.7 * tt;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.node === 2 ? 4.5 : 2.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},255,${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        if (p.node === 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(230,210,255,${alpha})`;
          ctx.fill();
        }
      }

      if (hasHead) {
        ctx.beginPath();
        ctx.arc(headX, headY, 9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(headX, headY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(headX, headY, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240,225,255,0.95)';
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      spawnIn -= dt;
      if (spawnIn <= 0 && waves.length < 7) {
        waves.push(makeWave());
        spawnIn = Math.random() < 0.25 ? rand(0.3, 1) : rand(1.5, 6);
      }

      for (const w of waves) {
        w.age += dt;
        const mod = 1 + w.amp * Math.sin(w.age * w.freq * Math.PI * 2 + w.phase);
        w.dist += w.speed * mod * dt;
        for (const t of w.traces) drawTrace(t, w);
      }
      waves = waves.filter((w) => w.dist < w.maxDist);

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };

    onResize();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(onResize, 200);
    });
    ro.observe(parent);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.95 }} />;
}

// ============================================================
// LOGIN — PAINEL VISUAL
// ============================================================
export function LoginVisual() {
  const { isDark } = useAuthTheme();

  return (
    <div className="relative h-full w-full flex flex-col justify-between px-10 pt-28 pb-12 overflow-hidden">
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 25% 15%, rgba(49,7,136,0.55) 0%, rgba(26,5,51,0.35) 40%, transparent 70%)'
            : 'radial-gradient(ellipse at 25% 15%, rgba(81,0,189,0.1) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 75% 85%, rgba(35,6,70,0.75) 0%, rgba(12,2,26,0.4) 45%, transparent 75%)'
            : 'radial-gradient(ellipse at 75% 85%, rgba(81,0,189,0.05) 0%, transparent 75%)',
        }}
        animate={{ opacity: [0.9, 0.3, 0.9], scale: [1.05, 1, 1.05] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark ? 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.65), transparent 70%)' : 'transparent',
        }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      <CircuitRain />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to top, rgba(3,0,8,0.95) 0%, rgba(3,0,8,0.7) 25%, rgba(3,0,8,0.15) 50%, transparent 60%), linear-gradient(to bottom, rgba(3,0,8,0.85) 0%, rgba(3,0,8,0.4) 12%, transparent 25%)'
            : 'linear-gradient(to top, rgba(243,239,250,0.95) 0%, rgba(243,239,250,0.7) 25%, rgba(243,239,250,0.15) 50%, transparent 60%), linear-gradient(to bottom, rgba(243,239,250,0.85) 0%, rgba(243,239,250,0.4) 12%, transparent 25%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: isDark ? 'inset 0 0 120px 20px rgba(0,0,0,0.6)' : 'inset 0 0 120px 20px rgba(255,255,255,0.3)',
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

      <div className="relative z-10 w-full mt-auto flex flex-col gap-6">
        <div className="grid grid-cols-[auto_auto] justify-start items-center gap-6 xl:gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="pl-5 mb-3"
              style={{ borderLeft: `3px solid ${BAR_COLOR}` }}
            >
              <h2
                className="text-3xl xl:text-4xl font-black leading-tight"
                style={{ fontFamily: ROUNDED_FONT, color: isDark ? '#FFFFFF' : '#1a1a1a' }}
              >
                Bem-vindo
                <br />
                de Volta
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xs leading-relaxed"
              style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,26,0.7)' }}
            >
              Que bom te ver novamente.
              <br />
              Vamos continuar de onde você parou.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-24 h-24 xl:w-28 xl:h-28 rounded-3xl flex items-center justify-center overflow-hidden relative bg-[#05010a]"
            style={{
              border: `2px solid ${BAR_COLOR}`,
              boxShadow: `0 0 22px ${BAR_GLOW}`,
            }}
          >
            <img src={spriteRoboAbraco} alt="Robô Abraço" className="w-full h-full object-cover" />
          </motion.div>
        </div>

        <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,26,0.5)' }}>
          © 2026 Krypta. Todos os direitos reservados.
        </span>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN — FORMULÁRIO
// ============================================================
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [glitchStage, setGlitchStage] = useState(0);

  const { signIn, signInWithSocial } = useAuth();
  const navigate = useNavigate();
  const { isDark, inputStyle, labelStyle, mutedText, accent, divider } = useAuthTheme();

  useEffect(() => {
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => active && fn(), ms));
    };

    const triggerGlitch = () => {
      setGlitchStage(1);
      later(() => setGlitchStage(2), 250);
      later(() => setGlitchStage(3), 400);
      later(() => setGlitchStage(4), 600);
      later(() => setGlitchStage(5), 800);
      later(() => setGlitchStage(6), 1000);
      later(() => setGlitchStage(0), 1500);
    };

    const scheduleNextGlitch = () => {
      later(() => {
        triggerGlitch();
        scheduleNextGlitch();
      }, 6000 + Math.random() * 8000);
    };

    later(scheduleNextGlitch, 3000);

    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/profile'); // Redireciona para o perfil
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    setLoading(true);
    try {
      if (credentialResponse.credential) {
        await signInWithSocial('google', credentialResponse.credential);
        navigate('/profile');
      } else {
        throw new Error('Token do Google não recebido.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        className="w-full flex flex-col items-center p-6 md:p-8 rounded-3xl border"
        style={{
          background: isDark ? 'rgba(15, 3, 30, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDark ? 'rgba(141, 81, 255, 0.3)' : 'rgba(81, 0, 189, 0.2)',
          backdropFilter: 'blur(20px)',
        }}
        animate={{
          boxShadow: isDark
            ? [
                '0 0 20px rgba(141,81,255,0.1), inset 0 0 10px rgba(141,81,255,0.05)',
                '0 0 40px rgba(141,81,255,0.4), inset 0 0 20px rgba(141,81,255,0.15)',
                '0 0 20px rgba(141,81,255,0.1), inset 0 0 10px rgba(141,81,255,0.05)',
              ]
            : [
                '0 0 20px rgba(81,0,189,0.05), inset 0 0 10px rgba(81,0,189,0.02)',
                '0 0 30px rgba(81,0,189,0.2), inset 0 0 15px rgba(81,0,189,0.1)',
                '0 0 20px rgba(81,0,189,0.05), inset 0 0 10px rgba(81,0,189,0.02)',
              ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative w-16 h-16 mb-4 overflow-hidden flex items-center justify-center">
          <motion.img
            src={iconKrypta}
            alt="Krypta"
            className="absolute w-full h-full object-contain select-none"
            draggable={false}
            animate={{
              opacity: glitchStage === 1 || glitchStage === 3 || glitchStage === 5 ? 0 : 1,
              clipPath:
                glitchStage === 2
                  ? 'inset(20% 0 40% 0)'
                  : glitchStage === 4
                  ? 'inset(60% 0 10% 0)'
                  : 'inset(0 0 0 0)',
              x: glitchStage === 1 ? -4 : glitchStage === 3 ? 4 : glitchStage === 5 ? -2 : 0,
              y: glitchStage === 2 ? 2 : glitchStage === 4 ? -2 : 0,
            }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
          <motion.img
            src={iconKryptaRoxo}
            alt="Krypta Roxo"
            className="absolute w-full h-full object-contain select-none"
            draggable={false}
            animate={{
              opacity: glitchStage === 1 || glitchStage === 3 || glitchStage === 5 ? 1 : 0,
              clipPath:
                glitchStage === 2
                  ? 'inset(60% 0 10% 0)'
                  : glitchStage === 4
                  ? 'inset(20% 0 40% 0)'
                  : 'inset(0 0 0 0)',
              x: glitchStage === 1 ? 4 : glitchStage === 3 ? -4 : glitchStage === 5 ? 2 : 0,
              y: glitchStage === 2 ? -2 : glitchStage === 4 ? 2 : 0,
            }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>

        <h2
          className="text-2xl font-bold mb-1 text-center"
          style={{ fontFamily: ROUNDED_FONT, color: isDark ? '#FFFFFF' : '#1a1a1a' }}
        >
          Login
        </h2>
        <p className="text-xs mb-6 text-center" style={{ color: mutedText }}>
          Acesse sua conta para continuar.
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-3">
          <div>
            <label className="block text-[11px] font-semibold tracking-wide mb-1.5" style={labelStyle}>
              E-MAIL
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: isDark ? 'rgba(180,160,200,0.6)' : 'rgba(81,0,189,0.5)' }}
              />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full py-3 pl-11 pr-4 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide mb-1.5" style={labelStyle}>
              SENHA
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: isDark ? 'rgba(180,160,200,0.6)' : 'rgba(81,0,189,0.5)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full py-3 pl-11 pr-12 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2"
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
          </div>

          <div className="flex justify-end">
            <Link to="/recover" className="text-[11px] transition-colors hover:underline" style={{ color: accent }}>
              Esqueceu a senha?
            </Link>
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
            className="w-full py-3 rounded-xl font-bold text-[14px] text-white mt-2 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
              boxShadow: isDark ? '0 0 30px rgba(141,81,255,0.4)' : '0 6px 24px rgba(81,0,189,0.3)',
              fontFamily: ROUNDED_FONT,
            }}
          >
            <span className="relative z-10">{loading ? 'Entrando...' : 'Entrar'}</span>
            {!loading && <ArrowRight className="w-4 h-4 relative z-10" />}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, #8d51ff 0%, #B4A0C8 100%)' }}
            />
          </motion.button>
        </form>
      </motion.div>

      <div className="w-full flex items-center gap-3 mt-6 mb-4">
        <div className="h-[1px] flex-1" style={{ background: divider }} />
        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: mutedText }}>
          ou continue com
        </span>
        <div className="h-[1px] flex-1" style={{ background: divider }} />
      </div>

      <div className="flex gap-3 w-full justify-center items-center">
        {/* Botão do Google usando a biblioteca oficial */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Falha ao autenticar com o Google.')}
            type="icon"
            shape="circle"
            theme={isDark ? 'filled_black' : 'outline'}
          />
        </div>

        {/* Botões de Apple e GitHub (desativados por enquanto) */}
        <button
          type="button"
          disabled
          aria-label="Entrar com Apple"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 opacity-50 cursor-not-allowed"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${divider}`,
            color: accent,
          }}
        >
          <AppleIcon />
        </button>
        <button
          type="button"
          disabled
          aria-label="Entrar com GitHub"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 opacity-50 cursor-not-allowed"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${divider}`,
            color: accent,
          }}
        >
          <GithubIcon />
        </button>
      </div>

      <p className="text-xs mt-4 text-center" style={{ color: mutedText }}>
        Não tem uma conta?{' '}
        <Link to="/register" className="font-bold transition-colors" style={{ color: accent }}>
          Cadastre-se
        </Link>
      </p>
    </>
  );
}