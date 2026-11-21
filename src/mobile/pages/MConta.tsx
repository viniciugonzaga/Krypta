// src/mobile/pages/MConta.tsx
// ============================================================
// MODO MOBILE — Conta
//   MPerfil  → "/profile"   dados, segurança, sessões (de onde a conta está aberta), plano
//   MConfig  → "/settings"  tema, idioma, MODO MOBILE × WEB, avisos, atualizações
//   MPlanos  → "/plans"     Free × Pro com a recomendação do questionário → checkout
// ============================================================
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Check,
  Crown,
  Download,
  Globe,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Package,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SessionsAPI, UserAPI, handleApiError, type SessaoAtiva } from '../../services/api';
import { getPlanFullName, isProPlan } from '../../utils/plan';
import { KRYPTA_VERSION } from '../../config/desktop';
import { verificarAtualizacao } from '../../config/pwa';
import { useModo } from '../ModoContext';
import { motivoDoModo, type PreferenciaModo } from '../modo';
import { FONTE, GRAD, MAviso, MBotao, MCampo, MCard, MFaixa, MFolha, MInterruptor, MTitulo, MobileShell, fmtQuando, useMCores } from '../ui';

const ICONE_CLIENTE = { web: Globe, mobile: Smartphone, pwa: Smartphone, desktop: Monitor };
const NOME_CLIENTE = { web: 'Site', mobile: 'Celular (navegador)', pwa: 'App do celular', desktop: 'App para Windows' };

