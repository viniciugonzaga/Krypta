// src/ajuda/KrypBot.tsx
// ============================================================
// KRYP — o robô de ajuda (site, app do Windows e modo celular)
//
// Botão flutuante no canto → abre a conversa.
//   • respostas montadas pelo motor.ts com o PERFIL da pessoa
//   • sugestões que mudam conforme a página
//   • botões que levam direto para a tela certa
//   • conversa guardada só nesta aba (sessionStorage), some ao sair
// ============================================================
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, X, RotateCcw, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModo } from '../mobile/ModoContext';
import { Trava } from '../services/virtualDevice';
import { montarPerfil, PERFIL_VAZIO, type PerfilAjuda } from './contexto';
import { responder, saudacao, type Resultado } from './motor';
import { sugestoesDaPagina, type Acao } from './base';
import roboAcenando from '../assets/sprites/sprite_robo_acenando.png';
import roboVerificado from '../assets/sprites/sprite_robo_verificado.png';
import roboInterrogacao from '../assets/sprites/sprite_robo_interrogacao.png';
import roboConfig from '../assets/sprites/sprite_robo_configuracao.png';

interface Msg {
  de: 'kryp' | 'eu';
  texto: string;
  acoes?: Acao[];
  sugestoes?: string[];
  humor?: 'ok' | 'duvida' | 'oi';
}

const CHAVE = (id: string) => `@Krypta:kryp:${id}`;
const ESCONDER_EM = ['/loading', '/verify-email'];

