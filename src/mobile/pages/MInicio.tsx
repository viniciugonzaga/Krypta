// src/mobile/pages/MInicio.tsx
// ============================================================
// MODO MOBILE — Início e Notificações
//   MHome          → "/" logado: resumo da conta, cofre, atividades, plano, dispositivo
//   MNotificacoes  → "/notificacoes": boas-vindas + alertas de segurança da conta
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, AlertTriangle, ChevronRight, Cpu, Crown, History, KeyRound, Lock, LogIn, PencilLine, ShieldCheck, Smartphone, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAPI, type EventoConta } from '../../services/api';
import { isProPlan } from '../../utils/plan';
import { FONTE, GRAD, MCard, MFaixa, MTitulo, MobileShell, fmtQuando, useMCores } from '../ui';

import roboAcenando from '../../assets/sprites/sprite_robo_acenando.png';

function iconeEvento(acao: string) {
  if (acao === 'VAULT_EDITED') return <PencilLine className="w-4 h-4" />;
  if (acao.includes('SNAPSHOT')) return <History className="w-4 h-4" />;
  if (acao.includes('REMOTE')) return <Smartphone className="w-4 h-4" />;
  if (acao.includes('LOGIN')) return <LogIn className="w-4 h-4" />;
  if (acao.includes('PASSWORD') || acao.includes('CCP')) return <KeyRound className="w-4 h-4" />;
  if (acao.includes('INHERITANCE')) return <Users className="w-4 h-4" />;
  if (acao.includes('HARDWARE') || acao.includes('DEVICE')) return <Cpu className="w-4 h-4" />;
  if (acao.includes('PLAN')) return <Crown className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
}

