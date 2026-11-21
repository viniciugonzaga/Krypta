// src/mobile/pages/MCofre.tsx
// ============================================================
// MODO MOBILE — Cofre
//   MCofre         → "/device"            Cofre Digital (chaves + atalhos)
//   MChaves        → "/cofre/chaves"       todas as chaves (ver, copiar, excluir)
//   MNovaChave     → "/cofre/nova-chave"   o botão "+" da barra
//   MHerancaApp    → "/heranca-digital"    estado da herança digital
//   MBloqueio      → "/bloqueio"           Kill Switch e vincular este aparelho
//   MEmergencia    → "/emergencia"         recursos de emergência
//   MCofreCompleto → "/cofre/completo"     tela completa do site (pareamento, CCP, herança...)
// Tudo usa as mesmas funções do site (services/vaultFlows.ts).
// ============================================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lightbulb,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Device } from '../../pages/Device';
import { handleApiError } from '../../services/api';
import * as Flows from '../../services/vaultFlows';
import { normalizarSegredo, segredoValido, type Credencial } from '../../crypto/kryptaCrypto';
import { gerarSenhaForte, useCofre } from '../useCofre';
import { FONTE, GRAD, MAviso, MBotao, MCampo, MCard, MFaixa, MFolha, MInterruptor, MLinhaAcao, MTitulo, MobileShell, useMCores, type MCores } from '../ui';

export const CATEGORIAS = ['Pessoal', 'Bancos', 'Redes sociais', 'Trabalho', 'Estudos', 'Compras', 'Jogos', 'Outros'];

// Cor e letra do "ícone" de cada chave (sem baixar logos de terceiros)
const CORES_ICONE = ['#6131C9', '#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
function IconeChave({ nome }: { nome: string }) {
  const n = nome.trim() || '?';
  const cor = CORES_ICONE[[...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) % CORES_ICONE.length];
  return (
    <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[15px] shrink-0" style={{ background: cor }}>
      {n[0].toUpperCase()}
    </span>
  );
}

/** Quando o cofre ainda não está pronto neste aparelho */
function CofreNaoPronto({ c, estado, aqui }: { c: MCores; estado?: string; aqui: boolean }) {
  const navigate = useNavigate();
  const textos: Record<string, [string, string]> = {
    PENDENTE_PAREAMENTO: ['Seu cofre ainda não foi ativado', 'Pareie este aparelho (ou um dispositivo Krypta) e gere sua chave de contingência.'],
    REVOGADA: ['Dispositivo bloqueado', 'O Kill Switch foi acionado. Vincule este aparelho para recuperar o cofre.'],
    RECUPERACAO_LOCAL: ['Recuperação em andamento', 'Termine a recuperação para voltar a usar o cofre.'],
    RECUPERACAO_HARDWARE: ['Novo dispositivo em recuperação', 'Termine a recuperação para voltar a usar o cofre.'],
  };
  const [titulo, texto] =
    estado === 'ATIVA' && !aqui
      ? ['O cofre está em outro aparelho', 'A chave do cofre fica no dispositivo onde você pareou (outro navegador, o app ou o Krypta físico). As ações de emergência continuam aqui.']
      : textos[estado ?? 'PENDENTE_PAREAMENTO'] ?? textos.PENDENTE_PAREAMENTO;
  return (
    <MCard c={c} destaque className="mb-4">
      <div className="flex gap-3">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: GRAD }}>
          <Lock className="w-5 h-5" />
        </span>
        <div>
          <p className="font-semibold">{titulo}</p>
          <p className="text-[12.5px] mt-1" style={{ color: c.suave }}>{texto}</p>
        </div>
      </div>
      {estado !== 'ATIVA' && (
        <MBotao className="mt-4" onClick={() => navigate(estado === 'REVOGADA' ? '/bloqueio' : '/cofre/completo')}>
          {estado === 'PENDENTE_PAREAMENTO' ? 'Ativar meu cofre' : estado === 'REVOGADA' ? 'Vincular este aparelho' : 'Continuar'}
        </MBotao>
      )}
    </MCard>
  );
}

