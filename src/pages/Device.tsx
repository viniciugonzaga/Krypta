// src/pages/Device.tsx
// ============================================================
// MEU KRYPTA — o dispositivo e o cofre da conta.
//
// Mostra o estado do cofre (vindo da API) e as ações possíveis em cada
// estado. Enquanto o app com o ESP32 não existe, um DISPOSITIVO VIRTUAL
// (src/services/virtualDevice.ts) faz o papel do hardware no navegador.
//
//   PENDENTE_PAREAMENTO → parear (software ou um dispositivo COMPRADO) e gerar a CCP
//   ATIVA               → cofre, recuperação, troca da CCP, herança, Kill Switch, alertas
//
// Cada conta tem UM cofre e UM dispositivo pareado por vez. Outros dispositivos
// comprados ficam como reserva (ex.: para vincular depois de um Kill Switch).
// Recursos do Krypta Pro aparecem travados no Free (regras: server/src/config/planos.ts).
//   REVOGADA            → vincular dispositivo novo
//   RECUPERACAO_*       → concluir a recuperação
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Check,
  Crown,
  Package,
  ChevronDown,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SITE_URL } from '../config/desktop';
import { IconeServico } from '../mobile/icones';
import { resumo as resumoCredencial } from '../mobile/credenciais';
import { DevicesAPI, VaultAPI, type ContaCofre, type DispositivoComprado, type EstadoCofre, type EventoCofre } from '../services/api';
import { Trava, VirtualDevice, type EstadoDispositivo, type TipoTrava } from '../services/virtualDevice';
import { configurarAcesso, validarSenhaAcesso } from '../services/cofreRemoto';
import { CriarTrava, DesbloquearCofre } from '../mobile/TravaCofre';
import * as Flows from '../services/vaultFlows';
import { gerarSegredo, normalizarSegredo, segredoValido } from '../crypto/kryptaCrypto';
import { Dica } from '../components/Dica';
import { tiposDeSegredo } from '../utils/plan';
import { AvisoOutroAparelho } from '../mobile/AvisoOutroAparelho';

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
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Solta o arquivo só depois que o download começou (no app desktop ele demora um instante)
    setTimeout(() => URL.revokeObjectURL(url), 2000);
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

// ============================================================
// RECURSO TRAVADO (Krypta Pro)
// ============================================================
function BloqueadoPro({ c, recurso }: { c: Cores; recurso: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(81,0,189,0.18) 0%, rgba(141,81,255,0.08) 100%)', border: `1px solid ${c.bright}` }}>
      <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
        <Crown className="w-5 h-5 text-white" />
      </span>
      <p className="flex-1 text-sm" style={{ color: c.fg }}>
        <strong>{recurso}</strong> faz parte do <strong>Krypta Pro</strong>. Assine para liberar no seu cofre.
      </p>
      <Link to="/services#planos" className="px-4 py-2 rounded-lg text-sm font-bold text-white text-center" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
        Assinar o Pro
      </Link>
    </div>
  );
}

