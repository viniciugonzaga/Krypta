// src/pages/Orders.tsx
// ============================================================
// MINHAS COMPRAS (/compras)
//
// Lista os pedidos gravados no servidor (planos e dispositivos) e as
// unidades físicas compradas, com o ciclo de vida de cada uma:
//
//   EM_TRANSPORTE → (Recebi) → DISPONIVEL → (Parear) → PAREADO → REVOGADO
//
// É daqui que vem o dispositivo que o usuário liga no cofre (Meu Krypta).
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Copy, Cpu, Crown, Loader2, Package, ShoppingCart, Truck } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { DevicesAPI, OrdersAPI, type DispositivoComprado, type Pedido, type StatusDispositivo } from '../services/api';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";

const STATUS: Record<StatusDispositivo, { rotulo: string; cor: string; dica: string }> = {
  EM_TRANSPORTE: { rotulo: 'Em transporte', cor: '#f59e0b', dica: 'Quando chegar, confirme o recebimento.' },
  DISPONIVEL: { rotulo: 'Pronto para parear', cor: '#22c55e', dica: 'Pareie no Meu Krypta para proteger o cofre.' },
  PAREADO: { rotulo: 'Em uso no cofre', cor: '#8d51ff', dica: 'Este é o dispositivo que protege seu cofre.' },
  REVOGADO: { rotulo: 'Revogado', cor: '#f87171', dica: 'Banido pelo Kill Switch ou pela herança. Não pode voltar.' },
};