/** **negrito**, `código`, listas "1." e quebras de linha */
function Texto({ t }: { t: string }) {
  const linha = (s: string, k: number): ReactNode => {
    const partes = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return (
      <span key={k}>
        {partes.map((p, i) =>
          p.startsWith('**') ? (
            <strong key={i}>{p.slice(2, -2)}</strong>
          ) : p.startsWith('`') ? (
            <code key={i} className="px-1 rounded bg-black/10 dark:bg-white/10 text-[0.92em]">
              {p.slice(1, -1)}
            </code>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </span>
    );
  };
  return (
    <div className="space-y-1.5">
      {t.split('\n\n').map((par, i) => (
        <p key={i} className="leading-relaxed">
          {par.split('\n').map((l, j) => (
            <span key={j} className="block">
              {linha(l, j)}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function KrypBot() {
  const { user } = useAuth();
  const { modo } = useModo();
  const { isDark } = useTheme();
  const loc = useLocation();
  const navigate = useNavigate();
  const mobile = modo === 'mobile';

  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<PerfilAjuda>(PERFIL_VAZIO);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [digitando, setDigitando] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [anterior, setAnterior] = useState<string | null>(null);
  const [balao, setBalao] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const idConversa = user?.id ?? 'visitante';

  // conversa guardada nesta aba
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHAVE(idConversa));
      setMsgs(raw ? (JSON.parse(raw) as Msg[]) : []);
    } catch {
      setMsgs([]);
    }
    setAnterior(null);
  }, [idConversa]);
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE(idConversa), JSON.stringify(msgs.slice(-40)));
    } catch {
      /* sem armazenamento: tudo bem */
    }
  }, [msgs, idConversa]);

  // perfil: ao abrir, ao trocar de página e quando a trava muda
  const atualizar = useCallback(async () => {
    const p = await montarPerfil({ user: user ? { id: user.id, name: user.name, plan: user.plan } : null, pagina: loc.pathname, mobile }).catch(() => ({ ...PERFIL_VAZIO, pagina: loc.pathname }));
    setPerfil(p);
    return p;
  }, [user, loc.pathname, mobile]);

  useEffect(() => {
    if (aberto) void atualizar();
  }, [aberto, atualizar]);
  useEffect(() => Trava.assinar(() => {
    if (aberto) void atualizar();
  }), [aberto, atualizar]);

  // balãozinho "Precisa de ajuda?" uma vez por aba, depois de 20 s
  useEffect(() => {
    if (sessionStorage.getItem('@Krypta:kryp-balao')) return;
    const t = setTimeout(() => {
      setBalao(true);
      sessionStorage.setItem('@Krypta:kryp-balao', '1');
      setTimeout(() => setBalao(false), 7000);
    }, 20000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, digitando, aberto]);

  // Esc fecha
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aberto]);

  const falar = useCallback((r: Resultado, atraso: number) => {
    setDigitando(true);
    setTimeout(() => {
      setDigitando(false);
      setMsgs((m) => [...m, { de: 'kryp', texto: r.texto, acoes: r.acoes, sugestoes: r.sugestoes, humor: r.confianca === 'nenhuma' ? 'duvida' : 'ok' }]);
      if (r.assunto) setAnterior(r.assunto);
    }, atraso);
  }, []);

  const abrir = async () => {
    setBalao(false);
    setAberto(true);
    if (msgs.length === 0) {
      const p = await atualizar();
      falar(saudacao(p), 450);
    }
    setTimeout(() => campoRef.current?.focus(), 250);
  };

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || digitando) return;
    setEntrada('');
    setMsgs((m) => [...m, { de: 'eu', texto: t }]);
    const p = await atualizar();
    const r = responder(t, p, anterior);
    // "pensa" proporcional ao tamanho da resposta (parece mais natural)
    falar(r, Math.min(1400, 380 + r.texto.length * 4));
  };

  // Dicas e outras telas podem abrir o Kryp já com uma pergunta
  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;
  useEffect(() => {
    const f = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      setBalao(false);
      setAberto(true);
      if (typeof q === 'string' && q.trim()) setTimeout(() => void enviarRef.current(q), 200);
    };
    window.addEventListener('krypta:kryp', f);
    return () => window.removeEventListener('krypta:kryp', f);
  }, []);

  const ir = (a: Acao) => {
    navigate(a.para);
    if (mobile) setAberto(false);
  };

  const recomecar = async () => {
    setMsgs([]);
    setAnterior(null);
    const p = await atualizar();
    falar(saudacao(p), 300);
  };

  if (ESCONDER_EM.some((p) => loc.pathname.startsWith(p))) return null;
  // telas de entrada do celular (abertura, entrar, criar conta): sem botão flutuante por cima dos botões
  if (mobile && !user && ['/', '/login', '/register', '/recover', '/boas-vindas'].includes(loc.pathname) && !aberto) return null;

  const fundo = isDark ? '#140726' : '#FFFFFF';
  const borda = isDark ? 'rgba(160,110,255,0.22)' : 'rgba(81,0,189,0.14)';
  const texto = isDark ? '#EDE7FF' : '#1C1030';
  const suave = isDark ? 'rgba(237,231,255,0.62)' : 'rgba(28,16,48,0.6)';
  const bolhaKryp = isDark ? 'rgba(141,81,255,0.13)' : '#F4EEFF';
  const baixo = mobile ? 'calc(96px + env(safe-area-inset-bottom))' : '24px';
  const ultima = [...msgs].reverse().find((m) => m.de === 'kryp');
  const chips = digitando ? [] : ultima?.sugestoes?.length ? ultima.sugestoes : sugestoesDaPagina({ ...perfil, pagina: loc.pathname });
  const rosto = digitando ? roboConfig : ultima?.humor === 'duvida' ? roboInterrogacao : msgs.length > 1 ? roboVerificado : roboAcenando;

  return (
    <>
      {/* botão flutuante */}
      <AnimatePresence>
        {!aberto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="fixed z-[70] flex items-end gap-2"
            style={{ right: mobile ? 14 : 24, bottom: baixo }}
          >
            <AnimatePresence>
              {balao && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={abrir}
                  className="mb-3 px-3 py-2 rounded-2xl rounded-br-sm text-xs font-semibold shadow-lg"
                  style={{ background: fundo, color: texto, border: `1px solid ${borda}` }}
                >
                  Precisa de ajuda? 👋
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              onClick={abrir}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Abrir o Kryp, assistente de ajuda"
              title="Kryp — ajuda"
              className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', boxShadow: '0 10px 30px rgba(81,0,189,0.45)' }}
            >
              <img src={roboAcenando} alt="" className="w-11 h-11 object-contain drop-shadow" draggable={false} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* janela da conversa */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            role="dialog"
            aria-label="Kryp, assistente de ajuda"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed z-[80] flex flex-col overflow-hidden shadow-2xl"
            style={
              mobile
                ? { left: 8, right: 8, bottom: 'calc(8px + env(safe-area-inset-bottom))', top: 'calc(64px + env(safe-area-inset-top))', borderRadius: 24, background: fundo, border: `1px solid ${borda}`, color: texto, fontFamily: "'Quicksand', 'Poppins', sans-serif" }
                : { right: 24, bottom: 24, width: 380, height: 'min(600px, calc(100vh - 48px))', borderRadius: 22, background: fundo, border: `1px solid ${borda}`, color: texto }
            }
          >
            {/* topo */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
              <motion.img key={rosto} src={rosto} alt="" initial={{ scale: 0.8, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} className="w-11 h-11 object-contain drop-shadow" draggable={false} />
              <div className="flex-1 min-w-0 text-white">
                <p className="font-bold leading-tight">Kryp</p>
                <p className="text-[11px] opacity-80 leading-tight">{digitando ? 'digitando…' : perfil.logado ? `Assistente · plano ${perfil.pro ? 'Pro' : 'Free'}` : 'Assistente do Krypta'}</p>
              </div>
              <button onClick={recomecar} className="p-2 rounded-full text-white/85 hover:bg-white/15" aria-label="Recomeçar conversa" title="Recomeçar">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setAberto(false)} className="p-2 rounded-full text-white hover:bg-white/15" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            {/* mensagens */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 text-[13.5px]">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={m.de === 'eu' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[86%] px-3.5 py-2.5 ${m.de === 'eu' ? 'rounded-2xl rounded-br-md text-white' : 'rounded-2xl rounded-bl-md'}`}
                    style={m.de === 'eu' ? { background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' } : { background: bolhaKryp }}
                  >
                    <Texto t={m.texto} />
                    {m.acoes && m.acoes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {m.acoes.map((a) => (
                          <button
                            key={a.para + a.rotulo}
                            onClick={() => ir(a)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white hover:opacity-90"
                            style={{ background: '#6a1fe0' }}
                          >
                            {a.rotulo} <ArrowRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {digitando && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md flex gap-1" style={{ background: bolhaKryp }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#8d51ff' }} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={fimRef} />
            </div>

            {/* sugestões */}
            {chips.length > 0 && (
              <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {chips.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={{ border: `1px solid ${borda}`, color: isDark ? '#c9b3ff' : '#5100BD', background: isDark ? 'rgba(141,81,255,0.08)' : '#FAF7FF' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* campo */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enviar(entrada);
              }}
              className="flex items-center gap-2 px-3 py-3"
              style={{ borderTop: `1px solid ${borda}` }}
            >
              <input
                ref={campoRef}
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                placeholder="Pergunte do seu jeito…"
                maxLength={300}
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full text-sm outline-none"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#F3F0FA', color: texto }}
              />
              <button
                type="submit"
                disabled={!entrada.trim() || digitando}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}
                aria-label="Enviar"
              >
                <Send size={16} />
              </button>
            </form>
            <p className="text-center text-[10px] pb-2 -mt-1" style={{ color: suave }}>
              O Kryp nunca vê suas senhas.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
