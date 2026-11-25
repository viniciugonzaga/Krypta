// src/pages/Profile.tsx
// ============================================================
// MEU PERFIL (/profile)
//
// Tudo aqui conversa com o servidor:
//   • Identidade      → editar nome/e-mail           (PUT  /users/me)
//   • Assinatura      → plano, recursos, cancelar Pro (POST /plans/cancel)  #assinatura
//   • Cofre           → estado, dispositivo, herança  (dados do /users/me)
//   • Segurança       → trocar senha, sair de tudo, atividade recente
//   • Zona de perigo  → excluir a conta              (DELETE /users/me)
//
// Os recursos do Pro são bloqueados no SERVIDOR (server/src/config/planos.ts);
// esta tela só mostra o que o plano libera.
// ============================================================
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Cpu,
  Crown,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Package,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
  Users,
  X,
  Camera,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { OrdersAPI, UserAPI, handleApiError, type EventoConta, type Pedido } from '../services/api';
import { Avisos } from '../services/avisos';
import { EditorFoto, FotoPerfil } from '../components/FotoPerfil';
import { CodyCard } from '../ajuda/CodyCard';
import { getPlanFullName, isProPlan, recursosDoPlano } from '../utils/plan';

import spriteRoboAcenando from '../assets/cody/cody_acenando.webp';
import { Dica } from '../components/Dica';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PARTICLES = [
  { x: '4%', y: '18%', s: 4, d: 0 },
  { x: '12%', y: '72%', s: 3, d: 1.1 },
  { x: '23%', y: '38%', s: 5, d: 0.6 },
  { x: '41%', y: '8%', s: 3, d: 2 },
  { x: '56%', y: '84%', s: 4, d: 0.3 },
  { x: '69%', y: '28%', s: 3, d: 1.6 },
  { x: '83%', y: '60%', s: 5, d: 0.9 },
  { x: '94%', y: '14%', s: 3, d: 2.4 },
  { x: '34%', y: '94%', s: 4, d: 1.8 },
  { x: '89%', y: '90%', s: 3, d: 0.4 },
];

const ESTADO_COFRE: Record<string, { rotulo: string; cor: string }> = {
  PENDENTE_PAREAMENTO: { rotulo: 'Aguardando pareamento', cor: '#f59e0b' },
  ATIVA: { rotulo: 'Ativo e protegido', cor: '#22c55e' },
  REVOGADA: { rotulo: 'Dispositivo bloqueado (Kill Switch)', cor: '#f87171' },
  RECUPERACAO_LOCAL: { rotulo: 'Em recuperação', cor: '#f59e0b' },
  RECUPERACAO_HARDWARE: { rotulo: 'Novo dispositivo em recuperação', cor: '#f59e0b' },
};

const RECURSOS_LISTA: Array<{ chave: 'dispositivoFisico' | 'killSwitch' | 'heranca' | 'alertasAcesso'; rotulo: string }> = [
  { chave: 'dispositivoFisico', rotulo: 'Dispositivo Krypta físico' },
  { chave: 'killSwitch', rotulo: 'Kill Switch (bloqueio remoto)' },
  { chave: 'heranca', rotulo: 'Herança digital' },
  { chave: 'alertasAcesso', rotulo: 'Alertas de acesso' },
];

const fmtData = (v?: string | null, comHora = true) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', comHora ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'long' });
};
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ============================================================
// TEMA
// ============================================================
function useCores() {
  const { isDark } = useTheme();
  return useMemo(() => {
    const bright = isDark ? '#a97aff' : '#6131C9';
    return {
      isDark,
      bright,
      purple: isDark ? '#8d51ff' : '#5100BD',
      fg: isDark ? '#FFFFFF' : '#1a1a1a',
      muted: isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.7)',
      border: isDark ? 'rgba(141,81,255,0.45)' : 'rgba(81,0,189,0.22)',
      corner: `1.5px solid ${bright}`,
      cardBg: isDark
        ? 'linear-gradient(160deg, rgba(25,6,55,0.9) 0%, rgba(0,0,0,0.86) 100%)'
        : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,251,0.95) 100%)',
      glow: isDark ? '0 0 28px rgba(97,49,201,0.3)' : '0 10px 30px rgba(81,0,189,0.1)',
      fieldBg: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.95)',
    };
  }, [isDark]);
}
type Cores = ReturnType<typeof useCores>;