const PASSOS: Array<{ status: StatusDispositivo; titulo: string }> = [
  { status: 'EM_TRANSPORTE', titulo: 'Comprado' },
  { status: 'DISPONIVEL', titulo: 'Recebido' },
  { status: 'PAREADO', titulo: 'Pareado' },
];

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (s: string | null) => (s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export function Orders() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoComprado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // O número de série vai no firmware do ESP32 (comando "serial ...")
  const copiarSerial = async (serial: string) => {
    try {
      await navigator.clipboard.writeText(serial);
      setCopiado(serial);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* sem permissão para a área de transferência */
    }
  };
  const [erro, setErro] = useState<string | null>(null);

  const bright = isDark ? '#a97aff' : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.7)';
  const border = isDark ? 'rgba(141,81,255,0.45)' : 'rgba(81,0,189,0.25)';
  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(25,6,55,0.9) 0%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,251,0.95) 100%)';

  const carregar = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([OrdersAPI.list(), DevicesAPI.list()]);
      setPedidos(p);
      setDispositivos(d);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const receber = async (serial: string) => {
    setOcupado(serial);
    setErro(null);
    try {
      await DevicesAPI.receive(serial);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const painel = { background: cardBg, border: `1px solid ${border}`, color: fg };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}>
      <Navbar />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[180px]" style={{ background: `${bright}33` }} />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 pt-32 pb-16 space-y-6">
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 600, color: fg }}>
            Minhas compras
          </h1>
          <p className="text-sm mt-1" style={{ color: muted }}>
            Seus pedidos e os dispositivos Krypta que você comprou.
          </p>
          <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(90deg, ${bright}, transparent)` }} />
        </motion.header>

        {erro && (
          <div className="rounded-xl p-3 flex items-start gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
          </div>
        )}

        {carregando ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: muted }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando suas compras...
          </div>
        ) : (
          <>
            {/* ============ DISPOSITIVOS ============ */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-5 md:p-6" style={painel}>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
                <Cpu className="w-5 h-5" style={{ color: bright }} /> Meus dispositivos
              </h2>
              <p className="text-xs mb-4" style={{ color: muted }}>
                Cada unidade tem um número de série. É ele que você escolhe ao parear no Meu Krypta. Só um dispositivo
                protege o cofre por vez; os outros ficam guardados como reserva (ex.: para usar depois de um Kill Switch).
              </p>

              {dispositivos.length === 0 ? (
                <div className="text-sm rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ border: `1px dashed ${border}` }}>
                  <span style={{ color: muted }}>Você ainda não comprou nenhum Dispositivo Krypta.</span>
                  <Link to="/products" className="px-4 py-2 rounded-lg text-sm font-bold text-white inline-flex items-center gap-2 self-start" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                    <ShoppingCart className="w-4 h-4" /> Ver o dispositivo
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dispositivos.map((d) => {
                    const st = STATUS[d.status];
                    const passoAtual = d.status === 'REVOGADO' ? 3 : PASSOS.findIndex((p) => p.status === d.status);
                    return (
                      <motion.div key={d.serial} layout className="rounded-xl p-4" style={{ border: `1px solid ${d.emUsoNoCofre ? bright : border}`, background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.6)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono font-bold text-sm flex items-center gap-1.5">
                              {d.serial}
                              <button type="button" onClick={() => copiarSerial(d.serial)} title="Copiar número de série" aria-label="Copiar número de série" style={{ color: bright }}>
                                {copiado === d.serial ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </p>
                            <p className="text-xs" style={{ color: muted }}>{d.modelo} · comprado em {data(d.compradoEm)}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: `${st.cor}22`, border: `1px solid ${st.cor}66`, color: st.cor }}>
                            {st.rotulo}
                          </span>
                        </div>

                        {/* Hardware real: o ESP32 já ligou e falou com o servidor */}
                        {d.conectado && (
                          <p className="mt-2 text-[11px] flex flex-wrap items-center gap-1.5" style={{ color: muted }}>
                            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#22c55e' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {d.hardwareReal ? 'Hardware real no cofre' : 'Hardware ligado'}
                            </span>
                            {d.codigoConfirmacao && <>· código <span className="font-mono font-bold" style={{ color: bright }}>{d.codigoConfirmacao}</span></>}
                            {d.ultimoContato && <>· último contato {data(d.ultimoContato)}</>}
                          </p>
                        )}

                        {/* Linha do tempo */}
                        <div className="flex items-center gap-1.5 my-3">
                          {PASSOS.map((p, i) => (
                            <div key={p.status} className="flex-1">
                              <div className="h-1.5 rounded-full" style={{ background: i <= passoAtual && d.status !== 'REVOGADO' ? bright : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
                              <p className="text-[10px] mt-1" style={{ color: muted }}>{p.titulo}</p>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs mb-3" style={{ color: muted }}>{st.dica}</p>

                        {d.status === 'EM_TRANSPORTE' && (
                          <button type="button" onClick={() => receber(d.serial)} disabled={ocupado === d.serial} className="px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                            {ocupado === d.serial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />} Recebi meu dispositivo
                          </button>
                        )}
                        {d.status === 'DISPONIVEL' && (
                          <button type="button" onClick={() => navigate(`/device?serial=${encodeURIComponent(d.serial)}`)} className="px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 text-white" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                            <Cpu className="w-3.5 h-3.5" /> Parear no Meu Krypta
                          </button>
                        )}
                        {d.status === 'PAREADO' && (
                          <Link to="/device" className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: bright }}>
                            <Check className="w-3.5 h-3.5" /> Ver no Meu Krypta
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] mt-3" style={{ color: muted }}>
                Demonstração: a entrega é simulada pelo botão "Recebi meu dispositivo".
              </p>
            </motion.section>

            {/* ============ PEDIDOS ============ */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl p-5 md:p-6" style={painel}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
                <Package className="w-5 h-5" style={{ color: bright }} /> Pedidos
              </h2>
              {pedidos.length === 0 ? (
                <p className="text-sm" style={{ color: muted }}>Nenhum pedido ainda.</p>
              ) : (
                <div className="space-y-3">
                  {pedidos.map((p) => (
                    <div key={p.id} className="rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3" style={{ border: `1px solid ${border}` }}>
                      <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                        {p.tipo === 'PLANO' ? <Crown className="w-5 h-5 text-white" /> : <Cpu className="w-5 h-5 text-white" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{p.descricao}</p>
                        <p className="text-xs" style={{ color: muted }}>
                          {p.codigo} · {data(p.criadoEm)} · {p.metodo === 'card' ? `Cartão${p.cartaoFinal ? ` •••• ${p.cartaoFinal}` : ''}` : p.metodo.toUpperCase()}
                          {p.parcelas > 1 ? ` · ${p.parcelas}x` : ''}
                        </p>
                        {p.enderecoEntrega && <p className="text-xs" style={{ color: muted }}>Entrega: {p.enderecoEntrega}</p>}
                        {p.dispositivos && p.dispositivos.length > 0 && (
                          <p className="text-xs font-mono mt-1" style={{ color: bright }}>{p.dispositivos.map((d) => d.serial).join(' · ')}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{brl(p.valorTotal)}</p>
                        <p className="text-[11px]" style={{ color: '#22c55e' }}>{p.status === 'APROVADO' ? 'Aprovado' : 'Cancelado'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] mt-3" style={{ color: muted }}>Pagamentos simulados (Krypta Pay): nenhum valor foi cobrado.</p>
            </motion.section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