// ============================================================
// INÍCIO
// ============================================================
export function MHome() {
  const c = useMCores();
  const { user } = useAuth();
  const navigate = useNavigate();
  const reduzir = useReducedMotion();
  const [eventos, setEventos] = useState<EventoConta[] | null>(null);

  useEffect(() => {
    UserAPI.audit().then(setEventos).catch(() => setEventos([]));
  }, []);

  if (!user) return null;
  const pro = isProPlan(user.plan);
  const primeiroNome = user.name.trim().split(/\s+/)[0];

  // Pontuação de segurança (anel): cada item conta 25%
  const itens = [
    { ok: user.estadoCofre === 'ATIVA', rotulo: 'Cofre', valor: user.estadoCofre === 'ATIVA' ? 'Ativo' : 'Pendente' },
    { ok: !!user.dispositivoPareado, rotulo: 'Dispositivo', valor: user.dispositivoPareado ? (user.tipoDispositivo === 'FISICO' ? 'Físico' : 'Software') : 'Nenhum' },
    { ok: !!user.herancaAtiva, rotulo: 'Herança', valor: user.herancaAtiva ? 'Ativa' : 'Desativada' },
    { ok: pro, rotulo: 'Plano', valor: pro ? 'Pro' : 'Free' },
  ];
  const pontos = itens.filter((i) => i.ok).length;
  const pct = pontos / itens.length;
  const statusTexto = pontos >= 3 ? 'Conta segura' : pontos === 2 ? 'Quase lá' : 'Proteja sua conta';
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <MobileShell>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight" style={{ fontFamily: FONTE }}>Olá, {primeiroNome}!</h1>
          <p className="text-[13px]" style={{ color: c.suave }}>Sua segurança digital, sempre com você.</p>
        </div>
        <motion.img src={roboAcenando} alt="" className="w-16" draggable={false} animate={reduzir ? undefined : { rotate: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }} />
      </motion.div>

      {/* Questionário pendente */}
      {!user.onboardingConcluido && (
        <MCard c={c} i={0} destaque onClick={() => navigate('/boas-vindas')} className="mb-4 flex items-center gap-3">
          <Sparkles className="w-6 h-6 shrink-0" style={{ color: c.roxo }} />
          <span className="flex-1 text-[13.5px]"><strong>Personalize seu Krypta</strong> em 1 minuto e veja o plano ideal para você.</span>
          <ChevronRight className="w-5 h-5" style={{ color: c.roxo }} />
        </MCard>
      )}

      {/* Cofre */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/device')}
        className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[20px] font-semibold mb-4 relative overflow-hidden"
        style={{ border: `1.5px solid ${c.roxo}`, background: c.cartao, fontFamily: FONTE }}
      >
        <motion.span className="absolute inset-y-0 w-1/3" style={{ background: `linear-gradient(90deg, transparent, ${c.faixa}, transparent)` }} animate={reduzir ? undefined : { left: ['-40%', '140%'] }} transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2 }} />
        <span className="relative">Cofre Digital</span> <Lock className="relative w-5 h-5" style={{ color: c.roxo }} />
      </motion.button>

      {/* Resumo */}
      <MCard c={c} i={1} className="mb-4">
        <p className="font-semibold mb-3">Resumo da sua conta</p>
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
              <circle cx="40" cy="40" r={R} fill="none" stroke={c.faixa} strokeWidth="8" />
              <motion.circle cx="40" cy="40" r={R} fill="none" stroke="url(#gradAnel)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 1.2, ease: 'easeOut' }} />
              <defs>
                <linearGradient id="gradAnel" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5100BD" />
                  <stop offset="100%" stopColor="#a97aff" />
                </linearGradient>
              </defs>
            </svg>
            <ShieldCheck className="absolute inset-0 m-auto w-9 h-9" style={{ color: c.roxo }} />
          </div>
          <ul className="flex-1 grid grid-cols-1 gap-1.5 text-[12.5px]">
            {itens.map((i) => (
              <li key={i.rotulo} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: i.ok ? '#22c55e' : '#f59e0b' }} />
                <span style={{ color: c.suave }}>{i.rotulo}:</span>
                <span className="font-semibold">{i.valor}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12.5px] mt-2 font-semibold" style={{ color: pontos >= 3 ? '#22c55e' : '#f59e0b' }}>{statusTexto}</p>
      </MCard>

      {/* Atividades */}
      <MCard c={c} i={2} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold">Atividades recentes</p>
          <button type="button" onClick={() => navigate('/notificacoes')} className="text-[12px] flex items-center" style={{ color: c.roxo }}>
            Ver mais <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!eventos ? (
          <p className="text-[12.5px]" style={{ color: c.suave }}>Carregando...</p>
        ) : eventos.length === 0 ? (
          <p className="text-[12.5px]" style={{ color: c.suave }}>Nenhuma atividade ainda.</p>
        ) : (
          <ol className="relative ml-3 border-l" style={{ borderColor: c.borda }}>
            {eventos.slice(0, 3).map((ev) => (
              <li key={ev.id} className="relative ml-5 py-1.5">
                <span className="absolute -left-[32px] top-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: c.faixa, color: c.roxo }}>{iconeEvento(ev.action)}</span>
                <p className="text-[13px] font-medium leading-tight">{ev.detail ?? ev.action}</p>
                <p className="text-[11px]" style={{ color: c.suave }}>{fmtQuando(ev.timestamp)}</p>
              </li>
            ))}
          </ol>
        )}
      </MCard>

      {/* Plano e dispositivo */}
      <div className="grid grid-cols-2 gap-3">
        <MCard c={c} i={3} onClick={() => navigate('/plans')} className="text-center">
          <span className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white mb-2" style={{ background: GRAD }}>
            <Crown className="w-6 h-6" />
          </span>
          <p className="font-semibold text-[14px]">{pro ? 'Krypta Pro' : 'Krypta Free'}</p>
          <p className="text-[11px] mt-0.5" style={{ color: c.roxo }}>{pro ? 'Gerenciar plano' : 'Conhecer o Pro →'}</p>
        </MCard>
        <MCard c={c} i={4} onClick={() => navigate('/device')} className="text-center">
          <p className="text-[13px] font-semibold">Dispositivo</p>
          <p className="text-[11px] font-bold tracking-[0.2em]" style={{ color: c.roxo }}>KRYPTA</p>
          <div className="relative w-12 h-12 mx-auto my-2 rounded-full flex items-center justify-center" style={{ background: c.isDark ? '#1a0b33' : '#111' }}>
            <Cpu className="w-6 h-6 text-white" />
            {user.dispositivoPareado && <motion.span className="absolute inset-0 rounded-full" style={{ border: '2px solid #22c55e' }} animate={reduzir ? undefined : { scale: [1, 1.25], opacity: [0.8, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />}
          </div>
          <p className="text-[11px] font-semibold" style={{ color: user.dispositivoPareado ? '#22c55e' : c.suave }}>{user.dispositivoPareado ? 'Conectado' : 'Desconectado'}</p>
        </MCard>
      </div>
    </MobileShell>
  );
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
export function MNotificacoes() {
  const c = useMCores();
  const { user } = useAuth();
  const [eventos, setEventos] = useState<EventoConta[] | null>(null);

  useEffect(() => {
    UserAPI.audit().then(setEventos).catch(() => setEventos([]));
  }, []);

  return (
    <MobileShell voltar={true}>
      <MTitulo c={c} titulo="Notificações" sub="Caixa de mensagens e alertas da sua conta" />

      <MCard c={c} i={0} className="mb-4">
        <MFaixa c={c} icone={<Sparkles className="w-5 h-5" />} titulo={`Bem-vindo ao Krypta, ${user?.name.split(' ')[0] ?? ''}! 🎉`} />
        <p className="text-[13px] leading-relaxed" style={{ color: c.suave }}>
          Sua jornada por uma vida digital mais segura começa agora. Organize suas credenciais, proteja suas informações e tenha mais controle sobre seus acessos.
        </p>
        <p className="text-[12.5px] mt-2 font-semibold" style={{ color: c.roxo }}>Sua identidade. Suas chaves. Seu controle.</p>
      </MCard>

      <p className="font-semibold mb-2">Alertas de segurança</p>
      {!eventos ? (
        <p className="text-[13px]" style={{ color: c.suave }}>Carregando...</p>
      ) : eventos.length === 0 ? (
        <p className="text-[13px]" style={{ color: c.suave }}>Nenhum alerta por enquanto.</p>
      ) : (
        <div className="space-y-2.5">
          {eventos.map((ev, k) => (
            <MCard key={ev.id} c={c} i={Math.min(k, 8)} className="flex gap-3" style={ev.status !== 'success' ? { borderColor: 'rgba(245,158,11,0.55)' } : undefined}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: ev.status !== 'success' ? 'rgba(245,158,11,0.14)' : c.faixa, color: ev.status !== 'success' ? '#f59e0b' : c.roxo }}>
                {ev.status !== 'success' ? <AlertTriangle className="w-4 h-4" /> : iconeEvento(ev.action)}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium leading-snug">{ev.detail ?? ev.action}</span>
                <span className="block text-[11px] mt-0.5" style={{ color: c.suave }}>
                  {fmtQuando(ev.timestamp)}
                  {ev.ip ? ` · IP ${ev.ip}` : ''}
                </span>
              </span>
            </MCard>
          ))}
        </div>
      )}
    </MobileShell>
  );
}
