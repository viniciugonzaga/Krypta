// src/mobile/pages/MEntrada.tsx
// ============================================================
// MODO MOBILE — telas de entrada (sem login)
//   MIntro    → "/"        3 frases do Krypta + Criar conta / Acessar minha conta
//   MLogin    → "/login"   e-mail e senha (as mesmas do site)
//   MRegister → "/register" cadastro → questionário de boas-vindas
// ============================================================
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { handleApiError } from '../../services/api';
import type { DestinoLogin } from '../../routes/destino';
import { FONTE, MAviso, MBotao, MCampo, OndaFundo, useMCores } from '../ui';

import iconeK from '../../assets/logos/icon_krypta.png';
import logoBranco from '../../assets/logos/Krypta_Nav_Branco.png';

const FRASES = [
  ['Sua identidade.', 'Seu controle!'],
  ['Segurança física', 'para o mundo digital.'],
  ['Porque sua identidade', 'vale mais que uma senha.'],
];
const CHAVE_EMAIL = 'krypta:email-salvo';

function Marca({ pequena }: { pequena?: boolean }) {
  const reduzir = useReducedMotion();
  return (
    <div className="flex flex-col items-center">
      <motion.img
        src={iconeK}
        alt=""
        draggable={false}
        className={pequena ? 'w-20' : 'w-36'}
        style={{ filter: 'drop-shadow(0 0 26px rgba(141,81,255,0.85))' }}
        animate={reduzir ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <img src={logoBranco} alt="Krypta" className={pequena ? 'h-4 mt-3' : 'h-6 mt-5'} draggable={false} />
    </div>
  );
}

// ============================================================
// ABERTURA
// ============================================================
export function MIntro() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % FRASES.length), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-[100dvh] flex flex-col text-white overflow-hidden" style={{ fontFamily: FONTE, background: '#050010' }}>
      <OndaFundo />
      <div className="relative z-10 flex-1 flex items-center justify-center pt-16">
        <Marca />
      </div>

      <div className="relative z-10 px-6" style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        <div className="h-24">
          <AnimatePresence mode="wait">
            <motion.h1
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
              className="text-[30px] leading-tight font-semibold"
            >
              {FRASES[i][0]}
              <br />
              {FRASES[i][1]}
            </motion.h1>
          </AnimatePresence>
        </div>
        <div className="flex gap-2 my-5" role="tablist" aria-label="Frases">
          {FRASES.map((_, k) => (
            <button key={k} type="button" aria-label={`Frase ${k + 1}`} onClick={() => setI(k)} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 34 : 18, background: k === i ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </div>
        <MBotao variante="claro" type="button" onClick={() => navigate('/register')}>Criar conta</MBotao>
        <Link to="/login" className="block text-center text-sm mt-4 underline underline-offset-4 text-white/90">
          Acessar minha conta
        </Link>
        <Link to="/heranca" className="block text-center text-[11px] mt-3 text-white/55">
          Recebi um kit de herança
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// ENTRAR
// ============================================================
export function MLogin() {
  const c = useMCores();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: DestinoLogin } | null)?.from;

  const [email, setEmail] = useState(() => localStorage.getItem(CHAVE_EMAIL) ?? '');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [salvar, setSalvar] = useState(() => !!localStorage.getItem(CHAVE_EMAIL));
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [aviso] = useState(() => sessionStorage.getItem('krypta:aviso-login'));
  useEffect(() => sessionStorage.removeItem('krypta:aviso-login'), []);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) return setErro('Preencha e-mail e senha.');
    setCarregando(true);
    try {
      await signIn(email.trim().toLowerCase(), senha);
      if (salvar) localStorage.setItem(CHAVE_EMAIL, email.trim().toLowerCase());
      else localStorage.removeItem(CHAVE_EMAIL);
      if (from) navigate(`${from.pathname}${from.search ?? ''}${from.hash ?? ''}`, { replace: true, state: from.state });
      else navigate('/', { replace: true });
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col overflow-hidden" style={{ fontFamily: FONTE, background: '#050010' }}>
      <OndaFundo altura="62%" />
      <div className="relative z-10 flex-1 flex items-center justify-center pt-10 pb-8 min-h-[34dvh]">
        <Marca pequena />
      </div>

      <motion.form
        onSubmit={entrar}
        noValidate
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="relative z-10 rounded-t-[28px] px-6 pt-7 space-y-4"
        style={{ background: c.fundo, color: c.texto, paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-2xl font-semibold">Entrar</h1>
        {aviso && !erro && <MAviso tipo="ok">{aviso}</MAviso>}
        <MCampo c={c} rotulo="E-mail" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <MCampo
          c={c}
          rotulo="Senha"
          type={ver ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          direita={
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'} style={{ color: c.suave }} className="p-1">
              {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={salvar} onChange={(e) => setSalvar(e.target.checked)} className="accent-purple-600 w-4 h-4" />
          Salvar meu e-mail neste aparelho
        </label>
        {erro && <MAviso tipo="erro">{erro}</MAviso>}
        <MBotao type="submit" carregando={carregando}>Entrar</MBotao>
        <div className="flex justify-between text-[13px]">
          <Link to="/recover" className="underline underline-offset-4" style={{ color: c.roxo }}>Esqueci minha senha</Link>
          <Link to="/register" state={location.state} className="font-semibold" style={{ color: c.roxo }}>Criar conta</Link>
        </div>
        <Link to="/heranca" className="flex items-center justify-center gap-1.5 text-[12px] pt-1" style={{ color: c.suave }}>
          <KeyRound className="w-3.5 h-3.5" /> Recebi um kit de herança
        </Link>
      </motion.form>
    </div>
  );
}

// ============================================================
// CRIAR CONTA
// ============================================================
export function MRegister() {
  const c = useMCores();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: DestinoLogin } | null)?.from;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const criar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (nome.trim().split(/\s+/).length < 2) return setErro('Digite seu nome completo (nome e sobrenome).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('E-mail inválido.');
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    if (senha !== confirmar) return setErro('As senhas não coincidem.');
    if (!aceito) return setErro('Aceite o Contrato de Usuário e a Política de Privacidade para continuar.');
    setCarregando(true);
    try {
      await signUp(nome.trim(), email.trim().toLowerCase(), senha);
      // Veio de um checkout? Volta para ele. Senão, o questionário de boas-vindas.
      if (from) navigate(`${from.pathname}${from.search ?? ''}${from.hash ?? ''}`, { replace: true, state: from.state });
      else navigate('/boas-vindas', { replace: true });
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setCarregando(false);
    }
  };

  const olho = (
    <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Esconder senhas' : 'Mostrar senhas'} style={{ color: c.suave }} className="p-1">
      {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden" style={{ fontFamily: FONTE, background: c.fundo, color: c.texto }}>
      <div className="absolute inset-x-0 top-0 h-44 overflow-hidden rounded-b-[36px]">
        <OndaFundo />
      </div>
      <div className="relative z-10 px-6 pt-10 h-44 text-white">
        <Link to="/" className="text-[12px] text-white/70">← Voltar</Link>
        <h1 className="text-[26px] font-semibold mt-4">Bem-vindo ao Krypta!</h1>
        <p className="text-[12.5px] text-white/80 mt-1">Crie sua conta e dê o primeiro passo para proteger suas senhas e sua identidade digital.</p>
      </div>

      <form onSubmit={criar} noValidate className="relative z-10 px-6 pt-6 space-y-4" style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        <MCampo c={c} rotulo="Nome completo" autoComplete="name" placeholder="Seu nome e sobrenome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <MCampo c={c} rotulo="E-mail" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <MCampo c={c} rotulo="Senha" type={ver ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} direita={olho} />
        <MCampo c={c} rotulo="Confirmar senha" type={ver ? 'text' : 'password'} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        <label className="flex items-start gap-2 text-[12.5px] leading-snug">
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="accent-purple-600 w-4 h-4 mt-0.5" />
          <span>
            Concordo com o <strong>Contrato de Usuário</strong> e a <strong>Política de Privacidade</strong> do Krypta.
          </span>
        </label>
        {erro && <MAviso tipo="erro">{erro}</MAviso>}
        <MBotao type="submit" carregando={carregando}>Avançar</MBotao>
        <p className="text-center text-[13px]" style={{ color: c.suave }}>
          Já tem conta?{' '}
          <Link to="/login" state={location.state} className="font-semibold" style={{ color: c.roxo }}>Entrar</Link>
        </p>
      </form>
    </div>
  );
}
