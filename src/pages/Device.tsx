// src/pages/Device.tsx
// ============================================================
// MEU KRYPTA — o dispositivo e o cofre da conta.
//
// Mostra o estado do cofre (vindo da API) e as ações possíveis em cada
// estado. Enquanto o app com o ESP32 não existe, um DISPOSITIVO VIRTUAL
// (src/services/virtualDevice.ts) faz o papel do hardware no navegador.
//
//   PENDENTE_PAREAMENTO → parear (gera a CCP)
//   ATIVA               → cofre, recuperação, troca da CCP, herança, Kill Switch
//   REVOGADA            → vincular dispositivo novo
//   RECUPERACAO_*       → concluir a recuperação
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { VaultAPI, type ContaCofre, type EstadoCofre } from '../services/api';
import { VirtualDevice, type EstadoDispositivo } from '../services/virtualDevice';
import * as Flows from '../services/vaultFlows';
import { aleatorio, bytesParaB64, gerarSegredo, normalizarSegredo, segredoValido, type Credencial } from '../crypto/kryptaCrypto';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";

const ESTADO_INFO: Record<EstadoCofre, { rotulo: string; cor: string; texto: string }> = {
  PENDENTE_PAREAMENTO: { rotulo: 'Sem dispositivo', cor: '#B4A0C8', texto: 'Pareie um dispositivo para ativar o cofre.' },
  ATIVA: { rotulo: 'Ativo', cor: '#22c55e', texto: 'Cofre protegido pelo dispositivo Krypta.' },
  REVOGADA: { rotulo: 'Revogado', cor: '#f87171', texto: 'O dispositivo foi revogado (Kill Switch). Vincule um novo.' },
  RECUPERACAO_LOCAL: { rotulo: 'Em recuperação', cor: '#f59e0b', texto: 'Recuperação local em andamento.' },
  RECUPERACAO_HARDWARE: { rotulo: 'Novo dispositivo', cor: '#f59e0b', texto: 'Novo dispositivo vinculado: conclua a recuperação.' },
};

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
      border: isDark ? 'rgba(141,81,255,0.45)' : 'rgba(81,0,189,0.25)',
      corner: `1.5px solid ${bright}`,
      cardBg: isDark
        ? 'linear-gradient(160deg, rgba(25,6,55,0.9) 0%, rgba(0,0,0,0.85) 100%)'
        : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,251,0.95) 100%)',
      glow: isDark ? '0 0 28px rgba(97,49,201,0.3)' : '0 10px 30px rgba(81,0,189,0.1)',
      fieldBg: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.95)',
    };
  }, [isDark]);
}

type Cores = ReturnType<typeof useCores>;

function Corners({ c }: { c: Cores }) {
  return (
    <>
      <span className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: c.corner, borderLeft: c.corner }} />
      <span className="absolute top-0 right-0 w-3 h-3 pointer-events-none" style={{ borderTop: c.corner, borderRight: c.corner }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" style={{ borderBottom: c.corner, borderLeft: c.corner }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: c.corner, borderRight: c.corner }} />
    </>
  );
}