// ============================================================
// ESCOLHA DO DISPOSITIVO (software ou comprado)
// ============================================================
function SeletorDispositivo({
  c,
  podeFisico,
  disponiveis,
  emTransporte,
  serial,
  onChange,
}: {
  c: Cores;
  podeFisico: boolean;
  disponiveis: DispositivoComprado[];
  emTransporte: number;
  serial: string | null;
  onChange: (serial: string | null) => void;
}) {
  const opcao = (ativo: boolean) => ({
    border: `1.5px solid ${ativo ? c.bright : c.border}`,
    background: ativo ? (c.isDark ? 'rgba(141,81,255,0.12)' : 'rgba(81,0,189,0.06)') : 'transparent',
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button type="button" onClick={() => onChange(null)} className="text-left rounded-xl p-4 transition-all" style={opcao(serial === null)}>
        <span className="flex items-center gap-2 font-bold text-sm" style={{ color: c.fg }}>
          <KeyRound className="w-4 h-4" style={{ color: c.bright }} /> Dispositivo de software
        </span>
        <span className="block text-xs mt-1" style={{ color: c.muted }}>
          O cofre fica protegido neste navegador/app. Disponível no Free e no Pro.
        </span>
      </button>

      <div className="rounded-xl p-4" style={opcao(serial !== null)}>
        <span className="flex items-center gap-2 font-bold text-sm" style={{ color: c.fg }}>
          <Cpu className="w-4 h-4" style={{ color: c.bright }} /> Dispositivo Krypta físico
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, #5100BD, #8d51ff)' }}>PRO</span>
        </span>
        {!podeFisico ? (
          <span className="block text-xs mt-1" style={{ color: c.muted }}>
            Chave física de segurança. <Link to="/services#planos" className="underline" style={{ color: c.bright }}>Assine o Pro</Link> para usar.
          </span>
        ) : disponiveis.length === 0 ? (
          <span className="block text-xs mt-1" style={{ color: c.muted }}>
            {emTransporte > 0 ? (
              <>Você tem {emTransporte} em transporte. <Link to="/compras" className="underline" style={{ color: c.bright }}>Confirme o recebimento</Link>.</>
            ) : (
              <>Nenhum dispositivo comprado. <Link to="/products" className="underline" style={{ color: c.bright }}>Comprar</Link>.</>
            )}
          </span>
        ) : (
          <div className="mt-2 space-y-1.5">
            {disponiveis.map((d) => (
              <label key={d.serial} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: c.fg }}>
                <input type="radio" name="serial" checked={serial === d.serial} onChange={() => onChange(d.serial)} className="accent-purple-600" />
                <span className="font-mono">{d.serial}</span>
                {d.conectado && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#22c55e' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> ligado
                  </span>
                )}
              </label>
            ))}
            <p className="text-[10.5px]" style={{ color: c.muted }}>
              Ligue o ESP32 com este número de série para usar o hardware real. Sem ele, o dispositivo virtual faz o papel do ESP32.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * embutido = dentro do modo Mobile (sem a Navbar/rodapé do site).
 * #heranca, #recuperar, #ccp ou #kill no endereço já abrem a ação certa.
 */
export function Device({ embutido = false }: { embutido?: boolean } = {}) {
  const { user, refreshUser } = useAuth();
  const c = useCores();
  const contaId = user?.id ?? '';

  const [conta, setConta] = useState<ContaCofre | null>(null);
  const [dispositivo, setDispositivo] = useState<EstadoDispositivo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [aberta, setAberta] = useState<string | null>(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return (['heranca', 'recuperar', 'ccp', 'kill', 'login'].includes(h) ? h : null) as string | null;
  });

  // campos
  const [ccp, setCcp] = useState('');
  const [segredoNovo, setSegredoNovo] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [mostrarSenhas, setMostrarSenhas] = useState(false);

  // dispositivos comprados, alertas e escolha do dispositivo
  const [searchParams] = useSearchParams();
  const [compras, setCompras] = useState<DispositivoComprado[]>([]);
  const [serialEscolhido, setSerialEscolhido] = useState<string | null>(() => searchParams.get('serial'));
  const [atividade, setAtividade] = useState<EventoCofre[] | null>(null);
  const [idCopiado, setIdCopiado] = useState(false);
  const [usarReal, setUsarHardwareReal] = useState(true);
  // v1.3.0: PIN do cofre criado já no pareamento
  const [tipoPin, setTipoPin] = useState<TipoTrava>('PIN');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinRemoto, setPinRemoto] = useState(true);

  // A trava abriu, fechou ou mudou → relê o dispositivo deste aparelho
  useEffect(() => {
    if (!contaId) return;
    return Trava.assinar(() => setDispositivo(VirtualDevice.carregar(contaId)));
  }, [contaId]);

  const recarregar = useCallback(async () => {
    if (!contaId) return;
    try {
      const [contaApi, lista] = await Promise.all([VaultAPI.account(), DevicesAPI.list().catch(() => [] as DispositivoComprado[])]);
      setConta(contaApi);
      setCompras(lista);
      let local = VirtualDevice.carregar(contaId);
      // v1.2.0: puxa o que outro aparelho editou com a senha de acesso (ou uma restauração)
      if (local && !local.bloqueado && contaApi.status === 'ATIVA' && local.publicKey === contaApi.public_key && local.chaveCofre) {
        local = (await Flows.sincronizarDispositivo(contaId).catch(() => null))?.dispositivo ?? local;
      }
      setDispositivo(local);
      setAtividade(contaApi.recursos?.alertasAcesso ? await VaultAPI.activity().catch(() => null) : null);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setCarregando(false);
    }
  }, [contaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Esperando o ESP32 ligar? Confere os dispositivos a cada 5 s (só na tela de pareamento)
  const esperandoHardware =
    (conta?.status === 'PENDENTE_PAREAMENTO' || conta?.status === 'REVOGADA') &&
    !!conta?.recursos?.dispositivoFisico &&
    compras.some((d) => d.status === 'DISPONIVEL' && !d.conectado);
  useEffect(() => {
    if (!esperandoHardware) return;
    const t = setInterval(() => {
      DevicesAPI.list().then(setCompras).catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [esperandoHardware]);

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
  // v1.3.0: mesmo no aparelho que pareou, o cofre só abre com o PIN ou a biometria
  const travado = temDispositivoAqui && !!dispositivo?.bloqueado;
  const semTrava = temDispositivoAqui && !!dispositivo && !dispositivo.protegido && !!dispositivo.chaveCofre;
  const usavel = temDispositivoAqui && !travado && !semTrava;
  const recursos = conta?.recursos;
  const isPro = conta?.plano === 'pro';
  // v1.5.0: no Free o cofre usa senha (PIN de 6 dígitos é do Pro)
  useEffect(() => {
    if (conta && !isPro && tipoPin === 'PIN') setTipoPin('SENHA');
  }, [conta, isPro, tipoPin]);
  const disponiveis = compras.filter((d) => d.status === 'DISPONIVEL');
  const emTransporte = compras.filter((d) => d.status === 'EM_TRANSPORTE').length;
  const serialValido = serialEscolhido && disponiveis.some((d) => d.serial === serialEscolhido) ? serialEscolhido : null;
  const hardwareSelecionado = serialValido ? disponiveis.find((d) => d.serial === serialValido) ?? null : null;
  const usarHardwareReal = usarReal && !!hardwareSelecionado?.conectado;
  // O cofre desta conta está no ESP32 real?
  const hardwareDaConta = compras.find((d) => d.emUsoNoCofre && d.hardwareReal) ?? null;

  // Uso estimado do backup cifrado (o servidor confere o tamanho real)
  const usoBytes = dispositivo ? Math.round(JSON.stringify(dispositivo.credenciais).length * 1.6 + 900) : 0;
  const limiteBytes = recursos?.armazenamentoBytes ?? 64 * 1024;
  const usoPct = Math.min(100, Math.round((usoBytes / limiteBytes) * 100));

  const copiarId = async () => {
    try {
      await navigator.clipboard.writeText(contaId);
      setIdCopiado(true);
      setTimeout(() => setIdCopiado(false), 1500);
    } catch {
      /* sem permissão */
    }
  };

  // Link pronto para o herdeiro. No app desktop usa o endereço público do site (VITE_SITE_URL);
  // sem ele, o kit traz só o código (ID da conta + CCH) para colar na página de resgate.
  const linkKit = (cch: string) => (SITE_URL ? `${SITE_URL}/heranca#kit=${encodeURIComponent(`${contaId}:${cch}`)}` : null);
  const ccpOk = segredoValido(ccp);
  const erroPin = validarSenhaAcesso(tipoPin, pin);
  const pinOk = !erroPin && pin === pin2;

  const kitArquivo = (tipo: 'ccp' | 'cch', segredo: string) =>
    tipo === 'ccp'
      ? `KRYPTA — CHAVE DE CONTINGÊNCIA\n\nConta: ${user?.email}\nChave: ${segredo}\n\nGuarde em papel, em lugar seguro. Ela recupera o cofre e aciona o Kill Switch.\nO Krypta NÃO consegue recuperá-la para você.\n`
      : `KRYPTA — CÓDIGO DE HERANÇA\n\nTitular: ${user?.name}\nID da conta: ${contaId}\nChave do herdeiro: ${segredo}\n\nCOMO RESGATAR\n${linkKit(segredo) ? `1. Abra este link (ele já preenche tudo):\n   ${linkKit(segredo)}\n2. Ou acesse` : `1. Acesse`} o site Krypta → "Como funciona" → "Recebi um código de herança"\n   e cole o ID da conta e a chave do herdeiro.\n\nA chave do herdeiro vale UMA vez. Guarde este código de herança em lugar seguro.\n`;

  // ------------------------------------------------------------
  // Cofre (credenciais de demonstração)
  // ------------------------------------------------------------
  // v1.2.0: criar/editar usa o MESMO editor do app (tipos, campos e ícones): /cofre/nova-chave
  const removerCredencial = (id: string) => {
    if (!dispositivo) return;
    executar(
      'Sincronizando...',
      () => Flows.salvarCofre(contaId, (lista) => lista.filter((x) => x.id !== id)),
      'Credencial removida e cofre sincronizado.'
    );
  };

  if (!user) return null;

  return (
    <div className={`${embutido ? '' : 'min-h-screen'} flex flex-col relative overflow-hidden`} style={{ backgroundColor: embutido ? 'transparent' : 'rgb(var(--krypta-bg))', color: 'rgb(var(--krypta-fg))' }}>
      {!embutido && <Navbar />}

      {/* Fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <div className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full blur-[180px]" style={{ background: `${c.purple}40` }} />
        <div className="absolute bottom-[-18%] right-[-10%] w-[600px] h-[500px] rounded-full blur-[200px]" style={{ background: `${c.purple}2e` }} />
      </div>

      <main className={`relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 ${embutido ? 'pt-2 pb-6' : 'pt-32 pb-16'} space-y-6`}>
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
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs justify-center md:justify-start">
                  {estado !== 'PENDENTE_PAREAMENTO' && (
                  <>
                  <span style={{ color: c.muted }}>ID da conta:</span>
                  <code className="font-mono px-2 py-0.5 rounded" style={{ background: c.fieldBg, border: `1px solid ${c.border}` }}>{contaId}</code>
                  <button type="button" onClick={copiarId} className="inline-flex items-center gap-1 font-semibold" style={{ color: c.bright }}>
                    {idCopiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {idCopiado ? 'Copiado' : 'Copiar'}
                  </button>
                  </>
                  )}
                  <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: isPro ? 'linear-gradient(135deg, #5100BD, #8d51ff)' : 'transparent', color: isPro ? '#fff' : c.muted, border: isPro ? 'none' : `1px solid ${c.border}` }}>
                    {isPro ? 'Krypta Pro' : 'Krypta Free'}
                  </span>
                </div>
                {estado !== 'PENDENTE_PAREAMENTO' && (
                <dl className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3 text-xs">
                  <div><dt style={{ color: c.muted }}>Origem</dt><dd className="font-semibold">{conta?.tipo_dispositivo === 'FISICO' ? 'Dispositivo comprado' : conta?.tipo_dispositivo === 'SOFTWARE' ? 'Software' : '—'}</dd></div>
                  <div><dt style={{ color: c.muted }}>Dispositivo</dt><dd className="font-mono font-semibold">{conta?.hardware_uuid ?? '—'}</dd></div>
                  <div><dt style={{ color: c.muted }}>Última atividade</dt><dd className="font-semibold">{conta?.ultimo_sincronismo ? new Date(conta.ultimo_sincronismo).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</dd></div>
                  <div><dt style={{ color: c.muted }}>Backup</dt><dd className="font-semibold">{dispositivo?.versionCounter ? `versão ${dispositivo.versionCounter}` : '—'}</dd></div>
                </dl>
                )}
              </div>
              <Botao c={c} variante="secundario" onClick={() => recarregar()} disabled={!!ocupado}>
                <RefreshCw className="w-4 h-4" /> Atualizar
              </Botao>
            </div>
          )}
        </Painel>

        {/* ============ DICA DA TELA (v1.3.0) ============ */}
        {!carregando && estado === 'PENDENTE_PAREAMENTO' && (
          <Dica id="device-parear" titulo="Três passos e seu cofre está pronto" pergunta="O que é parear?" className="mb-6">
            1) escolha o dispositivo (pode ser este aparelho), 2) anote a <strong>chave de contingência</strong> em papel e 3) crie o <strong>PIN do cofre</strong>. Depois é só guardar suas senhas.
          </Dica>
        )}
        {!carregando && estado === 'ATIVA' && temDispositivoAqui && !travado && !semTrava && (
          <Dica id="device-ativo" titulo="Seu cofre está protegido" pergunta="O que é ponto de restauração?" acao={{ rotulo: 'Senha do cofre', para: '/cofre/acesso' }} className="mb-6">
            Salve um <strong>ponto de restauração</strong> antes de grandes mudanças. O cofre tranca sozinho depois de 5 minutos.{isPro ? ' No celular, dá para abrir com a digital.' : ''}
          </Dica>
        )}
        {!carregando && estado === 'ATIVA' && !temDispositivoAqui && (
          <Dica id="device-outro" titulo="Seu cofre está em outro aparelho" pergunta="Como abro o cofre em outro aparelho?" className="mb-6">
            Com a <strong>senha de acesso</strong> você vê e edita o cofre aqui também (todos os planos).{isPro ? ' No Pro, também com o PIN de 6 dígitos.' : ' PIN de 6 dígitos e biometria são do Pro.'}
          </Dica>
        )}

        {/* ============ PENDENTE: PAREAR ============ */}
        {!carregando && estado === 'PENDENTE_PAREAMENTO' && (
          <Painel c={c}>
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: ROUNDED_FONT }}>Parear dispositivo</h2>
            <p className="text-sm mb-4" style={{ color: c.muted }}>
              Enquanto o app do ESP32 não está pronto, um <strong>dispositivo virtual</strong> faz o papel do hardware neste navegador.
              O fluxo é o mesmo: a chave privada é gerada no dispositivo e o servidor recebe só a chave pública e a prova da sua chave de contingência.
            </p>
            <p className="text-xs font-bold tracking-[0.15em] uppercase mb-2" style={{ color: c.bright }}>1. Escolha o dispositivo</p>
            <div className="mb-5">
              <SeletorDispositivo c={c} podeFisico={!!recursos?.dispositivoFisico} disponiveis={disponiveis} emTransporte={emTransporte} serial={serialValido} onChange={setSerialEscolhido} />
            </div>
            {hardwareSelecionado?.conectado && hardwareSelecionado.codigoConfirmacao && (
              <div className="mb-5 rounded-xl p-4" style={{ border: `1.5px solid ${usarHardwareReal ? '#22c55e' : c.border}`, background: usarHardwareReal ? 'rgba(34,197,94,0.07)' : 'transparent' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={usarHardwareReal} onChange={(e) => setUsarHardwareReal(e.target.checked)} className="mt-1 accent-green-600" />
                  <span className="text-sm">
                    <strong>Usar o hardware real ({hardwareSelecionado.serial})</strong>
                    <span className="block text-xs mt-0.5" style={{ color: c.muted }}>
                      Confira se a tela do dispositivo mostra este código. Se for diferente, não pareie.
                    </span>
                    <span className="inline-block mt-2 px-3 py-1 rounded-lg font-mono text-xl tracking-[0.2em] font-bold" style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.bright }}>
                      {hardwareSelecionado.codigoConfirmacao}
                    </span>
                    <span className="block text-[11px] mt-2" style={{ color: c.muted }}>
                      A chave privada fica no ESP32 e ele passa a fazer o login do cofre. Seu cofre começa vazio e já pode ser recuperado com a chave de contingência.
                    </span>
                  </span>
                </label>
              </div>
            )}
            <p className="text-xs font-bold tracking-[0.15em] uppercase mb-2" style={{ color: c.bright }}>2. Gere sua chave de contingência</p>
            {!segredoNovo ? (
              <Botao c={c} onClick={() => setSegredoNovo(gerarSegredo())}>
                <KeyRound className="w-4 h-4" /> Gerar minha chave de contingência
              </Botao>
            ) : (
              <div className="space-y-4">
                <RevelarSegredo
                  c={c}
                  segredo={segredoNovo}
                  titulo="Sua chave de contingência"
                  aviso="Ela aparece UMA vez. Serve para recuperar o cofre e acionar o Kill Switch se perder o dispositivo. Ninguém (nem o Krypta) consegue recuperá-la."
                  nomeArquivo="krypta-chave-de-contingencia.txt"
                  conteudoArquivo={kitArquivo('ccp', segredoNovo)}
                  onConfirmado={onConfirmado}
                />
                {confirmado && (
                  <div className="rounded-xl p-4 space-y-3" style={{ border: `1px solid ${c.border}`, background: c.isDark ? 'rgba(141,81,255,0.05)' : 'rgba(81,0,189,0.03)' }}>
                    <p className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: c.bright }}>3. Crie {isPro ? 'o PIN' : 'a senha'} do cofre</p>
                    <p className="text-xs" style={{ color: c.muted }}>
                      O cofre só abre com {isPro ? 'ele' : 'ela'}, <strong>mesmo neste aparelho</strong>, e {isPro ? 'o mesmo PIN' : 'a mesma senha'} pode abrir o cofre nos seus outros aparelhos. Não use a senha da conta.
                      {!isPro && <> PIN de 6 dígitos e biometria são do <Link to="/plans" className="underline font-semibold">Krypta Pro</Link>.</>}
                    </p>
                    <div className="flex gap-2">
                      {tiposDeSegredo(conta?.plano).length > 1 && (['PIN', 'SENHA'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => { setTipoPin(t); setPin(''); setPin2(''); }} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={tipoPin === t ? { background: 'linear-gradient(135deg, #5100BD, #8d51ff)', color: '#fff' } : { border: `1px solid ${c.border}`, color: c.muted }}>
                          {t === 'PIN' ? 'PIN (6 números)' : 'Senha (mais forte)'}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="password" inputMode={tipoPin === 'PIN' ? 'numeric' : 'text'} maxLength={tipoPin === 'PIN' ? 6 : 128} value={pin} onChange={(e) => setPin(tipoPin === 'PIN' ? e.target.value.replace(/\D/g, '') : e.target.value)} placeholder={tipoPin === 'PIN' ? 'PIN de 6 números' : 'Senha (8+ caracteres)'} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.fg }} />
                      <input type="password" inputMode={tipoPin === 'PIN' ? 'numeric' : 'text'} maxLength={tipoPin === 'PIN' ? 6 : 128} value={pin2} onChange={(e) => setPin2(tipoPin === 'PIN' ? e.target.value.replace(/\D/g, '') : e.target.value)} placeholder="Repita" className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.fg }} />
                    </div>
                    {pin && erroPin && <p className="text-xs text-red-400">{erroPin}</p>}
                    {pin && !erroPin && pin2 && pin !== pin2 && <p className="text-xs text-red-400">Os dois não são iguais.</p>}
                    <label className="flex items-start gap-2 text-xs">
                      <input type="checkbox" checked={pinRemoto} onChange={(e) => setPinRemoto(e.target.checked)} className="mt-0.5 accent-purple-600" />
                      Usar {tipoPin === 'PIN' ? 'o mesmo PIN' : 'a mesma senha'} para abrir o cofre nos meus outros aparelhos
                    </label>
                  </div>
                )}
                <Botao
                  c={c}
                  disabled={!confirmado || !pinOk || !!ocupado}
                  onClick={() =>
                    executar(
                      'Pareando, enviando o primeiro backup e cifrando o cofre com o seu PIN...',
                      async () => {
                        if (usarHardwareReal && hardwareSelecionado?.chaveAnunciada) {
                          await Flows.parearHardwareReal(contaId, segredoNovo, hardwareSelecionado.serial, hardwareSelecionado.chaveAnunciada);
                        } else {
                          await Flows.parearDispositivo(contaId, segredoNovo, serialValido); // cofre novo começa vazio
                        }
                        // v1.3.0: tranca o cofre neste aparelho e (Pro) cria a senha para os outros aparelhos
                        await Trava.criar(contaId, { tipo: tipoPin, segredo: pin, ccp: segredoNovo });
                        if (pinRemoto) await configurarAcesso(contaId, segredoNovo, tipoPin, pin).catch(() => undefined);
                        setPin('');
                        setPin2('');
                      },
                      usarHardwareReal
                        ? `Hardware ${serialValido} pareado! Toque o cartão no dispositivo para entrar.`
                        : serialValido
                          ? `Dispositivo ${serialValido} pareado! Seu cofre está ativo.`
                          : 'Dispositivo de software pareado! Seu cofre está ativo.'
                    )
                  }
                >
                  <Cpu className="w-4 h-4" /> {serialValido ? `Parear ${serialValido}` : 'Parear dispositivo de software'}
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
                  {temDispositivoAqui && (
                    <div className="mt-2 max-w-xs">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, usoPct)}%`, background: usoPct > 85 ? '#f59e0b' : 'linear-gradient(90deg, #5100BD, #8d51ff)' }} />
                      </div>
                      <p className="text-[10.5px] mt-1" style={{ color: c.muted }}>
                        ~{(usoBytes / 1024).toFixed(1)} KB de {Math.round(limiteBytes / 1024)} KB ({isPro ? 'Pro' : 'Free'})
                        {!isPro && <> · <Link to="/services#planos" className="underline" style={{ color: c.bright }}>Pro: até 1 MB</Link></>}
                      </p>
                    </div>
                  )}
                </div>
                {usavel && (
                  <button type="button" onClick={() => setMostrarSenhas((v) => !v)} className="text-xs flex items-center gap-1" style={{ color: c.bright }}>
                    {mostrarSenhas ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {mostrarSenhas ? 'Ocultar' : 'Mostrar'}
                  </button>
                )}
              </div>

              {!temDispositivoAqui ? (
                hardwareDaConta ? (
                  <div className="text-sm rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)' }}>
                    <p className="font-semibold flex items-center gap-2"><Cpu className="w-4 h-4" style={{ color: '#22c55e' }} /> Cofre no hardware real ({hardwareDaConta.serial})</p>
                    <p className="text-xs mt-1" style={{ color: c.muted }}>
                      A chave fica no ESP32: ele faz o login do cofre quando você aproxima o cartão.
                      {hardwareDaConta.ultimoContato && <> Último contato: {new Date(hardwareDaConta.ultimoContato).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</>}
                      {' '}Guardar senhas direto pelo hardware chega na próxima etapa do firmware. As ações de emergência abaixo continuam disponíveis.
                    </p>
                  </div>
                ) : (
<AvisoOutroAparelho />
                )
              ) : travado ? (
                <DesbloquearCofre contaId={contaId} />
              ) : semTrava ? (
                <CriarTrava contaId={contaId} isPro={isPro} onPronto={() => setDispositivo(VirtualDevice.carregar(contaId))} />
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {dispositivo!.credenciais.length === 0 && (
                      <p className="text-sm" style={{ color: c.muted }}>Nenhuma credencial ainda. Adicione a primeira abaixo.</p>
                    )}
                    {dispositivo!.credenciais.map((cr) => (
                      <motion.div key={cr.id} layout className="flex items-center gap-3 rounded-lg p-3" style={{ background: c.isDark ? 'rgba(141,81,255,0.06)' : 'rgba(81,0,189,0.04)', border: `1px solid ${c.border}` }}>
                        <IconeServico nome={cr.servico} icone={cr.icone} tipo={cr.tipo} tamanho={32} />
                        <Link to={`/cofre/nova-chave?id=${encodeURIComponent(cr.id)}`} className="flex-1 min-w-0" title="Editar">
                          <p className="text-sm font-semibold truncate">{cr.servico}</p>
                          <p className="text-xs truncate" style={{ color: c.muted }}>{resumoCredencial(cr)}</p>
                        </Link>
                        <span className="font-mono text-xs hidden sm:block" style={{ color: c.muted }}>
                          {mostrarSenhas ? cr.senha : '••••••••••'}
                        </span>
                        <button type="button" onClick={() => removerCredencial(cr.id)} disabled={!!ocupado} className="p-1.5 rounded hover:bg-red-500/10" aria-label="Remover">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Link to="/cofre/nova-chave" className="py-2.5 px-4 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                      <Plus className="w-4 h-4" /> Nova chave
                    </Link>
                    <Link to="/cofre/chaves" className="py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" style={{ border: `1px solid ${c.border}`, color: c.bright }}>
                      <KeyRound className="w-4 h-4" /> Ver e editar todas
                    </Link>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: c.muted }}>
                    Login, Wi-Fi e nota no Free · cartão, endereço, documento e campos extras no Pro.
                  </p>
                </>
              )}
            </Painel>

            {/* v1.2.0: outros aparelhos e pontos de restauração */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/cofre/acesso" className="rounded-xl p-4 flex items-start gap-3" style={{ background: c.isDark ? 'rgba(141,81,255,0.06)' : 'rgba(81,0,189,0.04)', border: `1px solid ${c.border}` }}>
                <Smartphone className="w-5 h-5 mt-0.5 shrink-0" style={{ color: c.bright }} />
                <span>
                  <span className="block text-sm font-semibold">Senha de acesso ao cofre {!recursos?.acessoRemoto && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(141,81,255,0.15)', color: c.bright }}>Pro</span>}</span>
                  <span className="block text-xs" style={{ color: c.muted }}>Abra e edite o cofre em qualquer aparelho com a senha{isPro ? " ou o PIN" : ""}.</span>
                </span>
              </Link>
              <Link to="/cofre/pontos" className="rounded-xl p-4 flex items-start gap-3" style={{ background: c.isDark ? 'rgba(141,81,255,0.06)' : 'rgba(81,0,189,0.04)', border: `1px solid ${c.border}` }}>
                <History className="w-5 h-5 mt-0.5 shrink-0" style={{ color: c.bright }} />
                <span>
                  <span className="block text-sm font-semibold">Pontos de restauração</span>
                  <span className="block text-xs" style={{ color: c.muted }}>Salve o estado do cofre e volte a ele com a chave de contingência.</span>
                </span>
              </Link>
            </div>

            {/* Ações */}
            <Painel c={c}>
              <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: ROUNDED_FONT }}>Segurança e contingência</h2>
              <div className="space-y-3">
                {usavel && (
                  <>
                    <Acao c={c} icone={<ShieldCheck className="w-5 h-5" />} titulo="Testar login do dispositivo" descricao="Assina um desafio com a chave do dispositivo (challenge-response)." aberta={aberta === 'login'} onToggle={() => alternar('login')}>
                      <Botao c={c} disabled={!!ocupado} onClick={() => executar('Assinando o desafio...', () => Flows.testarLogin(contaId), 'Login pelo dispositivo OK: assinatura Ed25519 aceita pelo servidor.')}>
                        <ShieldCheck className="w-4 h-4" /> Fazer login pelo dispositivo
                      </Botao>
                    </Acao>

                    <Acao c={c} icone={<KeyRound className="w-5 h-5" />} titulo="Esqueci a senha mestre" descricao="Recupera o cofre com a chave de contingência, com o dispositivo em mãos." aberta={aberta === 'recuperar'} onToggle={() => alternar('recuperar')}>
                      <CampoSegredo c={c} label="Sua chave de contingência" valor={ccp} onChange={setCcp} />
                      <Botao c={c} disabled={!ccpOk || !!ocupado} onClick={() => executar('Conferindo a chave de contingência, baixando e abrindo o backup...', () => Flows.recuperacaoLocal(contaId, ccp), 'Cofre recuperado com a chave de contingência e recuperação concluída.')}>
                        Recuperar cofre
                      </Botao>
                    </Acao>

                    <Acao c={c} icone={<RefreshCw className="w-5 h-5" />} titulo="Trocar a chave de contingência" descricao="Gera uma chave de contingência nova. A antiga deixa de valer." aberta={aberta === 'ccp'} onToggle={() => alternar('ccp')}>
                      <CampoSegredo c={c} label="Chave de contingência atual" valor={ccp} onChange={setCcp} />
                      {!segredoNovo ? (
                        <Botao c={c} variante="secundario" disabled={!ccpOk} onClick={() => setSegredoNovo(gerarSegredo())}>
                          Gerar a nova chave de contingência
                        </Botao>
                      ) : (
                        <>
                          <RevelarSegredo c={c} segredo={segredoNovo} titulo="Sua NOVA chave de contingência" aviso="Anote a nova chave de contingência. A antiga só deixa de valer depois que o servidor confirmar a troca." nomeArquivo="krypta-chave-de-contingencia-nova.txt" conteudoArquivo={kitArquivo('ccp', segredoNovo)} onConfirmado={onConfirmado} />
                          <Botao c={c} disabled={!confirmado || !!ocupado} onClick={() => executar('Conferindo o novo envelope e trocando a chave de contingência...', () => Flows.trocarCcp(contaId, ccp, segredoNovo), 'Chave de contingência trocada. A anterior não vale mais.')}>
                            Confirmar troca
                          </Botao>
                        </>
                      )}
                    </Acao>

                    <Acao c={c} icone={<Users className="w-5 h-5" />} titulo={conta?.heranca_ativa ? 'Herança digital (ativa)' : 'Herança digital'} descricao="Permite que um herdeiro resgate o cofre com um código de herança (conta + chave do herdeiro)." aberta={aberta === 'heranca'} onToggle={() => alternar('heranca')}>
                      {!recursos?.heranca && !conta?.heranca_ativa ? (
                        <BloqueadoPro c={c} recurso="A herança digital" />
                      ) : (
                        <>
                      <CampoSegredo c={c} label="Sua chave de contingência (confirma que é você)" valor={ccp} onChange={setCcp} />
                      {!recursos?.heranca && conta?.heranca_ativa && (
                        <p className="text-xs rounded-lg p-2.5" style={{ border: `1px solid ${c.border}`, color: c.muted }}>
                          Seu plano voltou ao Free: o código de herança já entregue continua valendo e você pode desativá-lo. Para trocar a chave do herdeiro,{' '}
                          <Link to="/services#planos" className="underline" style={{ color: c.bright }}>assine o Pro</Link>.
                        </p>
                      )}
                      {!segredoNovo ? (
                        <div className="flex flex-wrap gap-2">
                          {recursos?.heranca && (
                            <Botao c={c} variante="secundario" disabled={!ccpOk} onClick={() => setSegredoNovo(gerarSegredo())}>
                              {conta?.heranca_ativa ? 'Gerar nova chave do herdeiro (troca o código de herança)' : 'Gerar o código de herança'}
                            </Botao>
                          )}
                          {conta?.heranca_ativa && (
                            <Botao c={c} variante="perigo" disabled={!ccpOk || !!ocupado} onClick={() => executar('Desativando a herança...', () => Flows.desativarHeranca(contaId, ccp), 'Herança desativada. O código de herança antigo não funciona mais.')}>
                              Desativar herança
                            </Botao>
                          )}
                        </div>
                      ) : (
                        <>
                          <RevelarSegredo c={c} segredo={segredoNovo} titulo="Chave do herdeiro" aviso={`Entregue ao herdeiro o código de herança com a chave do herdeiro e o ID da conta (${contaId}). Ele resgata em /heranca. Vale uma vez.`} nomeArquivo="krypta-código de herança-herdeiro.txt" conteudoArquivo={kitArquivo('cch', segredoNovo)} onConfirmado={onConfirmado} />
                          <Botao c={c} disabled={!confirmado || !!ocupado} onClick={() => executar('Conferindo o Envelope do Herdeiro e ativando a herança...', () => Flows.ativarHeranca(contaId, ccp, segredoNovo), 'Herança ativada. Entregue o código de herança ao seu herdeiro.')}>
                            Ativar herança
                          </Botao>
                        </>
                      )}
                        </>
                      )}
                    </Acao>
                  </>
                )}

                {/* Kill Switch: funciona SEM o dispositivo (só login do site + chave de contingência) */}
                <Acao c={c} perigo icone={<AlertCircle className="w-5 h-5" />} titulo="Perdi o dispositivo (Kill Switch)" descricao="Revoga o dispositivo para sempre. Depois você vincula um novo." aberta={aberta === 'kill'} onToggle={() => alternar('kill')}>
                  {!recursos?.killSwitch ? (
                    <BloqueadoPro c={c} recurso="O Kill Switch (bloqueio remoto)" />
                  ) : (
                    <>
                  <p className="text-sm rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                    O dispositivo atual será banido permanentemente e deixará de funcionar na hora. Não dá para desfazer.
                  </p>
                  <CampoSegredo c={c} label="Sua chave de contingência" valor={ccp} onChange={setCcp} />
                  <div>
                    <label className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: c.muted }}>
                      Digite REVOGAR para confirmar
                    </label>
                    <input value={textoConfirmacao} onChange={(e) => setTextoConfirmacao(e.target.value)} className="w-40 py-2.5 px-3 rounded-lg text-sm font-mono outline-none" style={{ background: c.fieldBg, border: `1px solid ${c.border}`, color: c.fg }} />
                  </div>
                  <Botao c={c} variante="perigo" disabled={!ccpOk || textoConfirmacao.trim().toUpperCase() !== 'REVOGAR' || !!ocupado} onClick={() => executar('Acionando o Kill Switch...', () => Flows.acionarKillSwitch(contaId, ccp), 'Kill Switch acionado. O dispositivo foi revogado. Agora vincule um novo.')}>
                    Acionar Kill Switch
                  </Botao>
                    </>
                  )}
                </Acao>
              </div>
            </Painel>
          </>
        )}

        {/* ============ ALERTAS DE ACESSO (Pro) ============ */}
        {!carregando && estado !== 'PENDENTE_PAREAMENTO' && (
          <Painel c={c}>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
              <Activity className="w-5 h-5" style={{ color: c.bright }} /> Alertas de acesso
            </h2>
            <p className="text-xs mb-4" style={{ color: c.muted }}>Logins do dispositivo, tentativas com assinatura inválida e ações de segurança do cofre.</p>
            {!recursos?.alertasAcesso ? (
              <BloqueadoPro c={c} recurso="Os alertas de acesso" />
            ) : !atividade || atividade.length === 0 ? (
              <p className="text-sm" style={{ color: c.muted }}>Nenhum evento ainda.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {atividade.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3 text-sm rounded-lg p-2.5" style={{ border: `1px solid ${ev.status === 'warning' ? 'rgba(245,158,11,0.4)' : c.border}` }}>
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: ev.status === 'warning' ? '#f59e0b' : ev.status === 'error' ? '#f87171' : '#22c55e' }} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium">{ev.detalhe ?? ev.acao}</span>
                      <span className="block text-[11px]" style={{ color: c.muted }}>
                        {new Date(ev.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{ev.ip ? ` · IP ${ev.ip}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        )}

        {/* ============ REVOGADA: NOVO DISPOSITIVO ============ */}
        {!carregando && estado === 'REVOGADA' && (
          <Painel c={c} destaque="rgba(239,68,68,0.5)">
            <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: ROUNDED_FONT }}>Vincular um dispositivo novo</h2>
            <p className="text-sm mb-4" style={{ color: c.muted }}>
              Um dispositivo virtual novo será criado. A chave de contingência abre o backup cifrado e devolve seu cofre a ele.
            </p>
            <div className="mb-4">
              <SeletorDispositivo c={c} podeFisico={!!recursos?.dispositivoFisico} disponiveis={disponiveis} emTransporte={emTransporte} serial={serialValido} onChange={setSerialEscolhido} />
            </div>
            <div className="space-y-4 max-w-xl">
              <CampoSegredo c={c} label="Sua chave de contingência" valor={ccp} onChange={setCcp} />
              <Botao c={c} disabled={!ccpOk || !!ocupado} onClick={() => executar('Vinculando o novo dispositivo e restaurando o cofre...', () => Flows.vincularNovoDispositivo(contaId, ccp, serialValido), 'Novo dispositivo vinculado e cofre restaurado!')}>
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
                <p className="text-sm" style={{ color: c.muted }}>Informe a chave de contingência para abrir o backup, gravar no dispositivo e concluir.</p>
                <CampoSegredo c={c} label="Sua chave de contingência" valor={ccp} onChange={setCcp} />
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
          <Link to="/compras" className="underline inline-flex items-center gap-1" style={{ color: c.bright }}><Package className="w-3 h-3" /> Minhas compras</Link>
          {' · '}
          <Link to="/como-funciona" className="underline" style={{ color: c.bright }}>Como funciona o cofre</Link>
          {' · '}
          <Link to="/perdi-ccp" className="underline" style={{ color: c.bright }}>Perdi minha chave de contingência</Link>
        </p>
      </main>

      {!embutido && <Footer />}
    </div>
  );
}
