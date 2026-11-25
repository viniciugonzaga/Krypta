// src/pages/inicio/PainelInicio.tsx
// ============================================================
// v1.4.0 — INÍCIO LOGADO DO SITE / APP DO WINDOWS
// A mesma experiência do Início do celular, no layout do site:
//   • cartão do cofre que muda conforme a situação (ativar, criar PIN,
//     trancado, aberto, em outro aparelho) e leva à tela certa
//   • resumo da conta (mesma regra do app: utils/resumoConta.ts)
//   • atividades recentes, cartão do Kody e atalhos
// Itens que ainda não valem para a pessoa (PIN, herança, pontos antes do
// cofre existir; recursos Pro no Free) não aparecem.
// ============================================================
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Bell, ChevronRight, Crown, Download, Fingerprint, History, KeyRound, Lock, LockOpen, Plus, ShieldCheck, Smartphone, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { UserAPI, type EventoConta } from '../../services/api';
import { VirtualDevice } from '../../services/virtualDevice';
import { useTrava } from '../../mobile/TravaCofre';
import { fmtQuando } from '../../mobile/ui';
import { resumoConta } from '../../utils/resumoConta';
import { KodyCard } from '../../ajuda/KodyCard';
import { FotoPerfil } from '../../components/FotoPerfil';
import kAcenando from '../../assets/kody/kody_acenando.webp';

const FONTE = "'Quicksand', 'Poppins', sans-serif";
const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';

function useCores() {
  const { isDark } = useTheme();
  return {
    isDark,
    fg: isDark ? '#FFFFFF' : '#1a1a1a',
    muted: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(26,26,26,0.62)',
    card: isDark ? 'linear-gradient(160deg, rgba(46,8,83,0.35) 0%, rgba(10,2,20,0.75) 100%)' : '#FFFFFF',
    borda: isDark ? 'rgba(141,81,255,0.28)' : 'rgba(81,0,189,0.16)',
    roxo: isDark ? '#c9b3ff' : '#5100BD',
    faixa: isDark ? 'rgba(141,81,255,0.14)' : '#F4EEFF',
  };
}

function Bloco({ children, i = 0, className = '', destaque = false }: { children: ReactNode; i?: number; className?: string; destaque?: boolean }) {
  const c = useCores();
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + i * 0.07 }}
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: c.card, border: `1.5px solid ${destaque ? (c.isDark ? 'rgba(141,81,255,0.6)' : 'rgba(97,49,201,0.55)') : c.borda}`, boxShadow: c.isDark ? undefined : '0 6px 24px rgba(81,0,189,0.06)' }}
    >
      {children}
    </motion.section>
  );
}

function iconeEvento(acao: string) {
  if (acao.includes('SNAPSHOT')) return <History className="w-4 h-4" />;
  if (acao.includes('REMOTE')) return <Smartphone className="w-4 h-4" />;
  if (acao.includes('PASSWORD') || acao.includes('CCP')) return <KeyRound className="w-4 h-4" />;
  if (acao.includes('INHERITANCE')) return <Users className="w-4 h-4" />;
  if (acao.includes('PLAN')) return <Crown className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
}