// ============================================================
// PERFIL
// ============================================================
export function MPerfil() {
  const c = useMCores();
  const { user, updateUser, cancelPlan, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [senhas, setSenhas] = useState({ atual: '', nova: '', conf: '' });
  const [folha, setFolha] = useState<'senha' | 'cancelar' | null>(null);
  const [senhaConfirma, setSenhaConfirma] = useState('');
  const [sessoes, setSessoes] = useState<SessaoAtiva[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [erroFolha, setErroFolha] = useState<string | null>(null);

  useEffect(() => {
    SessionsAPI.listar().then(setSessoes).catch(() => setSessoes([]));
  }, []);
  useEffect(() => {
    if (location.hash === '#sessoes') setTimeout(() => document.getElementById('sessoes')?.scrollIntoView({ behavior: 'smooth' }), 400);
  }, [location.hash]);

  if (!user) return null;
  const pro = isProPlan(user.plan);
  const iniciais = user.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  const salvarDados = async () => {
    setMsg(null);
    if (nome.trim().length < 2) return setMsg({ tipo: 'erro', texto: 'Nome muito curto.' });
    setOcupado(true);
    try {
      updateUser(await UserAPI.update({ name: nome.trim(), email: email.trim().toLowerCase() }));
      setEditando(false);
      setMsg({ tipo: 'ok', texto: 'Dados atualizados.' });
    } catch (err) {
      setMsg({ tipo: 'erro', texto: handleApiError(err).message });
    } finally {
      setOcupado(false);
    }
  };

  const trocarSenha = async () => {
    setErroFolha(null);
    if (senhas.nova.length < 8) return setErroFolha('A nova senha precisa ter pelo menos 8 caracteres.');
    if (senhas.nova !== senhas.conf) return setErroFolha('A confirmação não bate.');
    setOcupado(true);
    try {
      await UserAPI.changePassword(senhas.atual, senhas.nova);
      sessionStorage.setItem('krypta:aviso-login', 'Senha alterada! Entre de novo com a nova senha.');
      navigate('/login', { replace: true });
      signOut();
    } catch (err) {
      setErroFolha(handleApiError(err).message);
      setOcupado(false);
    }
  };

  const cancelar = async () => {
    setErroFolha(null);
    setOcupado(true);
    try {
      await cancelPlan(senhaConfirma);
      setFolha(null);
      setSenhaConfirma('');
      setMsg({ tipo: 'ok', texto: 'Assinatura cancelada. Você está no Krypta Free.' });
    } catch (err) {
      setErroFolha(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  const sairDeTudo = async () => {
    try {
      await UserAPI.revokeSessions();
    } finally {
      sessionStorage.setItem('krypta:aviso-login', 'Você saiu de todos os aparelhos. Entre de novo.');
      navigate('/login', { replace: true });
      signOut();
    }
  };

  return (
    <MobileShell>
      {/* Cabeçalho do perfil */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
        <p className="text-[17px] font-semibold">{user.name}</p>
        <p className="text-[12px] font-bold tracking-[0.25em]" style={{ color: c.roxo }}>{pro ? 'PREMIUM' : 'FREE'}</p>
        <div className="relative w-36 h-36 mx-auto my-4">
          <motion.div className="absolute inset-0 rounded-full" style={{ border: `2px dashed ${c.roxo}` }} animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }} />
          <div className="absolute inset-3 rounded-full flex items-center justify-center text-4xl font-bold text-white" style={{ background: GRAD, boxShadow: '0 0 34px rgba(141,81,255,0.55)', fontFamily: FONTE }}>
            {iniciais}
          </div>
        </div>
        <p className="text-[13px]" style={{ color: c.suave }}>{user.email}</p>
        <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-[11.5px] text-white" style={{ background: GRAD }}>
          <ShieldCheck className="w-3.5 h-3.5" /> Conta {user.status === 'ATIVA' ? 'ativa' : user.status}
        </span>
      </motion.div>

      {msg && <div className="mb-4"><MAviso tipo={msg.tipo}>{msg.texto}</MAviso></div>}

      {/* Dados */}
      <MCard c={c} i={1} className="mb-4">
        <MFaixa
          c={c}
          icone={<UserIcon className="w-5 h-5" />}
          titulo="Informações da conta"
          sub="Confira e atualize seus dados."
          extra={
            <button type="button" onClick={() => setEditando((v) => !v)} aria-label="Editar dados" style={{ color: c.roxo }}>
              {editando ? <X className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
          }
        />
        {editando ? (
          <div className="space-y-3">
            <MCampo c={c} rotulo="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            <MCampo c={c} rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <MBotao carregando={ocupado} onClick={salvarDados}>Salvar</MBotao>
          </div>
        ) : (
          <dl className="text-[13px] space-y-2">
            <div className="flex justify-between gap-3"><dt style={{ color: c.suave }}>Nome completo</dt><dd className="font-medium text-right">{user.name}</dd></div>
            <div className="flex justify-between gap-3"><dt style={{ color: c.suave }}>E-mail</dt><dd className="font-medium text-right truncate">{user.email}</dd></div>
            <div className="flex justify-between gap-3"><dt style={{ color: c.suave }}>Membro desde</dt><dd className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '—'}</dd></div>
          </dl>
        )}
      </MCard>

      {/* Segurança */}
      <MCard c={c} i={2} className="mb-4">
        <MFaixa c={c} icone={<KeyRound className="w-5 h-5" />} titulo="Segurança" sub="Gerencie suas opções de segurança." />
        <div className="flex items-center justify-between text-[13px] mb-3">
          <span>Senha do site: <span className="font-mono">••••••••</span></span>
          <button type="button" onClick={() => { setErroFolha(null); setFolha('senha'); }} className="px-3 py-1 rounded-full text-[11.5px] font-semibold text-white" style={{ background: GRAD }}>
            Alterar senha
          </button>
        </div>
        <p className="text-[11.5px]" style={{ color: c.suave }}>A senha do site não abre o cofre: ele é aberto pelo dispositivo e pela sua CCP.</p>
      </MCard>

      {/* Sessões (o servidor identifica site, celular, app e Windows) */}
      <div id="sessoes" className="scroll-mt-20">
        <MCard c={c} i={3} className="mb-4">
          <MFaixa c={c} icone={<Smartphone className="w-5 h-5" />} titulo="Onde sua conta está aberta" sub="Identificado pelo servidor a cada login." />
          {!sessoes ? (
            <p className="text-[12.5px]" style={{ color: c.suave }}>Carregando...</p>
          ) : (
            <ul className="space-y-2.5">
              {sessoes.map((s) => {
                const Icone = ICONE_CLIENTE[s.cliente] ?? Globe;
                return (
                  <li key={s.id} className="flex items-center gap-3 text-[13px]">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.faixa, color: c.roxo }}><Icone className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium">{NOME_CLIENTE[s.cliente] ?? 'Site'}{s.atual && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ background: '#22c55e' }}>este aparelho</span>}</span>
                      <span className="block text-[11px] truncate" style={{ color: c.suave }}>{s.navegador} · desde {fmtQuando(s.desde)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <MBotao variante="secundario" className="mt-4" onClick={sairDeTudo}><LogOut className="w-4 h-4" /> Sair de todos os aparelhos</MBotao>
        </MCard>
      </div>

      {/* Plano */}
      <MCard c={c} i={4} className="mb-4" destaque={pro}>
        <MFaixa c={c} icone={<Crown className="w-5 h-5" />} titulo="Assinatura" sub={getPlanFullName(user.plan)} />
        {pro ? (
          <MBotao variante="perigo" onClick={() => { setErroFolha(null); setFolha('cancelar'); }}>Cancelar assinatura</MBotao>
        ) : (
          <MBotao onClick={() => navigate('/plans')}><Sparkles className="w-4 h-4" /> Conhecer o Krypta Pro</MBotao>
        )}
        <button type="button" onClick={() => navigate('/compras')} className="w-full mt-3 text-[13px] flex items-center justify-center gap-1.5" style={{ color: c.roxo }}>
          <Package className="w-4 h-4" /> Minhas compras
        </button>
      </MCard>

      <MBotao variante="secundario" onClick={() => { signOut(); navigate('/', { replace: true }); }}><LogOut className="w-4 h-4" /> Sair da conta</MBotao>

      {/* Folhas */}
      <MFolha aberta={folha === 'senha'} onFechar={() => setFolha(null)} titulo="Alterar senha">
        <div className="space-y-3">
          <MCampo c={c} rotulo="Senha atual" type="password" autoComplete="current-password" value={senhas.atual} onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })} />
          <MCampo c={c} rotulo="Nova senha" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={senhas.nova} onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })} />
          <MCampo c={c} rotulo="Confirmar nova senha" type="password" autoComplete="new-password" value={senhas.conf} onChange={(e) => setSenhas({ ...senhas, conf: e.target.value })} />
          {erroFolha && <MAviso tipo="erro">{erroFolha}</MAviso>}
          <MBotao carregando={ocupado} onClick={trocarSenha}>Trocar senha</MBotao>
          <p className="text-[11px] text-center" style={{ color: c.suave }}>Por segurança, todos os aparelhos saem da conta.</p>
        </div>
      </MFolha>
      <MFolha aberta={folha === 'cancelar'} onFechar={() => setFolha(null)} titulo="Cancelar o Krypta Pro?">
        <p className="text-[13px] mb-3" style={{ color: c.suave }}>Seu cofre continua funcionando. Kill Switch, alertas, novos dispositivos físicos e trocar a herança ficam travados, e o espaço volta a 64 KB.</p>
        <MCampo c={c} rotulo="Confirme com a sua senha" type="password" value={senhaConfirma} onChange={(e) => setSenhaConfirma(e.target.value)} />
        {erroFolha && <div className="mt-3"><MAviso tipo="erro">{erroFolha}</MAviso></div>}
        <MBotao className="mt-4" variante="perigo" carregando={ocupado} disabled={!senhaConfirma} onClick={cancelar}>Cancelar assinatura</MBotao>
      </MFolha>
    </MobileShell>
  );
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
export function MConfig() {
  const c = useMCores();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { modo, preferencia, mudarPreferencia } = useModo();
  const [atualizacao, setAtualizacao] = useState<'parado' | 'verificando' | 'nova' | 'atualizado' | 'indisponivel'>('parado');

  const verificar = async () => {
    setAtualizacao('verificando');
    setAtualizacao(await verificarAtualizacao().catch(() => 'indisponivel' as const));
  };

  const OPCOES_MODO: Array<{ id: PreferenciaModo; rotulo: string; icone: typeof Smartphone }> = [
    { id: 'auto', rotulo: 'Automático', icone: Sparkles },
    { id: 'mobile', rotulo: 'Mobile', icone: Smartphone },
    { id: 'web', rotulo: 'Web', icone: Monitor },
  ];

  return (
    <MobileShell>
      <MTitulo c={c} titulo="Configurações" sub="Aparência, modo de exibição e avisos do Krypta." />

      {/* Modo de exibição */}
      <MCard c={c} i={0} className="mb-4" destaque>
        <MFaixa c={c} icone={<Smartphone className="w-5 h-5" />} titulo="Modo de exibição" sub="Telas de app (Mobile) ou o site completo (Web)." />
        <div className="grid grid-cols-3 gap-2">
          {OPCOES_MODO.map(({ id, rotulo, icone: Icone }) => {
            const ativo = preferencia === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => mudarPreferencia(id)}
                className="h-16 rounded-xl flex flex-col items-center justify-center gap-1 text-[12.5px] font-semibold"
                style={ativo ? { background: GRAD, color: '#fff' } : { border: `1.5px solid ${c.borda}`, color: c.texto }}
                aria-pressed={ativo}
              >
                <Icone className="w-5 h-5" /> {rotulo}
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] mt-3" style={{ color: c.suave }}>
          {preferencia === 'auto'
            ? `Automático: agora em modo ${modo === 'mobile' ? 'Mobile' : 'Web'} (${motivoDoModo()}).`
            : `Fixado em modo ${preferencia === 'mobile' ? 'Mobile' : 'Web'} neste aparelho.`}
        </p>
      </MCard>

      {/* Preferências */}
      <MCard c={c} i={1} className="mb-4">
        <MFaixa c={c} icone={<Sun className="w-5 h-5" />} titulo="Preferências" sub="Personalize o visual do Krypta." />
        <div className="flex items-center justify-between py-2 text-[14px]">
          <span className="flex items-center gap-2">{c.isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Tema escuro</span>
          <MInterruptor ligado={c.isDark} onChange={toggleTheme} />
        </div>
        <div className="flex items-center justify-between py-2 text-[14px]">
          <span className="flex items-center gap-2"><Languages className="w-4 h-4" /> Idioma</span>
          <span className="text-[12.5px] px-3 py-1 rounded-full" style={{ border: `1px solid ${c.borda}` }}>Português (Brasil)</span>
        </div>
      </MCard>

      {/* Notificações */}
      <MCard c={c} i={2} className="mb-4">
        <MFaixa c={c} icone={<Bell className="w-5 h-5" />} titulo="Notificações" sub="Como o Krypta avisa você." />
        {[
          { icone: Mail, rotulo: 'Alertas de segurança por e-mail' },
          { icone: Bell, rotulo: 'Notificações no aplicativo' },
        ].map(({ icone: Icone, rotulo }) => (
          <div key={rotulo} className="flex items-center justify-between py-2 text-[14px]">
            <span className="flex items-center gap-2"><Icone className="w-4 h-4" /> {rotulo}</span>
            <MInterruptor ligado desabilitado />
          </div>
        ))}
        <p className="text-[11.5px] mt-1" style={{ color: c.suave }}>Sempre ligados: Kill Switch, resgate de herança e inatividade do cofre são avisos de segurança.</p>
      </MCard>

      {/* Atualizações */}
      <MCard c={c} i={3} className="mb-4">
        <MFaixa c={c} icone={<RefreshCw className="w-5 h-5" />} titulo="Atualizações" sub="O app se atualiza sozinho a cada nova versão do site." />
        <div className="flex items-center justify-between py-2 text-[14px]">
          <span>Versão do aplicativo</span>
          <span className="font-mono text-[13px]">v{KRYPTA_VERSION}</span>
        </div>
        <div className="flex items-center justify-between py-2 text-[14px]">
          <span>Verificar atualizações</span>
          {atualizacao === 'nova' ? (
            <button type="button" onClick={() => window.location.reload()} className="px-3 py-1 rounded-full text-[12px] font-semibold text-white" style={{ background: '#22c55e' }}>Atualizar agora</button>
          ) : (
            <button type="button" onClick={verificar} disabled={atualizacao === 'verificando'} className="px-3 py-1 rounded-full text-[12px] font-semibold text-white disabled:opacity-60" style={{ background: GRAD }}>
              {atualizacao === 'verificando' ? 'Verificando...' : 'Verificar'}
            </button>
          )}
        </div>
        {atualizacao === 'atualizado' && <p className="text-[12px] flex items-center gap-1.5" style={{ color: '#22c55e' }}><Check className="w-4 h-4" /> Você já está na versão mais nova.</p>}
        {atualizacao === 'indisponivel' && <p className="text-[12px]" style={{ color: c.suave }}>Pelo navegador, cada vez que você abre o Krypta já vem a versão mais nova.</p>}
      </MCard>

      <div className="grid grid-cols-2 gap-3">
        <MBotao variante="secundario" onClick={() => navigate('/aplicacoes')}><Download className="w-4 h-4" /> Aplicações</MBotao>
        <MBotao variante="secundario" onClick={() => navigate('/contact')}><Mail className="w-4 h-4" /> Ajuda</MBotao>
      </div>
    </MobileShell>
  );
}

// ============================================================
// PLANOS
// ============================================================
const PRO_RECURSOS = ['Dispositivo Krypta físico', 'Kill Switch (bloqueio remoto)', 'Herança digital', 'Alertas de acesso', 'Backup de até 1 MB'];
const FREE_RECURSOS = ['Cofre zero-knowledge', 'Dispositivo de software', 'Chave de contingência (CCP)', 'Backup de até 64 KB'];

export function MPlanos() {
  const c = useMCores();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [anual, setAnual] = useState(false);
  const pro = isProPlan(user?.plan);
  const recomendado = (params.get('recomendado') as 'free' | 'pro' | null) ?? user?.recomendacao ?? null;

  const assinar = () => {
    const plan = {
      tier: 'pro',
      name: 'Krypta Pro',
      subtitle: 'Todos os recursos do Krypta em um só plano',
      price: anual ? 'R$225' : 'R$25',
      period: anual ? 'por ano' : 'por mês',
      description: 'O nível máximo de proteção do Krypta.',
      features: PRO_RECURSOS,
      cta: 'Assine Agora',
    };
    navigate('/checkout', { state: { kind: 'plan', plan, isAnnual: anual } });
  };

  const Item = ({ ok, texto }: { ok: boolean; texto: string }) => (
    <li className="flex items-center gap-2 text-[13px]">
      {ok ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 shrink-0" style={{ color: c.suave }} />}
      <span style={{ color: ok ? c.texto : c.suave }}>{texto}</span>
    </li>
  );

  return (
    <MobileShell voltar={true}>
      <MTitulo c={c} titulo="Planos" sub="Escolha a proteção certa para você." />

      {recomendado && (
        <MCard c={c} i={0} className="mb-4" style={{ background: c.faixa }}>
          <p className="text-[13px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: c.roxo }} />
            Pelas suas respostas, recomendamos o <strong>{recomendado === 'pro' ? 'Krypta Pro' : 'Krypta Free'}</strong>.
          </p>
        </MCard>
      )}

      {/* Mensal × anual */}
      <div className="flex p-1 rounded-full mb-4" style={{ border: `1.5px solid ${c.borda}` }}>
        {[false, true].map((a) => (
          <button key={String(a)} type="button" onClick={() => setAnual(a)} className="flex-1 h-9 rounded-full text-[13px] font-semibold" style={anual === a ? { background: GRAD, color: '#fff' } : { color: c.suave }}>
            {a ? 'Anual (−25%)' : 'Mensal'}
          </button>
        ))}
      </div>

      {/* Pro */}
      <MCard c={c} i={1} destaque className="mb-4 overflow-hidden">
        {recomendado === 'pro' && <span className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full text-white font-bold" style={{ background: GRAD }}>RECOMENDADO</span>}
        <p className="flex items-center gap-2 font-semibold text-[18px]"><Crown className="w-5 h-5" style={{ color: c.roxo }} /> Krypta Pro</p>
        <p className="mt-2"><span className="text-[30px] font-bold" style={{ fontFamily: FONTE }}>{anual ? 'R$225' : 'R$25'}</span> <span className="text-[13px]" style={{ color: c.suave }}>{anual ? '/ano' : '/mês'}</span></p>
        <ul className="space-y-1.5 my-4">{PRO_RECURSOS.map((t) => <Item key={t} ok texto={t} />)}</ul>
        {pro ? (
          <MBotao variante="secundario" onClick={() => navigate('/profile')}><Check className="w-4 h-4" /> Seu plano atual · Gerenciar</MBotao>
        ) : (
          <MBotao onClick={assinar}>Assinar o Krypta Pro</MBotao>
        )}
      </MCard>

      {/* Free */}
      <MCard c={c} i={2}>
        {recomendado === 'free' && <span className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full text-white font-bold" style={{ background: GRAD }}>RECOMENDADO</span>}
        <p className="font-semibold text-[18px]">Krypta Free</p>
        <p className="mt-2"><span className="text-[30px] font-bold" style={{ fontFamily: FONTE }}>R$0</span> <span className="text-[13px]" style={{ color: c.suave }}>para sempre</span></p>
        <ul className="space-y-1.5 my-4">
          {FREE_RECURSOS.map((t) => <Item key={t} ok texto={t} />)}
          <Item ok={false} texto="Kill Switch, herança e chave física" />
        </ul>
        {!pro ? (
          <p className="text-[12.5px] text-center font-semibold" style={{ color: c.roxo }}>Seu plano atual</p>
        ) : (
          <MBotao variante="secundario" onClick={() => navigate('/profile')}>Voltar ao Free (cancelar o Pro)</MBotao>
        )}
      </MCard>
    </MobileShell>
  );
}