function LinhaChave({ c, cred, onExcluir }: { c: MCores; cred: Credencial; onExcluir?: () => void }) {
  const [ver, setVer] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cred.senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1400);
    } catch {
      /* sem permissão */
    }
  };
  return (
    <li className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${c.faixa}` }}>
      <IconeChave nome={cred.servico} />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[14px] truncate">{cred.servico}</span>
        <span className="block text-[12px] font-mono truncate" style={{ color: c.suave }}>
          {ver ? cred.senha : '••••••••••••'}
        </span>
        {ver && cred.usuario && <span className="block text-[11px] truncate" style={{ color: c.suave }}>{cred.usuario}</span>}
      </span>
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'} className="p-2" style={{ color: c.roxo }}>
        {ver ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
      </button>
      <button type="button" onClick={copiar} aria-label="Copiar senha" className="p-2" style={{ color: copiado ? '#22c55e' : c.roxo }}>
        {copiado ? <Check className="w-[18px] h-[18px]" /> : <Copy className="w-[18px] h-[18px]" />}
      </button>
      {onExcluir && (
        <button type="button" onClick={onExcluir} aria-label="Excluir chave" className="p-2" style={{ color: '#f87171' }}>
          <Trash2 className="w-[18px] h-[18px]" />
        </button>
      )}
    </li>
  );
}

// ============================================================
// COFRE DIGITAL
// ============================================================
export function MCofre() {
  const c = useMCores();
  const navigate = useNavigate();
  const { conta, dispositivo, carregando, erro, aqui, pronto } = useCofre();
  const chaves = dispositivo?.credenciais ?? [];
  const r = conta?.recursos;

  return (
    <MobileShell>
      <MTitulo c={c} titulo="Cofre Digital" sub="Aqui estão suas chaves, sempre protegidas." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : (
        <>
          {erro && <div className="mb-4"><MAviso tipo="erro">{erro}</MAviso></div>}
          {!pronto && <CofreNaoPronto c={c} estado={conta?.status} aqui={aqui} />}

          {pronto && (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/cofre/nova-chave')}
                className="w-full rounded-2xl p-4 flex items-center gap-3 text-left text-white mb-4"
                style={{ background: GRAD, boxShadow: '0 10px 26px rgba(97,49,201,0.4)' }}
              >
                <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ border: '2px solid rgba(255,255,255,0.8)' }}>
                  <Plus className="w-6 h-6" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-[16px]">Criar nova chave</span>
                  <span className="block text-[12px] text-white/80">Adicione uma nova credencial ao seu cofre.</span>
                </span>
                <ChevronRight className="w-6 h-6" />
              </motion.button>

              <MCard c={c} i={1} className="mb-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4" style={{ color: c.roxo }} /> Minhas chaves</p>
                  <button type="button" onClick={() => navigate('/cofre/chaves')} className="text-[12px] flex items-center" style={{ color: c.roxo }}>
                    Ver todas <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {chaves.length === 0 ? (
                  <p className="text-[13px] py-4 text-center" style={{ color: c.suave }}>Nenhuma chave ainda. Toque no + para criar a primeira.</p>
                ) : (
                  <ul>{chaves.slice(0, 3).map((cred) => <LinhaChave key={cred.id} c={c} cred={cred} />)}</ul>
                )}
              </MCard>
            </>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <MCard c={c} i={2} onClick={() => navigate('/heranca-digital')}>
              <p className="font-semibold text-[14px] flex items-center gap-1.5"><Users className="w-4 h-4" style={{ color: c.roxo }} /> Herança Digital</p>
              <p className="text-[11.5px] mt-1 leading-snug" style={{ color: c.suave }}>Seu cofre chega a quem você confia.</p>
              <p className="text-[11px] mt-2 font-semibold" style={{ color: conta?.heranca_ativa ? '#22c55e' : c.roxo }}>{conta?.heranca_ativa ? 'Ativa' : r?.heranca ? 'Configurar →' : 'Pro'}</p>
            </MCard>
            <MCard c={c} i={3} onClick={() => navigate('/bloqueio')}>
              <p className="font-semibold text-[14px] flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" style={{ color: c.roxo }} /> Bloqueio Remoto</p>
              <p className="text-[11.5px] mt-1 leading-snug" style={{ color: c.suave }}>Bloqueie o cofre em caso de perda ou roubo.</p>
              <p className="text-[11px] mt-2 font-semibold" style={{ color: conta?.status === 'REVOGADA' ? '#f87171' : c.roxo }}>{conta?.status === 'REVOGADA' ? 'Bloqueado' : r?.killSwitch ? 'Abrir →' : 'Pro'}</p>
            </MCard>
          </div>
          <MLinhaAcao c={c} i={4} icone={<AlertTriangle className="w-5 h-5" />} titulo="Recursos de Emergência" texto="Recuperação, acesso suspeito e suporte." to="/emergencia" />
          <button type="button" onClick={() => navigate('/cofre/completo')} className="w-full text-center text-[12px] mt-4 underline underline-offset-4" style={{ color: c.suave }}>
            Abrir a tela completa do cofre (CCP, dispositivo, kit de herança)
          </button>
        </>
      )}
    </MobileShell>
  );
}

// ============================================================
// TODAS AS CHAVES
// ============================================================
export function MChaves() {
  const c = useMCores();
  const navigate = useNavigate();
  const { dispositivo, pronto, carregando, conta, aqui, salvar } = useCofre();
  const [busca, setBusca] = useState('');
  const [excluir, setExcluir] = useState<Credencial | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const todas = [...(dispositivo?.credenciais ?? [])].sort((a, b) => a.servico.localeCompare(b.servico));
    return t ? todas.filter((x) => `${x.servico} ${x.usuario} ${x.categoria ?? ''}`.toLowerCase().includes(t)) : todas;
  }, [dispositivo, busca]);

  const confirmarExclusao = async () => {
    if (!excluir || !dispositivo) return;
    setOcupado(true);
    setErro(null);
    try {
      await salvar(dispositivo.credenciais.filter((x) => x.id !== excluir.id));
      setExcluir(null);
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Minhas chaves" sub="Aqui estão todas as suas chaves salvas." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : !pronto ? (
        <CofreNaoPronto c={c} estado={conta?.status} aqui={aqui} />
      ) : (
        <>
          <label className="relative block mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.suave }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar chave" className="w-full h-11 pl-9 pr-3 rounded-xl text-[14px] outline-none" style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }} />
          </label>
          <MCard c={c} className="mb-4">
            {lista.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: c.suave }}>{busca ? 'Nada encontrado.' : 'Nenhuma chave ainda.'}</p>
            ) : (
              <ul>{lista.map((cred) => <LinhaChave key={cred.id} c={c} cred={cred} onExcluir={() => setExcluir(cred)} />)}</ul>
            )}
          </MCard>
          <MBotao onClick={() => navigate('/cofre/nova-chave')}><Plus className="w-5 h-5" /> Criar nova chave</MBotao>
        </>
      )}

      <MFolha aberta={!!excluir} onFechar={() => setExcluir(null)} titulo="Excluir chave?">
        <p className="text-[13.5px] mb-4" style={{ color: c.suave }}>
          A chave <strong style={{ color: c.texto }}>{excluir?.servico}</strong> sai do cofre e do backup. Não dá para desfazer.
        </p>
        {erro && <div className="mb-3"><MAviso tipo="erro">{erro}</MAviso></div>}
        <MBotao variante="perigo" carregando={ocupado} onClick={confirmarExclusao}><Trash2 className="w-4 h-4" /> Excluir</MBotao>
      </MFolha>
    </MobileShell>
  );
}

// ============================================================
// CRIAR NOVA CHAVE (botão "+")
// ============================================================
export function MNovaChave() {
  const c = useMCores();
  const navigate = useNavigate();
  const { dispositivo, pronto, carregando, conta, aqui, salvar } = useCofre();
  const [f, setF] = useState({ servico: '', usuario: '', senha: '', categoria: '', nota: '' });
  const [ver, setVer] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvarChave = async () => {
    setErro(null);
    if (!f.servico.trim()) return setErro('Dê um nome para a chave (ex.: Google, Netflix).');
    if (!f.senha) return setErro('Digite a senha ou toque em "Gerar".');
    if (!f.categoria) return setErro('Escolha uma categoria.');
    if (!dispositivo) return;
    setOcupado(true);
    try {
      const nova: Credencial = {
        id: crypto.randomUUID(),
        servico: f.servico.trim(),
        usuario: f.usuario.trim(),
        senha: f.senha,
        categoria: f.categoria,
        nota: f.nota.trim() || undefined,
        criadaEm: new Date().toISOString(),
      };
      await salvar([...dispositivo.credenciais, nova]);
      navigate('/cofre/chaves', { replace: true });
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <MobileShell voltar={true}>
      <MTitulo c={c} titulo="Criar nova chave" sub="Adicione uma nova credencial ao seu cofre de forma segura." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : !pronto ? (
        <CofreNaoPronto c={c} estado={conta?.status} aqui={aqui} />
      ) : (
        <MCard c={c}>
          <MFaixa c={c} icone={<KeyRound className="w-5 h-5" />} titulo="Informações da nova chave" />
          <div className="space-y-3.5">
            <MCampo c={c} rotulo="Nome da chave *" placeholder="Ex.: Google, Netflix, Banco do Brasil" value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })} />
            <MCampo c={c} rotulo="E-mail, telefone ou usuário (opcional)" placeholder="Ex.: user@gmail.com" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} autoComplete="off" />
            <div>
              <MCampo
                c={c}
                rotulo="Senha *"
                type={ver ? 'text' : 'password'}
                autoComplete="new-password"
                value={f.senha}
                onChange={(e) => setF({ ...f, senha: e.target.value })}
                direita={
                  <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Esconder' : 'Mostrar'} className="p-1" style={{ color: c.suave }}>
                    {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <button type="button" onClick={() => { setF({ ...f, senha: gerarSenhaForte() }); setVer(true); }} className="mt-2 text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: c.roxo }}>
                <Wand2 className="w-4 h-4" /> Gerar senha forte
              </button>
            </div>
            <label className="block">
              <span className="block text-[13px] font-medium mb-1">Categoria *</span>
              <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className="w-full h-11 px-3 rounded-lg text-[14px] outline-none" style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }}>
                <option value="">Selecione uma categoria</option>
                {CATEGORIAS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <MCampo c={c} rotulo="Informação adicional (opcional)" placeholder="Ex.: PIN, pergunta de segurança" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} autoComplete="off" />
          </div>
          <p className="text-[12px] mt-4 rounded-lg p-2.5 flex items-center gap-2" style={{ background: c.faixa }}>
            <Lightbulb className="w-4 h-4 shrink-0" style={{ color: c.roxo }} /> Dica: use uma senha única e forte para cada conta.
          </p>
          {erro && <div className="mt-3"><MAviso tipo="erro">{erro}</MAviso></div>}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <MBotao variante="secundario" onClick={() => navigate(-1)}>Cancelar</MBotao>
            <MBotao carregando={ocupado} onClick={salvarChave}>Salvar chave</MBotao>
          </div>
        </MCard>
      )}
    </MobileShell>
  );
}

// ============================================================
// HERANÇA DIGITAL
// ============================================================
export function MHerancaApp() {
  const c = useMCores();
  const navigate = useNavigate();
  const { conta, carregando } = useCofre();
  const liberado = !!conta?.recursos?.heranca;
  const ativa = !!conta?.heranca_ativa;

  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Herança Digital" sub="Compartilhe o acesso às suas informações com pessoas de confiança." />
      <p className="text-[12.5px] rounded-xl p-3 mb-4" style={{ background: c.faixa }}>
        Você gera um <strong>kit do herdeiro</strong> (um código que só essa pessoa usa). Se precisar, ela abre seu cofre num aparelho novo, sem ter conta no Krypta.
      </p>
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : (
        <div className="space-y-3">
          <MCard c={c} i={0} className="flex items-center gap-3">
            <Users className="w-6 h-6" style={{ color: c.roxo }} />
            <span className="flex-1">
              <span className="block font-semibold">Status do recurso</span>
              <span className="block text-[12px]" style={{ color: c.suave }}>Sua herança digital está {ativa ? 'ativada' : 'desativada'}.</span>
            </span>
            <MInterruptor ligado={ativa} onChange={() => navigate(liberado || ativa ? '/cofre/completo#heranca' : '/plans')} />
          </MCard>

          {!liberado && !ativa ? (
            <MCard c={c} i={1} destaque>
              <p className="font-semibold flex items-center gap-2"><span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: GRAD }}>PRO</span> Recurso do Krypta Pro</p>
              <p className="text-[12.5px] mt-1 mb-3" style={{ color: c.suave }}>Assine o Pro para ativar a herança digital.</p>
              <MBotao onClick={() => navigate('/plans')}>Ver o Krypta Pro</MBotao>
            </MCard>
          ) : (
            <MLinhaAcao c={c} i={1} icone={<KeyRound className="w-5 h-5" />} titulo={ativa ? 'Trocar ou desativar o kit' : 'Gerar o kit do herdeiro'} texto="Precisa da sua chave de contingência (CCP)." to="/cofre/completo#heranca" />
          )}

          <MCard c={c} i={2}>
            <p className="font-semibold">Você é a pessoa de confiança de alguém?</p>
            <p className="text-[12.5px] mt-1 mb-3" style={{ color: c.suave }}>Use o código do kit que você recebeu para abrir o cofre.</p>
            <MBotao variante="secundario" onClick={() => navigate('/heranca')}>Resgatar com o código</MBotao>
          </MCard>
        </div>
      )}
    </MobileShell>
  );
}

// ============================================================
// BLOQUEIO REMOTO (Kill Switch) — direto daqui, com a CCP
// ============================================================
export function MBloqueio() {
  const c = useMCores();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { contaId, conta, carregando, recarregar } = useCofre();
  const [acao, setAcao] = useState<'bloquear' | 'vincular' | null>(null);
  const [ccp, setCcp] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const liberado = !!conta?.recursos?.killSwitch;
  const bloqueado = conta?.status === 'REVOGADA';

  const executar = async () => {
    setErro(null);
    if (!segredoValido(ccp)) return setErro('CCP inválida: são 32 caracteres em 8 blocos (XXXX-XXXX-...).');
    setOcupado(true);
    try {
      if (acao === 'bloquear') {
        await Flows.acionarKillSwitch(contaId, normalizarSegredo(ccp));
        setOk('Dispositivo bloqueado. Ele não consegue mais entrar no cofre.');
      } else {
        await Flows.vincularNovoDispositivo(contaId, normalizarSegredo(ccp));
        setOk('Este aparelho agora é o dispositivo do seu cofre. Tudo restaurado!');
      }
      setAcao(null);
      setCcp('');
      await Promise.all([recarregar(), refreshUser().catch(() => undefined)]);
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Bloqueio Remoto" sub="Proteja seu cofre mesmo à distância. Bloqueie o dispositivo em caso de perda, roubo ou acesso suspeito." />
      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: c.roxo }} /></div>
      ) : !liberado && !bloqueado ? (
        <MCard c={c} destaque>
          <p className="font-semibold">O bloqueio remoto (Kill Switch) é do Krypta Pro</p>
          <p className="text-[12.5px] mt-1 mb-3" style={{ color: c.suave }}>Perdeu o aparelho? Com o Pro você bloqueia na hora e recupera o cofre num novo.</p>
          <MBotao onClick={() => navigate('/plans')}>Ver o Krypta Pro</MBotao>
        </MCard>
      ) : (
        <div className="space-y-3">
          {ok && <MAviso tipo="ok">{ok}</MAviso>}
          <p className="font-semibold">Ações de segurança</p>
          <MLinhaAcao c={c} i={0} icone={<Lock className="w-5 h-5" />} titulo="Bloquear dispositivo remotamente" texto={bloqueado ? 'O dispositivo já está bloqueado.' : 'Impede novas entradas pelo dispositivo perdido.'} onClick={bloqueado ? undefined : () => { setErro(null); setAcao('bloquear'); }} perigo />
          <MLinhaAcao c={c} i={1} icone={<LockOpen className="w-5 h-5" />} titulo="Usar este aparelho como dispositivo" texto={bloqueado ? 'Vincula este aparelho e restaura o cofre do backup.' : 'Disponível depois de um bloqueio.'} onClick={bloqueado ? () => { setErro(null); setAcao('vincular'); } : undefined} />
          <MCard c={c} i={2} style={{ background: c.faixa }}>
            <p className="font-semibold text-[14px]">Importante</p>
            <p className="text-[12.5px] mt-1" style={{ color: c.suave }}>O bloqueio exige a sua chave de contingência (CCP). Ela nunca sai deste aparelho: só uma prova dela vai ao servidor.</p>
          </MCard>
        </div>
      )}

      <MFolha aberta={!!acao} onFechar={() => setAcao(null)} titulo={acao === 'bloquear' ? 'Bloquear o dispositivo?' : 'Vincular este aparelho'}>
        <p className="text-[13px] mb-4" style={{ color: c.suave }}>
          {acao === 'bloquear'
            ? 'O dispositivo atual perde o acesso na hora e não volta mais. Depois você vincula um aparelho novo com a mesma CCP.'
            : 'Este aparelho vira o dispositivo do cofre e baixa o backup cifrado.'}
        </p>
        <MCampo c={c} rotulo="Sua chave de contingência (CCP)" value={ccp} onChange={(e) => setCcp(e.target.value)} onBlur={() => ccp && setCcp(normalizarSegredo(ccp))} placeholder="XXXX-XXXX-XXXX-XXXX-..." autoCapitalize="characters" autoComplete="off" spellCheck={false} />
        {erro && <div className="mt-3"><MAviso tipo="erro">{erro}</MAviso></div>}
        <MBotao className="mt-4" variante={acao === 'bloquear' ? 'perigo' : 'primario'} carregando={ocupado} onClick={executar}>
          {acao === 'bloquear' ? 'Bloquear agora' : 'Vincular e restaurar'}
        </MBotao>
        {ocupado && <p className="text-[11px] text-center mt-2" style={{ color: c.suave }}>Conferindo a CCP... pode levar alguns segundos.</p>}
      </MFolha>
    </MobileShell>
  );
}

// ============================================================
// RECURSOS DE EMERGÊNCIA
// ============================================================
export function MEmergencia() {
  const c = useMCores();
  return (
    <MobileShell voltar="/device">
      <MTitulo c={c} titulo="Recursos de emergência" sub="Ferramentas rápidas e seguras para situações críticas." />
      <p className="text-[12.5px] rounded-xl p-3 mb-4" style={{ background: c.faixa }}>
        Em caso de perda de acesso, suspeita de invasão ou qualquer situação urgente, use as opções abaixo.
      </p>
      <div className="space-y-3">
        <MLinhaAcao c={c} i={0} icone={<KeyRound className="w-5 h-5" />} titulo="Recuperação de acesso" texto="Esqueceu a senha mestre? Recupere o cofre com a sua CCP." to="/cofre/completo" />
        <MLinhaAcao c={c} i={1} icone={<Search className="w-5 h-5" />} titulo="Acesso suspeito" texto="Veja as atividades recentes e onde sua conta está aberta." to="/profile#sessoes" />
        <MLinhaAcao c={c} i={2} icone={<Cpu className="w-5 h-5" />} titulo="Perdi meu dispositivo" texto="Bloqueio remoto e proteção do cofre." to="/bloqueio" perigo />
        <MLinhaAcao c={c} i={3} icone={<HelpCircle className="w-5 h-5" />} titulo="Preciso de ajuda" texto="Fale com a equipe do Krypta." to="/contact" />
      </div>
      <MCard c={c} i={4} className="mt-4" style={{ background: c.faixa }}>
        <p className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4" style={{ color: c.roxo }} /> Dica de segurança</p>
        <p className="text-[12.5px] mt-1" style={{ color: c.suave }}>Guarde sua CCP em papel, longe do celular. Viu algo estranho? Use o bloqueio remoto o quanto antes.</p>
      </MCard>
    </MobileShell>
  );
}

// ============================================================
// TELA COMPLETA DO COFRE (a mesma do site, dentro do app)
// ============================================================
export function MCofreCompleto() {
  return (
    <MobileShell voltar="/device">
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-mx-4" style={{ fontFamily: FONTE }}>
          <Device embutido />
        </motion.div>
      </AnimatePresence>
    </MobileShell>
  );
}
