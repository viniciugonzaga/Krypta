// src/pages/InheritanceClaim.tsx
// ============================================================
// RESGATE DE HERANÇA (página pública: /heranca)
//
// O herdeiro não tem conta no site. Ele usa o KIT que o dono entregou
// (conta_id + CCH) e um dispositivo NOVO (aqui, virtual). O resgate:
//   1. deriva a prova da CCH no navegador (Argon2id)
//   2. revoga o dispositivo do dono e vincula o do herdeiro
//   3. baixa o backup e abre o Envelope do Herdeiro com a CCH
//   4. grava no dispositivo e conclui a recuperação
// A CCH vale UMA vez.
//
// O herdeiro não precisa digitar a rota nem o ID: o kit traz um link
// /heranca#kit=<conta_id>:<CCH>. O que vem depois do # NUNCA vai ao servidor
// (o navegador não envia o fragmento), então a CCH não aparece em logs.
// ============================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Check, ClipboardPaste, KeyRound, Loader2, Lock, Users } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { resgatarHeranca } from '../services/vaultFlows';
import { normalizarSegredo, segredoValido, type Credencial } from '../crypto/kryptaCrypto';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function InheritanceClaim() {
  const { isDark } = useTheme();
  const [contaId, setContaId] = useState('');
  const [cch, setCch] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<Credencial[] | null>(null);
  const [doLink, setDoLink] = useState(false);
  const [codigoKit, setCodigoKit] = useState('');

  // Aceita "conta_id:CCH" (o formato do link e do código do kit)
  const aplicarCodigo = (bruto: string): boolean => {
    const txt = decodeURIComponent(bruto.trim()).replace(/^.*#kit=/, '');
    const i = txt.indexOf(':');
    if (i < 0) return false;
    const id = txt.slice(0, i).trim();
    const chave = txt.slice(i + 1).trim();
    if (!UUID.test(id)) return false;
    setContaId(id);
    setCch(normalizarSegredo(chave));
    return true;
  };

  useEffect(() => {
    const m = window.location.hash.match(/kit=([^&]+)/);
    if (m && aplicarCodigo(m[1])) {
      setDoLink(true);
      // tira a chave da barra de endereço (e do histórico)
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bright = isDark ? '#a97aff' : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.7)';
  const border = isDark ? 'rgba(141,81,255,0.45)' : 'rgba(81,0,189,0.25)';
  const fieldBg = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.95)';

  const pronto = UUID.test(contaId.trim()) && segredoValido(cch);

  const resgatar = async () => {
    setOcupado(true);
    setErro(null);
    try {
      const d = await resgatarHeranca(contaId.trim(), cch);
      setCredenciais(d.credenciais);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}>
      <Navbar />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[180px]" style={{ background: `${bright}33` }} />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: isDark
              ? 'linear-gradient(160deg, rgba(25,6,55,0.92) 0%, rgba(0,0,0,0.88) 100%)'
              : 'linear-gradient(160deg, #FFFFFF 0%, #F4F0FC 100%)',
            border: `1px solid ${border}`,
            color: fg,
          }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl mb-1" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>Resgate de herança</h1>
          <p className="text-sm mb-6" style={{ color: muted }}>
            Use o kit que o titular deixou para você. Um dispositivo novo será criado neste navegador e o cofre será
            aberto aqui, com a sua chave. O Krypta nunca vê o conteúdo.
          </p>

          {!credenciais ? (
            <div className="space-y-4">
              {doLink ? (
                <div className="rounded-lg p-3 flex items-start gap-2 text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', color: isDark ? '#86efac' : '#15803d' }}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0" /> Kit carregado pelo link. Confira os dados e clique em "Resgatar cofre".
                </div>
              ) : (
                <div>
                  <label className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: muted }}>
                    Cole o link ou o código do kit (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={codigoKit}
                      onChange={(e) => setCodigoKit(e.target.value)}
                      placeholder="https://.../heranca#kit=...  ou  conta_id:CCH"
                      spellCheck={false}
                      autoComplete="off"
                      className="flex-1 min-w-0 py-3 px-4 rounded-lg text-[13px] font-mono outline-none focus:ring-2 focus:ring-purple-500/50"
                      style={{ background: fieldBg, border: `1px solid ${border}`, color: fg }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (aplicarCodigo(codigoKit)) { setErro(null); setCodigoKit(''); }
                        else setErro('Código do kit inválido. Ele tem o formato conta_id:CCH.');
                      }}
                      className="px-4 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                      style={{ border: `1px solid ${bright}`, color: bright }}
                    >
                      <ClipboardPaste className="w-4 h-4" /> Usar
                    </button>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: muted }}>Ou preencha os dois campos abaixo, como está escrito no kit.</p>
                </div>
              )}
              <div>
                <label className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: muted }}>
                  ID da conta (conta_id)
                </label>
                <input
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  spellCheck={false}
                  className="w-full py-3 px-4 rounded-lg text-[13px] font-mono outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={{ background: fieldBg, border: `1px solid ${border}`, color: fg }}
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: muted }}>
                  Chave do herdeiro (CCH)
                </label>
                <input
                  value={cch}
                  onChange={(e) => setCch(e.target.value)}
                  onBlur={() => cch && setCch(normalizarSegredo(cch))}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full py-3 px-4 rounded-lg text-[13px] font-mono tracking-wider outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={{ background: fieldBg, border: `1px solid ${border}`, color: fg }}
                />
              </div>

              {erro && (
                <div className="rounded-lg p-3 flex items-start gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
                </div>
              )}

              <button
                type="button"
                onClick={resgatar}
                disabled={!pronto || ocupado}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', fontFamily: ROUNDED_FONT }}
              >
                {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {ocupado ? 'Derivando a chave e resgatando o cofre...' : 'Resgatar cofre'}
              </button>
              <p className="text-[11px]" style={{ color: muted }}>
                A CCH vale uma única vez. Depois do resgate, o dispositivo do titular é revogado e ele recebe um aviso por e-mail.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg p-3 flex items-start gap-2 text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', color: isDark ? '#86efac' : '#15803d' }}>
                <Check className="w-4 h-4 mt-0.5 shrink-0" /> Cofre resgatado e aberto neste dispositivo.
              </div>
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
                <Lock className="w-5 h-5" style={{ color: bright }} /> Credenciais herdadas
              </h2>
              {credenciais.length === 0 && <p className="text-sm" style={{ color: muted }}>O cofre estava vazio.</p>}
              {credenciais.map((c) => (
                <div key={c.id} className="rounded-lg p-3 flex items-center justify-between gap-3" style={{ border: `1px solid ${border}` }}>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.servico}</p>
                    <p className="text-xs truncate" style={{ color: muted }}>{c.usuario || '—'}</p>
                  </div>
                  <span className="font-mono text-xs select-all">{c.senha}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] mt-6" style={{ color: muted }}>
            Dispositivo virtual de demonstração.{' '}
            <Link to="/como-funciona#heranca" className="underline" style={{ color: bright }}>Como funciona a herança</Link>
            {' · '}
            <Link to="/" className="underline" style={{ color: bright }}>Voltar ao início</Link>
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