// ============================================================
// PEÇAS
// ============================================================
function Cantos({ c }: { c: Cores }) {
  return (
    <>
      <span className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: c.corner, borderLeft: c.corner }} />
      <span className="absolute top-0 right-0 w-3 h-3 pointer-events-none" style={{ borderTop: c.corner, borderRight: c.corner }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" style={{ borderBottom: c.corner, borderLeft: c.corner }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: c.corner, borderRight: c.corner }} />
    </>
  );
}

function Cartao({
  c,
  id,
  i,
  titulo,
  icone,
  extra,
  destaque,
  children,
}: {
  c: Cores;
  id?: string;
  i: number;
  titulo: string;
  icone: ReactNode;
  extra?: ReactNode;
  destaque?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-xl p-5 md:p-6 scroll-mt-28 overflow-hidden"
      style={{
        background: c.cardBg,
        border: `1px solid ${destaque ? c.bright : c.border}`,
        boxShadow: destaque ? `0 0 40px ${c.purple}55` : c.glow,
        color: c.fg,
      }}
    >
      <Cantos c={c} />
      {destaque && (
        <motion.div
          className="absolute inset-y-0 w-1/3 pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${c.purple}26, transparent)` }}
          initial={{ left: '-40%' }}
          animate={{ left: '140%' }}
          transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        />
      )}
      <div className="relative flex items-center justify-between gap-3 mb-1">
        <h2 className="text-lg md:text-xl flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT, fontWeight: 600 }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: GRAD }}>
            {icone}
          </span>
          {titulo}
        </h2>
        {extra}
      </div>
      <div className="relative h-px w-full mb-4 mt-2" style={{ background: `linear-gradient(90deg, ${c.bright}, transparent)` }} />
      <div className="relative">{children}</div>
    </motion.section>
  );
}

function Linha({ c, rotulo, children }: { c: Cores; rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm" style={{ borderBottom: `1px dashed ${c.border}` }}>
      <span style={{ color: c.muted }}>{rotulo}</span>
      <span className="text-right font-medium min-w-0 truncate">{children}</span>
    </div>
  );
}

function Campo({
  c,
  rotulo,
  icone,
  ...props
}: { c: Cores; rotulo: string; icone?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: c.muted }}>
        {rotulo}
      </span>
      <span className="relative block">
        {icone && <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.bright }}>{icone}</span>}
        <input
          {...props}
          className={`w-full py-2.5 ${icone ? 'pl-10' : 'pl-3.5'} pr-3.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/50`}
          style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.fg }}
        />
      </span>
    </label>
  );
}