function Painel({ c, children, className = '', destaque }: { c: Cores; children: ReactNode; className?: string; destaque?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-xl p-5 md:p-6 ${className}`}
      style={{ background: c.cardBg, border: `1px solid ${destaque ?? c.border}`, boxShadow: c.glow, color: c.fg }}
    >
      <Corners c={c} />
      {children}
    </motion.section>
  );
}

function Botao({
  c,
  onClick,
  children,
  disabled,
  variante = 'primario',
  type = 'button',
}: {
  c: Cores;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  variante?: 'primario' | 'secundario' | 'perigo';
  type?: 'button' | 'submit';
}) {
  const estilos: Record<string, React.CSSProperties> = {
    primario: { background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', color: '#fff', boxShadow: '0 0 18px rgba(141,81,255,0.4)' },
    secundario: { background: 'transparent', color: c.bright, border: `1px solid ${c.bright}` },
    perigo: { background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)', color: '#fff', boxShadow: '0 0 18px rgba(239,68,68,0.35)' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{ ...estilos[variante], fontFamily: ROUNDED_FONT }}
    >
      {children}
    </button>
  );
}

// ============================================================
// CAMPO DE CCP / CCH (digitar)
// ============================================================
function CampoSegredo({ c, label, valor, onChange }: { c: Cores; label: string; valor: string; onChange: (v: string) => void }) {
  const valido = segredoValido(valor);
  return (
    <div>
      <label className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: c.muted }}>
        {label}
      </label>
      <div className="relative">
        <input
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => valor && onChange(normalizarSegredo(valor))}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          spellCheck={false}
          autoComplete="off"
          className="w-full py-3 pl-4 pr-10 rounded-lg text-[13px] font-mono tracking-wider outline-none focus:ring-2 focus:ring-purple-500/50"
          style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.fg }}
        />
        {valor && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {valido ? <Check className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// REVELAR CCP / CCH (mostrar uma vez + confirmar que anotou)
// ============================================================
function RevelarSegredo({
  c,
  segredo,
  titulo,
  aviso,
  nomeArquivo,
  conteudoArquivo,
  onConfirmado,
}: {
  c: Cores;
  segredo: string;
  titulo: string;
  aviso: string;
  nomeArquivo: string;
  conteudoArquivo: string;
  onConfirmado: (ok: boolean) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [anotei, setAnotei] = useState(false);
  const [redigitado, setRedigitado] = useState('');
  const ultimoBloco = segredo.split('-').pop() ?? '';
  const confere = normalizarSegredo(redigitado) === ultimoBloco;

  useEffect(() => {
    onConfirmado(anotei && confere);
  }, [anotei, confere, onConfirmado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(segredo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem permissão */
    }
  };

  const baixar = () => {
    const blob = new Blob([conteudoArquivo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: c.isDark ? 'rgba(141,81,255,0.08)' : 'rgba(81,0,189,0.05)', border: `1px dashed ${c.bright}` }}>
      <div>
        <p className="text-xs font-bold tracking-[0.15em] uppercase mb-2" style={{ color: c.bright }}>{titulo}</p>
        <motion.p
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          className="font-mono text-base md:text-lg font-bold tracking-wider break-all select-all"
          style={{ color: c.fg }}
        >
          {segredo}
        </motion.p>
        <p className="text-[11.5px] mt-2" style={{ color: c.muted }}>{aviso}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Botao c={c} variante="secundario" onClick={copiar}>
          {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiado ? 'Copiado' : 'Copiar'}
        </Botao>
        <Botao c={c} variante="secundario" onClick={baixar}>
          <Download className="w-4 h-4" /> Baixar .txt
        </Botao>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: c.fg }}>
        <input type="checkbox" checked={anotei} onChange={(e) => setAnotei(e.target.checked)} className="w-4 h-4 accent-purple-600" />
        Anotei e guardei em lugar seguro (fora do computador)
      </label>
      <div>
        <label className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: c.muted }}>
          Para confirmar, digite o ÚLTIMO bloco
        </label>
        <input
          value={redigitado}
          onChange={(e) => setRedigitado(e.target.value)}
          maxLength={6}
          placeholder="XXXX"
          className="w-32 py-2.5 px-3 rounded-lg font-mono text-sm tracking-widest outline-none focus:ring-2 focus:ring-purple-500/50"
          style={{ background: c.fieldBg, border: `1px solid ${confere ? '#22c55e' : c.border}`, color: c.fg }}
        />
      </div>
    </div>
  );
}

// ============================================================
// AÇÃO (acordeão)
// ============================================================
function Acao({
  c,
  icone,
  titulo,
  descricao,
  aberta,
  onToggle,
  children,
  perigo,
}: {
  c: Cores;
  icone: ReactNode;
  titulo: string;
  descricao: string;
  aberta: boolean;
  onToggle: () => void;
  children: ReactNode;
  perigo?: boolean;
}) {
  const cor = perigo ? '#f87171' : c.bright;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${aberta ? cor : c.border}`, background: c.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)' }}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cor}22`, border: `1px solid ${cor}66`, color: cor }}>
          {icone}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[15px]" style={{ color: c.fg, fontFamily: ROUNDED_FONT }}>{titulo}</span>
          <span className="block text-xs" style={{ color: c.muted }}>{descricao}</span>
        </span>
        <motion.span animate={{ rotate: aberta ? 180 : 0 }} style={{ color: c.muted }}>
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// PÁGINA
// ============================================================
type Mensagem = { tipo: 'ok' | 'erro'; texto: string } | null;

function gerarSenhaForte(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  return Array.from(aleatorio(16), (b) => chars[b % chars.length]).join('');
}

export function Device() {
  const { user, refreshUser } = useAuth();
  const c = useCores();
  const contaId = user?.id ?? '';

  const [conta, setConta] = useState<ContaCofre | null>(null);
  const [dispositivo, setDispositivo] = useState<EstadoDispositivo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  // campos
  const [ccp, setCcp] = useState('');
  const [segredoNovo, setSegredoNovo] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [novaCred, setNovaCred] = useState({ servico: '', usuario: '', senha: '' });
  const [mostrarSenhas, setMostrarSenhas] = useState(false);

  const recarregar = useCallback(async () => {
    if (!contaId) return;
    try {
      setConta(await VaultAPI.account());
      setDispositivo(VirtualDevice.carregar(contaId));
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setCarregando(false);
    }
  }, [contaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const limparCampos = () => {
    setCcp('');
    setSegredoNovo(null);
    setConfirmado(false);
    setTextoConfirmacao('');
  };

  const alternar = (id: string) => {
    limparCampos();
    setMensagem(null);
    setAberta((a) => (a === id ? null : id));
  };

  /** Roda uma operação mostrando o progresso e o resultado */
  const executar = async (rotulo: string, fn: () => Promise<unknown>, sucesso: string) => {
    setOcupado(rotulo);
    setMensagem(null);
    try {
      await fn();
      setMensagem({ tipo: 'ok', texto: sucesso });
      limparCampos();
      setAberta(null);
      await Promise.all([recarregar(), refreshUser()]);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  };

  const onConfirmado = useCallback((ok: boolean) => setConfirmado(ok), []);

  const estado: EstadoCofre = conta?.status ?? 'PENDENTE_PAREAMENTO';
  const info = ESTADO_INFO[estado];
  const temDispositivoAqui = !!dispositivo && dispositivo.publicKey === conta?.public_key;
  const ccpOk = segredoValido(ccp);

  const kitArquivo = (tipo: 'ccp' | 'cch', segredo: string) =>
    tipo === 'ccp'
      ? `KRYPTA — CHAVE DE CONTINGÊNCIA (CCP)\n\nConta: ${user?.email}\nCCP: ${segredo}\n\nGuarde em papel, em lugar seguro. Ela recupera o cofre e aciona o Kill Switch.\nO Krypta NÃO consegue recuperá-la para você.\n`
      : `KRYPTA — KIT DO HERDEIRO\n\nconta_id: ${contaId}\nCCH: ${segredo}\n\nEntregue este kit ao seu herdeiro. Para resgatar, ele acessa /heranca no site Krypta\ncom um dispositivo novo. A CCH vale UMA vez.\n`;

  // ------------------------------------------------------------
  // Cofre (credenciais de demonstração)
  // ------------------------------------------------------------
  const adicionarCredencial = () => {
    if (!dispositivo || !novaCred.servico.trim()) return;
    const cred: Credencial = {
      id: bytesParaB64(aleatorio(6)),
      servico: novaCred.servico.trim(),
      usuario: novaCred.usuario.trim(),
      senha: novaCred.senha || gerarSenhaForte(),
      criadaEm: new Date().toISOString(),
    };
    executar(
      'Gravando no dispositivo e enviando o backup cifrado...',
      async () => {
        await Flows.salvarCofre(contaId, [...dispositivo.credenciais, cred]);
        setNovaCred({ servico: '', usuario: '', senha: '' });
      },
      `"${cred.servico}" salvo no dispositivo e sincronizado (backup cifrado).`
    );
  };

  const removerCredencial = (id: string) => {
    if (!dispositivo) return;
    executar(
      'Sincronizando...',
      () => Flows.salvarCofre(contaId, dispositivo.credenciais.filter((x) => x.id !== id)),
      'Credencial removida e cofre sincronizado.'
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: 'rgb(var(--krypta-fg))' }}>
      <Navbar />

      {/* Fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <div className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full blur-[180px]" style={{ background: `${c.purple}40` }} />
        <div className="absolute bottom-[-18%] right-[-10%] w-[600px] h-[500px] rounded-full blur-[200px]" style={{ background: `${c.purple}2e` }} />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 pt-32 pb-16 space-y-6">
        {/* ============ CABEÇALHO ============ */}
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 600, color: c.fg }}>
            Meu Krypta
          </h1>
          <p className="text-sm mt-1" style={{ color: c.muted }}>
            Seu dispositivo, seu cofre e as chaves de emergência.
          </p>
          <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(90deg, ${c.bright}, transparent)` }} />
        </motion.header>

        {/* ============ MENSAGEM / PROGRESSO ============ */}
        <AnimatePresence>
          {(ocupado || mensagem) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl p-3.5 flex items-start gap-2.5 text-sm"
              style={{
                background: ocupado ? 'rgba(141,81,255,0.12)' : mensagem?.tipo === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${ocupado ? 'rgba(141,81,255,0.4)' : mensagem?.tipo === 'ok' ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                color: ocupado ? c.fg : mensagem?.tipo === 'ok' ? (c.isDark ? '#86efac' : '#15803d') : '#f87171',
              }}
            >
              {ocupado ? <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" /> : mensagem?.tipo === 'ok' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{ocupado ?? mensagem?.texto}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============ STATUS ============ */}
        <Painel c={c}>
          {carregando ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: c.muted }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando o estado do cofre...
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="relative w-20 h-20 shrink-0 mx-auto md:mx-0">
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={{ border: `1.5px dashed ${info.cor}`, opacity: 0.7 }}
                  animate={{ rotate: estado === 'ATIVA' ? 360 : 0 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-2 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                  <Cpu className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 text-center md:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${info.cor}22`, border: `1px solid ${info.cor}66`, color: info.cor }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: info.cor }} /> {info.rotulo}
                  </span>
                  {conta?.heranca_ativa && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(141,81,255,0.15)', border: `1px solid ${c.border}`, color: c.bright }}>
                      <Users className="w-3 h-3" /> Herança ativa
                    </span>
                  )}
                  {temDispositivoAqui && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs" style={{ border: `1px solid ${c.border}`, color: c.muted }}>
                      Dispositivo virtual neste navegador
                    </span>
                  )}
                </div>
                <p className="text-sm mt-2" style={{ color: c.muted }}>{info.texto}</p>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                  <div><dt style={{ color: c.muted }}>Dispositivo</dt><dd className="font-mono font-semibold">{conta?.hardware_uuid ?? '—'}</dd></div>
                  <div><dt style={{ color: c.muted }}>Última atividade</dt><dd className="font-semibold">{conta?.ultimo_sincronismo ? new Date(conta.ultimo_sincronismo).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</dd></div>
                  <div><dt style={{ color: c.muted }}>Backup</dt><dd className="font-semibold">{dispositivo?.versionCounter ? `versão ${dispositivo.versionCounter}` : '—'}</dd></div>
                </dl>
              </div>
              <Botao c={c} variante="secundario" onClick={() => recarregar()} disabled={!!ocupado}>
                <RefreshCw className="w-4 h-4" /> Atualizar
              </Botao>
            </div>
          )}
        </Painel>

        {/* ============ PENDENTE: PAREAR ============ */}
        {!carregando && estado === 'PENDENTE_PAREAMENTO' && (
          <Painel c={c}>
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: ROUNDED_FONT }}>Parear dispositivo</h2>
            <p className="text-sm mb-4" style={{ color: c.muted }}>
              Enquanto o app do ESP32 não está pronto, um <strong>dispositivo virtual</strong> faz o papel do hardware neste navegador.
              O fluxo é o mesmo: a chave privada é gerada no dispositivo e o servidor recebe só a chave pública e a prova da sua CCP.
            </p>
            {!segredoNovo ? (
              <Botao c={c} onClick={() => setSegredoNovo(gerarSegredo())}>
                <KeyRound className="w-4 h-4" /> Gerar minha chave de contingência (CCP)
              </Botao>
            ) : (
              <div className="space-y-4">
                <RevelarSegredo
                  c={c}
                  segredo={segredoNovo}
                  titulo="Sua chave de contingência (CCP)"
                  aviso="Ela aparece UMA vez. Serve para recuperar o cofre e acionar o Kill Switch se perder o dispositivo. Ninguém (nem o Krypta) consegue recuperá-la."
                  nomeArquivo="krypta-ccp.txt"
                  conteudoArquivo={kitArquivo('ccp', segredoNovo)}
                  onConfirmado={onConfirmado}
                />
                <Botao
                  c={c}
                  disabled={!confirmado || !!ocupado}
                  onClick={() =>
                    executar(
                      'Derivando a prova da CCP (Argon2id), pareando e enviando o primeiro backup...',
                      () => Flows.parearDispositivo(contaId, segredoNovo),
                      'Dispositivo pareado! Seu cofre está ativo.'
                    )
                  }
                >
                  <Cpu className="w-4 h-4" /> Parear dispositivo virtual
                </Botao>
              </div>
            )}
          </Painel>
        )}

        {/* ============ ATIVA ============ */}
        {!carregando && estado === 'ATIVA' && (
          <>
            {/* Cofre */}
            <Painel c={c}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
                    <Lock className="w-5 h-5" style={{ color: c.bright }} /> Cofre (demonstração)
                  </h2>
                  <p className="text-xs" style={{ color: c.muted }}>
                    Guardado no dispositivo. O servidor recebe só o backup cifrado, que ele não consegue abrir.
                  </p>
                </div>
                {temDispositivoAqui && (
                  <button type="button" onClick={() => setMostrarSenhas((v) => !v)} className="text-xs flex items-center gap-1" style={{ color: c.bright }}>
                    {mostrarSenhas ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {mostrarSenhas ? 'Ocultar' : 'Mostrar'}
                  </button>
                )}
              </div>

              {!temDispositivoAqui ? (
                <p className="text-sm rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: c.isDark ? '#fcd34d' : '#92400e' }}>
                  O dispositivo desta conta não está neste navegador. Use o navegador onde você pareou (ou, no futuro, o app Krypta com o ESP32).
                  As ações de emergência abaixo continuam disponíveis.
                </p>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {dispositivo!.credenciais.length === 0 && (
                      <p className="text-sm" style={{ color: c.muted }}>Nenhuma credencial ainda. Adicione a primeira abaixo.</p>
                    )}
                    {dispositivo!.credenciais.map((cr) => (
                      <motion.div key={cr.id} layout className="flex items-center gap-3 rounded-lg p-3" style={{ background: c.isDark ? 'rgba(141,81,255,0.06)' : 'rgba(81,0,189,0.04)', border: `1px solid ${c.border}` }}>
                        <KeyRound className="w-4 h-4 shrink-0" style={{ color: c.bright }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{cr.servico}</p>
                          <p className="text-xs truncate" style={{ color: c.muted }}>{cr.usuario || '—'}</p>
                        </div>
                        <span className="font-mono text-xs hidden sm:block" style={{ color: c.muted }}>
                          {mostrarSenhas ? cr.senha : '••••••••••'}
                        </span>
                        <button type="button" onClick={() => removerCredencial(cr.id)} disabled={!!ocupado} className="p-1.5 rounded hover:bg-red-500/10" aria-label="Remover">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
                    {(['servico', 'usuario', 'senha'] as const).map((campo) => (
                      <input
                        key={campo}
                        value={novaCred[campo]}
                        onChange={(e) => setNovaCred((s) => ({ ...s, [campo]: e.target.value }))}
                        placeholder={campo === 'servico' ? 'Serviço (ex.: Gmail)' : campo === 'usuario' ? 'Usuário / e-mail' : 'Senha (vazio = gerar)'}
                        type={campo === 'senha' && !mostrarSenhas ? 'password' : 'text'}
                        className="py-2.5 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
                        style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.fg }}
                      />
                    ))}
                    <Botao c={c} onClick={adicionarCredencial} disabled={!novaCred.servico.trim() || !!ocupado}>
                      <Plus className="w-4 h-4" /> Salvar
                    </Botao>
                  </div>
                </>
              )}
            </Painel>

            {/* Ações */}
            <Painel c={c}>
              <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: ROUNDED_FONT }}>Segurança e contingência</h2>
              <div className="space-y-3">
                {temDispositivoAqui && (
                  <>
                    <Acao c={c} icone={<ShieldCheck className="w-5 h-5" />} titulo="Testar login do dispositivo" descricao="Assina um desafio com a chave do dispositivo (challenge-response)." aberta={aberta === 'login'} onToggle={() => alternar('login')}>
                      <Botao c={c} disabled={!!ocupado} onClick={() => executar('Assinando o desafio...', () => Flows.testarLogin(contaId), 'Login pelo dispositivo OK: assinatura Ed25519 aceita pelo servidor.')}>
                        <ShieldCheck className="w-4 h-4" /> Fazer login pelo dispositivo
                      </Botao>
                    </Acao>

                    <Acao c={c} icone={<KeyRound className="w-5 h-5" />} titulo="Esqueci a senha mestre" descricao="Recupera o cofre com a CCP, com o dispositivo em mãos." aberta={aberta === 'recuperar'} onToggle={() => alternar('recuperar')}>
                      <CampoSegredo c={c} label="Sua CCP" valor={ccp} onChange={setCcp} />
                      <Botao c={c} disabled={!ccpOk || !!ocupado} onClick={() => executar('Conferindo a CCP, baixando e abrindo o backup...', () => Flows.recuperacaoLocal(contaId, ccp), 'Cofre recuperado com a CCP e recuperação concluída.')}>
                        Recuperar cofre
                      </Botao>
                    </Acao>

                    <Acao c={c} icone={<RefreshCw className="w-5 h-5" />} titulo="Trocar a CCP" descricao="Gera uma CCP nova. A antiga deixa de valer." aberta={aberta === 'ccp'} onToggle={() => alternar('ccp')}>
                      <CampoSegredo c={c} label="CCP atual" valor={ccp} onChange={setCcp} />
                      {!segredoNovo ? (
                        <Botao c={c} variante="secundario" disabled={!ccpOk} onClick={() => setSegredoNovo(gerarSegredo())}>
                          Gerar a nova CCP
                        </Botao>
                      ) : (
                        <>
                          <RevelarSegredo c={c} segredo={segredoNovo} titulo="Sua NOVA CCP" aviso="Anote a nova CCP. A antiga só deixa de valer depois que o servidor confirmar a troca." nomeArquivo="krypta-ccp-nova.txt" conteudoArquivo={kitArquivo('ccp', segredoNovo)} onConfirmado={onConfirmado} />
                          <Botao c={c} disabled={!confirmado || !!ocupado} onClick={() => executar('Conferindo o novo envelope e trocando a CCP...', () => Flows.trocarCcp(contaId, ccp, segredoNovo), 'CCP trocada. A anterior não vale mais.')}>
                            Confirmar troca
                          </Botao>
                        </>
                      )}
                    </Acao>

                    <Acao c={c} icone={<Users className="w-5 h-5" />} titulo={conta?.heranca_ativa ? 'Herança digital (ativa)' : 'Herança digital'} descricao="Permite que um herdeiro resgate o cofre com um kit (conta + CCH)." aberta={aberta === 'heranca'} onToggle={() => alternar('heranca')}>
                      <CampoSegredo c={c} label="Sua CCP (confirma que é você)" valor={ccp} onChange={setCcp} />
                      {!segredoNovo ? (
                        <div className="flex flex-wrap gap-2">
                          <Botao c={c} variante="secundario" disabled={!ccpOk} onClick={() => setSegredoNovo(gerarSegredo())}>
                            {conta?.heranca_ativa ? 'Gerar nova CCH (troca o kit)' : 'Gerar o kit do herdeiro'}
                          </Botao>
                          {conta?.heranca_ativa && (
                            <Botao c={c} variante="perigo" disabled={!ccpOk || !!ocupado} onClick={() => executar('Desativando a herança...', () => Flows.desativarHeranca(contaId, ccp), 'Herança desativada. O kit antigo não funciona mais.')}>
                              Desativar herança
                            </Botao>
                          )}
                        </div>
                      ) : (
                        <>
                          <RevelarSegredo c={c} segredo={segredoNovo} titulo="Chave do herdeiro (CCH)" aviso={`Entregue ao herdeiro o kit com a CCH e o ID da conta (${contaId}). Ele resgata em /heranca. Vale uma vez.`} nomeArquivo="krypta-kit-herdeiro.txt" conteudoArquivo={kitArquivo('cch', segredoNovo)} onConfirmado={onConfirmado} />
                          <Botao c={c} disabled={!confirmado || !!ocupado} onClick={() => executar('Conferindo o Envelope do Herdeiro e ativando a herança...', () => Flows.ativarHeranca(contaId, ccp, segredoNovo), 'Herança ativada. Entregue o kit ao seu herdeiro.')}>
                            Ativar herança
                          </Botao>
                        </>
                      )}
                    </Acao>
                  </>
                )}

                {/* Kill Switch: funciona SEM o dispositivo (só login do site + CCP) */}
                <Acao c={c} perigo icone={<AlertCircle className="w-5 h-5" />} titulo="Perdi o dispositivo (Kill Switch)" descricao="Revoga o dispositivo para sempre. Depois você vincula um novo." aberta={aberta === 'kill'} onToggle={() => alternar('kill')}>
                  <p className="text-sm rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                    O dispositivo atual será banido permanentemente e deixará de funcionar na hora. Não dá para desfazer.
                  </p>
                  <CampoSegredo c={c} label="Sua CCP" valor={ccp} onChange={setCcp} />
                  <div>
                    <label className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: c.muted }}>
                      Digite REVOGAR para confirmar
                    </label>
                    <input value={textoConfirmacao} onChange={(e) => setTextoConfirmacao(e.target.value)} className="w-40 py-2.5 px-3 rounded-lg text-sm font-mono outline-none" style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.fg }} />
                  </div>
                  <Botao c={c} variante="perigo" disabled={!ccpOk || textoConfirmacao.trim().toUpperCase() !== 'REVOGAR' || !!ocupado} onClick={() => executar('Acionando o Kill Switch...', () => Flows.acionarKillSwitch(contaId, ccp), 'Kill Switch acionado. O dispositivo foi revogado. Agora vincule um novo.')}>
                    Acionar Kill Switch
                  </Botao>
                </Acao>
              </div>
            </Painel>
          </>
        )}

        {/* ============ REVOGADA: NOVO DISPOSITIVO ============ */}
        {!carregando && estado === 'REVOGADA' && (
          <Painel c={c} destaque="rgba(239,68,68,0.5)">
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: ROUNDED_FONT }}>Vincular um dispositivo novo</h2>
            <p className="text-sm mb-4" style={{ color: c.muted }}>
              Um dispositivo virtual novo será criado. A CCP abre o backup cifrado e devolve seu cofre a ele.
            </p>
            <div className="space-y-4 max-w-xl">
              <CampoSegredo c={c} label="Sua CCP" valor={ccp} onChange={setCcp} />
              <Botao c={c} disabled={!ccpOk || !!ocupado} onClick={() => executar('Vinculando o novo dispositivo e restaurando o cofre...', () => Flows.vincularNovoDispositivo(contaId, ccp), 'Novo dispositivo vinculado e cofre restaurado!')}>
                <Cpu className="w-4 h-4" /> Vincular e restaurar
              </Botao>
            </div>
          </Painel>
        )}

        {/* ============ EM RECUPERAÇÃO ============ */}
        {!carregando && (estado === 'RECUPERACAO_LOCAL' || estado === 'RECUPERACAO_HARDWARE') && (
          <Painel c={c} destaque="rgba(245,158,11,0.5)">
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: ROUNDED_FONT }}>Concluir a recuperação</h2>
            {temDispositivoAqui ? (
              <div className="space-y-4 max-w-xl">
                <p className="text-sm" style={{ color: c.muted }}>Informe a CCP para abrir o backup, gravar no dispositivo e concluir.</p>
                <CampoSegredo c={c} label="Sua CCP" valor={ccp} onChange={setCcp} />
                <Botao c={c} disabled={!ccpOk || !!ocupado} onClick={() => executar('Restaurando o cofre e concluindo...', () => Flows.retomarRecuperacao(contaId, ccp), 'Recuperação concluída. Cofre ativo de novo.')}>
                  Concluir recuperação
                </Botao>
              </div>
            ) : (
              <p className="text-sm" style={{ color: c.muted }}>
                A recuperação foi iniciada em outro dispositivo/navegador. Conclua por lá.
              </p>
            )}
          </Painel>
        )}

        <p className="text-[11px] text-center" style={{ color: c.muted }}>
          Dispositivo virtual: só para demonstração e testes. Não guarde senhas reais nele.
          É herdeiro? Acesse <Link to="/heranca" className="underline" style={{ color: c.bright }}>a página de resgate</Link>.
        </p>
      </main>

      <Footer />
    </div>
  );
}