export function PainelInicio() {
  const { user } = useAuth();
  const c = useCores();
  const navigate = useNavigate();
  const trava = useTrava(user?.id ?? '');
  const [eventos, setEventos] = useState<EventoConta[] | null>(null);

  useEffect(() => {
    UserAPI.audit().then(setEventos).catch(() => setEventos([]));
  }, []);

  if (!user) return null;
  const { itens, pct, status, ativo, aqui, pro } = resumoConta(user, trava);
  const primeiroNome = user.name.trim().split(/\s+/)[0];
  const disp = aqui ? VirtualDevice.carregar(user.id) : null;
  const totalChaves = disp && !disp.bloqueado ? disp.credenciais.length : null;

  // ---------- cartão do cofre (muda com a situação) ----------
  type Cofre = { icone: ReactNode; titulo: string; texto: string; botoes: { rotulo: string; para: string; icone?: ReactNode }[]; alerta?: boolean };
  const cofre: Cofre = !ativo
    ? {
        icone: <Sparkles className="w-6 h-6" />,
        titulo: 'Ative o seu cofre',
        texto: 'Três passos, uns 3 minutos: escolha o dispositivo (pode ser este computador), anote a chave de contingência em papel e crie o PIN do cofre.',
        botoes: [{ rotulo: 'Ativar meu cofre', para: '/device', icone: <ArrowRight className="w-4 h-4" /> }],
      }
    : !aqui
      ? {
          icone: <Smartphone className="w-6 h-6" />,
          titulo: 'Seu cofre está em outro aparelho',
          texto: pro ? 'Abra aqui com a senha de acesso (PIN) para ver e editar as suas chaves.' : 'No Free o cofre abre só no aparelho pareado. Com o Pro, um PIN abre o cofre em qualquer aparelho seu.',
          botoes: pro ? [{ rotulo: 'Abrir com o PIN', para: '/cofre/acesso', icone: <LockOpen className="w-4 h-4" /> }] : [{ rotulo: 'Conhecer o Pro', para: '/plans', icone: <Crown className="w-4 h-4" /> }],
        }
      : trava.situacao === 'sem-trava'
        ? {
            icone: <ShieldCheck className="w-6 h-6" />,
            titulo: 'Proteja o cofre com um PIN',
            texto: 'Sem o PIN, quem usar este computador vê suas senhas. Leva 30 segundos (tenha a chave de contingência à mão).',
            botoes: [{ rotulo: 'Criar o PIN agora', para: '/device', icone: <ArrowRight className="w-4 h-4" /> }],
            alerta: true,
          }
        : trava.situacao === 'trancado'
          ? {
              icone: <Lock className="w-6 h-6" />,
              titulo: 'Cofre trancado',
              texto: `Tudo protegido. Digite o PIN${trava.info.biometria ? ' ou use a biometria' : ''} para abrir. Ele tranca sozinho depois de 5 minutos sem uso.`,
              botoes: [{ rotulo: 'Abrir o cofre', para: '/cofre/chaves', icone: <LockOpen className="w-4 h-4" /> }],
            }
          : {
              icone: <LockOpen className="w-6 h-6" />,
              titulo: 'Cofre aberto',
              texto: totalChaves ? `${totalChaves} chave${totalChaves === 1 ? '' : 's'} guardada${totalChaves === 1 ? '' : 's'}, cifrada${totalChaves === 1 ? '' : 's'} neste aparelho.` : 'Seu cofre está pronto e vazio. Comece pelo e-mail: ele é a chave de todas as outras contas.',
              botoes: [
                { rotulo: 'Minhas chaves', para: '/cofre/chaves', icone: <KeyRound className="w-4 h-4" /> },
                { rotulo: 'Nova chave', para: '/cofre/nova-chave', icone: <Plus className="w-4 h-4" /> },
              ],
            };

  // ---------- atalhos (só o que vale para a pessoa) ----------
  const atalhos = [
    ativo && aqui && trava.situacao !== 'sem-trava' && { icone: <Fingerprint className="w-5 h-5" />, titulo: 'PIN e biometria', texto: trava.info.biometria ? 'Biometria ligada' : 'Ligar a biometria', para: '/cofre/acesso' },
    ativo && { icone: <History className="w-5 h-5" />, titulo: 'Pontos de restauração', texto: 'Salvar e voltar o cofre', para: '/cofre/pontos' },
    ativo && pro && { icone: <Users className="w-5 h-5" />, titulo: 'Herança digital', texto: user.herancaAtiva ? 'Ativa' : 'Gerar código de herança', para: '/device#heranca' },
    { icone: <Bell className="w-5 h-5" />, titulo: 'Notificações', texto: 'Alertas de segurança', para: '/settings' },
    { icone: <Download className="w-5 h-5" />, titulo: 'Aplicações', texto: 'Celular e Windows', para: '/aplicacoes' },
    pro ? { icone: <Crown className="w-5 h-5" />, titulo: 'Krypta Pro', texto: 'Gerenciar assinatura', para: '/profile#assinatura' } : { icone: <Crown className="w-5 h-5" />, titulo: 'Conhecer o Pro', texto: 'Herança, Kill Switch e mais', para: '/plans' },
  ].filter(Boolean) as { icone: ReactNode; titulo: string; texto: string; para: string }[];

  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <section className="relative z-10 pt-28 pb-12 px-6 md:px-12 lg:px-20" style={{ color: c.fg }}>
      <div className="max-w-6xl mx-auto">
        {/* saudação */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-7">
          <Link to="/profile" aria-label="Meu perfil">
            <FotoPerfil avatar={user.avatarUrl} nome={user.name} tamanho={60} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight" style={{ fontFamily: FONTE }}>
              Olá, {primeiroNome}!
            </h1>
            <p className="text-sm mt-0.5" style={{ color: c.muted }}>
              Sua segurança digital, sempre com você.
            </p>
          </div>
          <motion.img src={kAcenando} alt="" className="hidden sm:block w-20" draggable={false} animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity }} />
        </motion.div>

        {!user.onboardingConcluido && (
          <Bloco i={0} destaque className="mb-5 flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => navigate('/boas-vindas')} className="flex items-center gap-3 w-full text-left">
              <Sparkles className="w-6 h-6 shrink-0" style={{ color: c.roxo }} />
              <span className="flex-1 text-sm">
                <strong>Personalize seu Krypta</strong> em 1 minuto e veja o plano ideal para você.
              </span>
              <ChevronRight className="w-5 h-5" style={{ color: c.roxo }} />
            </button>
          </Bloco>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* cofre */}
          <Bloco i={1} destaque className="lg:col-span-2">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white" style={{ background: cofre.alerta ? 'linear-gradient(135deg, #b45309, #f97316)' : GRAD }}>
                {cofre.icone}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: c.roxo }}>
                  Cofre digital
                </p>
                <h2 className="text-xl font-semibold mt-0.5" style={{ fontFamily: FONTE }}>
                  {cofre.titulo}
                </h2>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: c.muted }}>
                  {cofre.texto}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {cofre.botoes.map((b, i) => (
                    <Link
                      key={b.para}
                      to={b.para}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={i === 0 ? { background: GRAD, color: '#fff' } : { border: `1.5px solid ${c.borda}`, color: c.fg }}
                    >
                      {b.icone} {b.rotulo}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Bloco>

          {/* resumo */}
          <Bloco i={2}>
            <p className="font-semibold mb-3">Resumo da sua conta</p>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
                  <circle cx="40" cy="40" r={R} fill="none" stroke={c.faixa} strokeWidth="8" />
                  <motion.circle cx="40" cy="40" r={R} fill="none" stroke="url(#gradAnelWeb)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 1.2, ease: 'easeOut' }} />
                  <defs>
                    <linearGradient id="gradAnelWeb" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#5100BD" />
                      <stop offset="100%" stopColor="#a97aff" />
                    </linearGradient>
                  </defs>
                </svg>
                <ShieldCheck className="absolute inset-0 m-auto w-9 h-9" style={{ color: c.roxo }} />
              </div>
              <ul className="flex-1 space-y-1.5 text-[13px]">
                {itens.map((i) => (
                  <li key={i.rotulo}>
                    <Link to={i.para} className="flex items-center gap-2 hover:underline">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i.ok ? '#22c55e' : 'transparent', boxShadow: i.ok ? undefined : `inset 0 0 0 1.5px ${c.roxo}` }} />
                      <span style={{ color: c.muted }}>{i.rotulo}:</span>
                      <span className="font-semibold">{i.valor}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm mt-3 font-semibold" style={{ color: pct >= 0.99 ? '#22c55e' : c.roxo }}>
              {status}
            </p>
          </Bloco>

          {/* atividades */}
          <Bloco i={3}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Atividades recentes</p>
              <Link to="/profile#seguranca" className="text-xs flex items-center" style={{ color: c.roxo }}>
                Ver tudo <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {!eventos ? (
              <p className="text-sm" style={{ color: c.muted }}>Carregando...</p>
            ) : eventos.length === 0 ? (
              <p className="text-sm" style={{ color: c.muted }}>Nenhuma atividade ainda.</p>
            ) : (
              <ol className="relative ml-3 border-l" style={{ borderColor: c.borda }}>
                {eventos.slice(0, 4).map((ev) => (
                  <li key={ev.id} className="relative ml-5 py-1.5">
                    <span className="absolute -left-[32px] top-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: c.faixa, color: c.roxo }}>
                      {iconeEvento(ev.action)}
                    </span>
                    <p className="text-[13px] font-medium leading-tight">{ev.detail ?? ev.action}</p>
                    <p className="text-[11px]" style={{ color: c.muted }}>{fmtQuando(ev.timestamp)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Bloco>

          {/* Kody */}
          <div className="lg:col-span-2">
            <KodyCard variante="site" atalhos={ativo ? ['Minha conta está segura?', 'Gera uma senha forte', 'O que tem de novo?'] : ['O que eu faço agora?', 'O que é parear?', 'O que é a chave de contingência?']} className="h-full" />
          </div>
        </div>

        {/* atalhos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-5">
          {atalhos.map((a, i) => (
            <motion.div key={a.titulo} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
              <Link to={a.para} className="group h-full flex flex-col gap-2 rounded-2xl p-4 transition-transform hover:-translate-y-0.5" style={{ background: c.card, border: `1.5px solid ${c.borda}` }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: GRAD }}>
                  {a.icone}
                </span>
                <span className="text-sm font-semibold leading-tight">{a.titulo}</span>
                <span className="text-xs" style={{ color: c.muted }}>{a.texto}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