function Botao({
  c,
  variante = 'primario',
  carregando,
  children,
  ...props
}: {
  c: Cores;
  variante?: 'primario' | 'secundario' | 'perigo';
  carregando?: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const estilo: CSSProperties =
    variante === 'primario'
      ? { background: GRAD, color: '#fff', boxShadow: '0 0 18px rgba(141,81,255,0.35)' }
      : variante === 'perigo'
        ? { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.45)' }
        : { border: `1px solid ${c.bright}`, color: c.bright };
  return (
    <button
      {...props}
      disabled={props.disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${props.className ?? ''}`}
      style={{ fontFamily: ROUNDED_FONT, ...estilo }}
    >
      {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function Aviso({ tipo, children }: { tipo: 'ok' | 'erro'; children: ReactNode }) {
  const ok = tipo === 'ok';
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg p-3 flex items-start gap-2 text-sm"
      style={{
        background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${ok ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
        color: ok ? '#22c55e' : '#f87171',
      }}
    >
      {ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{children}</span>
    </motion.div>
  );
}

function Modal({ c, aberto, onFechar, children }: { c: Cores; aberto: boolean; onFechar: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={onFechar}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl p-6"
            style={{ background: c.isDark ? 'linear-gradient(160deg, #1e063c 0%, #050010 100%)' : '#fff', border: `1px solid ${c.bright}`, color: c.fg }}
          >
            <button type="button" onClick={onFechar} aria-label="Fechar" className="absolute top-3 right-3 p-1 rounded-md" style={{ color: c.muted }}>
              <X className="w-4 h-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// PÁGINA
// ============================================================
export function Profile() {
  const { user, updateUser, cancelPlan, signOut } = useAuth();
  const c = useCores();
  const navigate = useNavigate();
  const location = useLocation();

  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [atividade, setAtividade] = useState<EventoConta[] | null>(null);

  // identidade
  const [editando, setEditando] = useState(false);
  const [editarFoto, setEditarFoto] = useState(false);
  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConf, setSenhaConf] = useState('');
  const [verSenhas, setVerSenhas] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<string | null>(null);

  // modais
  const [modal, setModal] = useState<'cancelar' | 'sessoes' | 'excluir' | null>(null);
  const [senhaModal, setSenhaModal] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [ocupadoModal, setOcupadoModal] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [msgAssinatura, setMsgAssinatura] = useState<string | null>(null);

  useEffect(() => {
    OrdersAPI.list().then(setPedidos).catch(() => setPedidos([]));
    UserAPI.audit()
      .then((ev) => {
        setAtividade(ev);
        if (user) Avisos.marcarLidas(user.id, ev);
      })
      .catch(() => setAtividade([]));
  }, []);

  // Veio de "Gerenciar assinatura"? Rola até o cartão
  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
    return () => clearTimeout(t);
  }, [location.hash]);

  if (!user) return null;

  const pro = isProPlan(user.plan);
  const recursos = recursosDoPlano(user.plan);
  const estado = ESTADO_COFRE[user.estadoCofre ?? 'PENDENTE_PAREAMENTO'] ?? ESTADO_COFRE.PENDENTE_PAREAMENTO;
  const assinatura = pedidos?.find((p) => p.tipo === 'PLANO' && p.status === 'APROVADO') ?? null;
  const compras = pedidos?.filter((p) => p.tipo === 'PRODUTO').length ?? 0;
  const diasMembro = user.createdAt ? Math.max(1, Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000)) : null;
  const primeiroNome = user.name.trim().split(' ')[0] || 'por aqui';

  const fecharModal = () => {
    setModal(null);
    setSenhaModal('');
    setConfirmacao('');
    setErroModal(null);
  };

  // ---------- ações ----------
  const salvarPerfil = async () => {
    setMsgPerfil(null);
    if (nome.trim().length < 2) return setMsgPerfil({ tipo: 'erro', texto: 'O nome precisa ter pelo menos 2 letras.' });
    if (!EMAIL_RE.test(email.trim())) return setMsgPerfil({ tipo: 'erro', texto: 'E-mail inválido.' });
    setSalvandoPerfil(true);
    try {
      const atualizado = await UserAPI.update({ name: nome.trim(), email: email.trim().toLowerCase() });
      updateUser(atualizado);
      setEditando(false);
      setMsgPerfil({ tipo: 'ok', texto: 'Perfil atualizado.' });
    } catch (err) {
      setMsgPerfil({ tipo: 'erro', texto: handleApiError(err).message });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgSenha(null);
    if (senhaNova.length < 8) return setMsgSenha('A nova senha precisa ter pelo menos 8 caracteres.');
    if (senhaNova !== senhaConf) return setMsgSenha('A confirmação não bate com a nova senha.');
    if (senhaNova === senhaAtual) return setMsgSenha('A nova senha deve ser diferente da atual.');
    setTrocandoSenha(true);
    try {
      await UserAPI.changePassword(senhaAtual, senhaNova);
      // O servidor encerra todas as sessões: entra de novo com a senha nova
      sessionStorage.setItem('krypta:aviso-login', 'Senha alterada! Entre de novo com a nova senha.');
      navigate('/login', { replace: true });
      signOut();
    } catch (err) {
      setMsgSenha(handleApiError(err).message);
      setTrocandoSenha(false);
    }
  };

  const confirmarModal = async () => {
    setErroModal(null);
    setOcupadoModal(true);
    try {
      if (modal === 'cancelar') {
        await cancelPlan(senhaModal);
        setPedidos(await OrdersAPI.list().catch(() => pedidos));
        setMsgAssinatura('Assinatura cancelada. Você está no Krypta Free.');
        fecharModal();
      } else if (modal === 'sessoes') {
        await UserAPI.revokeSessions();
        sessionStorage.setItem('krypta:aviso-login', 'Você saiu de todos os dispositivos. Entre de novo.');
        navigate('/login', { replace: true });
        signOut();
      } else if (modal === 'excluir') {
        await UserAPI.remove(senhaModal);
        signOut();
        navigate('/', { replace: true });
      }
    } catch (err) {
      setErroModal(handleApiError(err).message);
    } finally {
      setOcupadoModal(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: c.fg }}>
      <Navbar />
      <EditorFoto aberto={editarFoto} onFechar={() => setEditarFoto(false)} />

      {/* ============ FUNDO ============ */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <motion.div
          className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full blur-[180px]"
          style={{ background: `${c.purple}40` }}
          animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.08, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[45%] right-[-12%] w-[600px] h-[600px] rounded-full blur-[180px]"
          style={{ background: `${c.purple}33` }}
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.svg
          className="absolute top-24 right-[-220px] opacity-40"
          width="720"
          height="720"
          viewBox="0 0 720 720"
          fill="none"
          animate={{ rotate: 360 }}
          transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
        >
          {[130, 210, 290, 350].map((r, i) => (
            <circle key={r} cx="360" cy="360" r={r} stroke={c.bright} strokeWidth="0.8" strokeDasharray={i % 2 ? '3 9' : '1 0'} opacity={0.35 - i * 0.06} />
          ))}
        </motion.svg>
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s, background: c.bright, boxShadow: `0 0 12px ${c.bright}` }}
            animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -16, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, delay: p.d, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-40 pb-16">
        <Dica id="perfil-foto-v14" titulo="Escolha seu avatar (opcional)" className="mb-6">
          Toque na foto para escolher um dos 12 Codys e a cor do fundo, ou enviar uma foto sua. Em <strong>Segurança da conta</strong> você vê onde a conta está aberta e pode sair de todos os aparelhos.
        </Dica>
        {/* ============ TÍTULO + ROBÔ ============ */}
        <motion.header initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative mb-8">
          <p className="text-xs font-bold tracking-[0.25em] uppercase mb-1" style={{ color: c.bright }}>Minha conta</p>
          <h1 className="text-4xl md:text-5xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>
            Meu perfil
          </h1>
          <p className="text-sm mt-1" style={{ color: c.muted }}>Seus dados, sua assinatura e a segurança da conta em um só lugar.</p>
          <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(90deg, ${c.bright}, transparent)` }} />

          <div className="hidden md:flex absolute right-0 -top-16 items-end gap-2 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="relative mb-12 px-4 py-2.5 rounded-2xl rounded-br-sm text-sm"
              style={{ background: c.isDark ? 'rgba(30,6,60,0.92)' : '#ffffff', border: `1px solid ${c.border}`, boxShadow: `0 0 22px ${c.purple}44`, fontFamily: ROUNDED_FONT }}
            >
              Olá, <strong>{primeiroNome}</strong>!{' '}
              {user.estadoCofre === 'ATIVA' ? 'Seu cofre está protegido.' : 'Vamos deixar seu cofre pronto?'}
            </motion.div>
            <motion.img
              src={spriteRoboAcenando}
              alt="Robô do Krypta acenando"
              draggable={false}
              className="w-32 select-none"
              style={{ filter: `drop-shadow(0 0 24px ${c.purple}AA)` }}
              animate={{ y: [0, -10, 0], rotate: [-2, 3, -2] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.header>

        {/* ============ NÚMEROS ============ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icone: <Crown className="w-4 h-4" />, rotulo: 'Plano', valor: pro ? 'Pro' : 'Free' },
            { icone: <ShieldCheck className="w-4 h-4" />, rotulo: 'Cofre', valor: user.estadoCofre === 'ATIVA' ? 'Ativo' : user.estadoCofre === 'PENDENTE_PAREAMENTO' ? 'Pendente' : 'Atenção' },
            { icone: <Package className="w-4 h-4" />, rotulo: 'Compras', valor: pedidos ? String(compras) : '…' },
            { icone: <Calendar className="w-4 h-4" />, rotulo: 'Dias com a gente', valor: diasMembro ? String(diasMembro) : '—' },
          ].map((n, i) => (
            <motion.div
              key={n.rotulo}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              whileHover={{ y: -4 }}
              className="relative rounded-xl p-4 overflow-hidden"
              style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: c.glow }}
            >
              <span className="absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl" style={{ background: `${c.purple}55` }} />
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider" style={{ color: c.muted }}>
                <span style={{ color: c.bright }}>{n.icone}</span> {n.rotulo}
              </span>
              <span className="block text-2xl mt-1 font-bold" style={{ fontFamily: ROUNDED_FONT }}>{n.valor}</span>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
          {/* ================= COLUNA ESQUERDA ================= */}
          <div className="flex flex-col gap-5">
            {/* Identidade */}
            <motion.section
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative rounded-xl p-6 text-center overflow-hidden"
              style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: c.glow }}
            >
              <Cantos c={c} />
              {/* Avatar com anéis e órbitas */}
              <div className="relative mx-auto my-3 w-44 h-44 flex items-center justify-center">
                <motion.div className="absolute inset-0 rounded-full" style={{ border: `1.5px dashed ${c.bright}`, opacity: 0.55 }} animate={{ rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: 'linear' }} />
                <motion.div className="absolute inset-3 rounded-full" style={{ border: `1px solid ${c.bright}`, opacity: 0.35 }} animate={{ rotate: -360 }} transition={{ duration: 38, repeat: Infinity, ease: 'linear' }} />
                <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}>
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ background: c.bright, boxShadow: `0 0 12px ${c.bright}` }} />
                </motion.div>
                <motion.div className="absolute inset-3" animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: '#C6AEF8', boxShadow: '0 0 10px #C6AEF8' }} />
                </motion.div>
                <motion.button
                  type="button"
                  onClick={() => setEditarFoto(true)}
                  aria-label="Trocar foto de perfil"
                  title="Trocar foto de perfil"
                  className="group relative w-32 h-32 rounded-full select-none"
                  style={{ boxShadow: c.isDark ? '0 0 44px rgba(141,81,255,0.65)' : '0 10px 26px rgba(81,0,189,0.35)' }}
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FotoPerfil avatar={user.avatarUrl} nome={user.name} tamanho={128} />
                  <span className="absolute inset-0 rounded-full flex items-center justify-center bg-black/45 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 mr-1" /> Trocar
                  </span>
                </motion.button>
                {pro && (
                  <motion.span
                    className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #C6AEF8, #8d51ff)', boxShadow: '0 0 16px rgba(141,81,255,0.7)' }}
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    title="Krypta Pro"
                  >
                    <Crown className="w-4 h-4 text-white" />
                  </motion.span>
                )}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {!editando ? (
                  <motion.div key="ver" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <h2 className="text-xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 600 }}>{user.name}</h2>
                    <p className="text-sm break-all" style={{ color: c.muted }}>{user.email}</p>
                    <button type="button" onClick={() => setEditarFoto(true)} className="mt-1 text-xs font-semibold underline underline-offset-4" style={{ color: c.bright }}>
                      {user.avatarUrl ? 'Trocar foto ou avatar' : 'Escolher um avatar do Cody'}
                    </button>
                    <span
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold"
                      style={pro ? { background: GRAD, color: '#fff', boxShadow: '0 0 16px rgba(141,81,255,0.5)' } : { border: `1px solid ${c.border}`, color: c.muted }}
                    >
                      {pro ? <Sparkles className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />} {getPlanFullName(user.plan)}
                    </span>
                    <div className="mt-4">
                      <Botao c={c} variante="secundario" onClick={() => { setNome(user.name); setEmail(user.email); setMsgPerfil(null); setEditando(true); }}>
                        <Pencil className="w-4 h-4" /> Editar dados
                      </Botao>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="editar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 text-left">
                    <Campo c={c} rotulo="Nome" icone={<UserIcon className="w-4 h-4" />} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
                    <Campo c={c} rotulo="E-mail" icone={<Mail className="w-4 h-4" />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                    <div className="flex gap-2">
                      <Botao c={c} className="flex-1" carregando={salvandoPerfil} onClick={salvarPerfil}>Salvar</Botao>
                      <Botao c={c} variante="secundario" onClick={() => { setEditando(false); setMsgPerfil(null); }}>Cancelar</Botao>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {msgPerfil && <div className="mt-3 text-left"><Aviso tipo={msgPerfil.tipo}>{msgPerfil.texto}</Aviso></div>}

              <dl className="mt-5 text-left">
                <Linha c={c} rotulo="Status da conta">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full animate-ping opacity-60 bg-green-500" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
                    </span>
                    {user.status === 'ATIVA' ? 'Ativa' : user.status}
                  </span>
                </Linha>
                <Linha c={c} rotulo="Membro desde">{fmtData(user.createdAt, false) ?? '—'}</Linha>
                <Linha c={c} rotulo="Último acesso">{fmtData(user.lastLoginAt) ?? 'Agora'}</Linha>
              </dl>
            </motion.section>

            {/* Cofre */}
            <Cartao c={c} i={2} titulo="Cofre e dispositivo" icone={<Lock className="w-4 h-4" />}>
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: estado.cor, boxShadow: `0 0 10px ${estado.cor}` }} />
                {estado.rotulo}
              </div>
              <Linha c={c} rotulo="Dispositivo">
                {user.dispositivoPareado
                  ? user.tipoDispositivo === 'FISICO'
                    ? <span className="font-mono text-xs">{user.hardwareUuid}</span>
                    : 'Software'
                  : 'Nenhum'}
              </Linha>
              {user.estadoCofre !== 'PENDENTE_PAREAMENTO' && (
                <>
                  {pro && <Linha c={c} rotulo="Herança digital">{user.herancaAtiva ? 'Ativa' : 'Desativada'}</Linha>}
                  <Linha c={c} rotulo="Última sincronização">{fmtData(user.ultimoSincronismo) ?? '—'}</Linha>
                </>
              )}
              <div className="grid grid-cols-1 gap-2 mt-4">
                <Link to="/device" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: GRAD }}>
                  <span className="flex items-center gap-2"><Cpu className="w-4 h-4" /> {user.estadoCofre === 'PENDENTE_PAREAMENTO' ? 'Parear meu dispositivo' : 'Abrir Meu Krypta'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link to="/compras" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold" style={{ border: `1px solid ${c.border}` }}>
                  <span className="flex items-center gap-2"><Package className="w-4 h-4" style={{ color: c.bright }} /> Minhas compras</span>
                  <ChevronRight className="w-4 h-4" style={{ color: c.muted }} />
                </Link>
                <Link to="/como-funciona" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold" style={{ border: `1px solid ${c.border}` }}>
                  <span className="flex items-center gap-2"><Users className="w-4 h-4" style={{ color: c.bright }} /> Como funciona o cofre</span>
                  <ChevronRight className="w-4 h-4" style={{ color: c.muted }} />
                </Link>
              </div>
            </Cartao>

            {/* Cody */}
            <CodyCard variante="site" titulo="Dúvidas sobre a sua conta?" sub="Pergunte ao Cody, o assistente do Krypta." atalhos={['Minha conta está segura?', 'Como coloco foto no perfil?', 'Como ligo as notificações?']} />
          </div>

          {/* ================= COLUNA DIREITA ================= */}
          <div className="flex flex-col gap-5">
            {/* Assinatura */}
            <Cartao
              c={c}
              id="assinatura"
              i={1}
              destaque={pro}
              titulo="Assinatura"
              icone={<Crown className="w-4 h-4" />}
              extra={
                <span className="px-3 py-1 rounded-full text-xs font-bold" style={pro ? { background: GRAD, color: '#fff' } : { border: `1px solid ${c.border}`, color: c.muted }}>
                  {pro ? 'Pro ativo' : 'Free'}
                </span>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-2xl font-bold" style={{ fontFamily: ROUNDED_FONT }}>{getPlanFullName(user.plan)}</p>
                  {pro ? (
                    <p className="text-sm mt-1" style={{ color: c.muted }}>
                      {assinatura ? (
                        <>
                          {assinatura.periodo === 'ANUAL' ? 'Plano anual' : 'Plano mensal'} · {brl(assinatura.valorTotal)}
                          <br />
                          Assinado em {fmtData(assinatura.criadoEm, false)} · pedido <span className="font-mono">{assinatura.codigo}</span>
                        </>
                      ) : (
                        'Assinatura ativa.'
                      )}
                    </p>
                  ) : (
                    <p className="text-sm mt-1" style={{ color: c.muted }}>Gratuito para sempre. Faça upgrade quando quiser.</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {pro ? (
                      <Botao c={c} variante="perigo" onClick={() => { setMsgAssinatura(null); setModal('cancelar'); }}>
                        Cancelar assinatura
                      </Botao>
                    ) : (
                      <Botao c={c} onClick={() => navigate('/services#planos')}>
                        <Sparkles className="w-4 h-4" /> Assinar o Krypta Pro
                      </Botao>
                    )}
                    <Link to="/plans" className="inline-flex items-center gap-1 px-3 py-2.5 text-sm font-semibold" style={{ color: c.bright }}>
                      Comparar planos <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  {msgAssinatura && <div className="mt-3"><Aviso tipo="ok">{msgAssinatura}</Aviso></div>}
                </div>

                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <HardDrive className="w-4 h-4 shrink-0" style={{ color: c.bright }} />
                    Espaço do backup: <strong>{recursos.armazenamentoKB >= 1024 ? `${recursos.armazenamentoKB / 1024} MB` : `${recursos.armazenamentoKB} KB`}</strong>
                  </li>
                  {RECURSOS_LISTA.map((r) => {
                    const liberado = recursos[r.chave];
                    return (
                      <li key={r.chave} className="flex items-center gap-2 text-sm" style={{ color: liberado ? c.fg : c.muted }}>
                        {liberado ? <Check className="w-4 h-4 shrink-0 text-green-500" /> : <Lock className="w-4 h-4 shrink-0" />}
                        {r.rotulo}
                        {!liberado && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: GRAD }}>PRO</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Cartao>

            {/* Segurança */}
            <Cartao c={c} id="seguranca" i={3} titulo="Segurança da conta" icone={<KeyRound className="w-4 h-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={trocarSenha} className="space-y-3" noValidate>
                  <p className="text-sm font-semibold">Trocar a senha do site</p>
                  <Campo c={c} rotulo="Senha atual" type={verSenhas ? 'text' : 'password'} autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
                  <Campo c={c} rotulo="Nova senha" type={verSenhas ? 'text' : 'password'} autoComplete="new-password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} placeholder="Mínimo 8 caracteres" />
                  <Campo c={c} rotulo="Confirmar nova senha" type={verSenhas ? 'text' : 'password'} autoComplete="new-password" value={senhaConf} onChange={(e) => setSenhaConf(e.target.value)} />
                  <button type="button" onClick={() => setVerSenhas((v) => !v)} className="text-xs inline-flex items-center gap-1" style={{ color: c.muted }}>
                    {verSenhas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {verSenhas ? 'Esconder' : 'Mostrar'} senhas
                  </button>
                  {msgSenha && <Aviso tipo="erro">{msgSenha}</Aviso>}
                  <Botao c={c} type="submit" carregando={trocandoSenha} disabled={!senhaAtual || !senhaNova || !senhaConf}>
                    Trocar senha
                  </Botao>
                  <p className="text-[11px]" style={{ color: c.muted }}>
                    Por segurança, todas as sessões são encerradas e você entra de novo. A senha do site não abre o cofre.
                  </p>
                </form>

                <div>
                  <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4" style={{ color: c.bright }} /> Atividade recente da conta
                  </p>
                  {!atividade ? (
                    <p className="text-sm flex items-center gap-2" style={{ color: c.muted }}><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</p>
                  ) : atividade.length === 0 ? (
                    <p className="text-sm" style={{ color: c.muted }}>Nenhum evento ainda.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {atividade.slice(0, 10).map((ev) => (
                        <li key={ev.id} className="flex items-start gap-2 text-xs rounded-lg p-2" style={{ border: `1px solid ${ev.status === 'success' ? c.border : 'rgba(245,158,11,0.45)'}` }}>
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ev.status === 'success' ? '#22c55e' : ev.status === 'warning' ? '#f59e0b' : '#f87171' }} />
                          <span className="min-w-0">
                            <span className="block font-medium truncate">{ev.detail ?? ev.action}</span>
                            <span style={{ color: c.muted }}>{fmtData(ev.timestamp)}{ev.ip ? ` · ${ev.ip}` : ''}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4">
                    <Botao c={c} variante="secundario" onClick={() => setModal('sessoes')}>
                      <LogOut className="w-4 h-4" /> Sair de todos os dispositivos
                    </Botao>
                  </div>
                </div>
              </div>
            </Cartao>

            {/* Zona de perigo */}
            <motion.section
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.4 }}
              className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ border: '1px dashed rgba(239,68,68,0.5)', background: c.isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)' }}
            >
              <div className="flex-1">
                <p className="font-semibold flex items-center gap-2" style={{ color: '#f87171' }}><AlertTriangle className="w-4 h-4" /> Zona de perigo</p>
                <p className="text-xs mt-1" style={{ color: c.muted }}>
                  Excluir a conta apaga cofre, backup, compras e histórico. Não dá para desfazer.
                </p>
              </div>
              <Botao c={c} variante="perigo" onClick={() => setModal('excluir')}>
                <Trash2 className="w-4 h-4" /> Excluir conta
              </Botao>
            </motion.section>
          </div>
        </div>
      </main>

      {/* ================= MODAIS ================= */}
      <Modal c={c} aberto={modal !== null} onFechar={fecharModal}>
        {modal === 'cancelar' && (
          <>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: ROUNDED_FONT }}>Cancelar o Krypta Pro?</h3>
            <p className="text-sm mb-3" style={{ color: c.muted }}>Seu cofre continua funcionando. O que muda:</p>
            <ul className="text-sm space-y-1.5 mb-4">
              {[
                'Kill Switch, alertas de acesso e novos pareamentos de dispositivo físico ficam travados',
                'Ativar ou trocar a herança fica travado (um código de herança já entregue continua valendo)',
                'O limite do backup volta a 64 KB nos próximos envios',
                'Um dispositivo físico já pareado continua funcionando',
              ].map((t) => (
                <li key={t} className="flex gap-2"><Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: c.bright }} /> {t}</li>
              ))}
            </ul>
            <Campo c={c} rotulo="Confirme com a sua senha" type="password" autoComplete="current-password" value={senhaModal} onChange={(e) => setSenhaModal(e.target.value)} />
          </>
        )}
        {modal === 'sessoes' && (
          <>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: ROUNDED_FONT }}>Sair de todos os dispositivos?</h3>
            <p className="text-sm mb-1" style={{ color: c.muted }}>
              Todas as sessões do site (inclusive esta) serão encerradas. Use se você entrou num computador que não é seu.
            </p>
          </>
        )}
        {modal === 'excluir' && (
          <>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: ROUNDED_FONT, color: '#f87171' }}>Excluir a conta para sempre?</h3>
            <p className="text-sm mb-3" style={{ color: c.muted }}>
              O backup cifrado, os pedidos, os dispositivos comprados e o histórico serão apagados. Se a herança estiver ativa, o código de herança deixa de funcionar.
            </p>
            <div className="space-y-3">
              <Campo c={c} rotulo="Sua senha" type="password" autoComplete="current-password" value={senhaModal} onChange={(e) => setSenhaModal(e.target.value)} />
              <Campo c={c} rotulo='Digite "EXCLUIR" para confirmar' value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            </div>
          </>
        )}
        {erroModal && <div className="mt-3"><Aviso tipo="erro">{erroModal}</Aviso></div>}
        <div className="flex gap-2 mt-5">
          <Botao
            c={c}
            className="flex-1"
            variante={modal === 'sessoes' ? 'primario' : 'perigo'}
            carregando={ocupadoModal}
            disabled={(modal !== 'sessoes' && !senhaModal) || (modal === 'excluir' && confirmacao.trim().toUpperCase() !== 'EXCLUIR')}
            onClick={confirmarModal}
          >
            {modal === 'cancelar' ? 'Cancelar assinatura' : modal === 'sessoes' ? 'Sair de tudo' : 'Excluir conta'}
          </Botao>
          <Botao c={c} variante="secundario" onClick={fecharModal}>Voltar</Botao>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}
