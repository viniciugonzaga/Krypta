// src/ajuda/CodyBot.tsx
// ============================================================
// CODY — o robô de ajuda (site, app do Windows e modo celular)
//
// • botão flutuante (no celular some no Início e no Perfil, que têm o
//   cartão "Fale com o Cody") e janela de conversa
// • respostas em vários balões, com "digitando…" entre eles
// • perguntas de volta com opções clicáveis (ou digitadas)
// • botões e navegação automática para a tela certa
// • conversa guardada só nesta aba (sessionStorage); senhas geradas não
// • qualquer tela abre o Cody com abrirCody('pergunta') — ver abrir.ts
// ============================================================
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, RotateCcw, Send, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModo } from '../mobile/ModoContext';
import { Trava } from '../services/virtualDevice';
import { montarPerfil, PERFIL_VAZIO, type PerfilAjuda } from './contexto';
import { Conversa, type Resultado } from './motor';
import { sugestoesDaPagina } from './base';
import { EVENTO_CODY } from './abrir';
import { useCodyFlutuante } from './preferencias';
import type { Acao, Humor, Opcao } from './tipos';
import kAcenando from '../assets/cody/cody_acenando.webp';
import kVerificado from '../assets/cody/cody_verificado.webp';
import kInterrogacao from '../assets/cody/cody_interrogacao.webp';
import kConfig from '../assets/cody/cody_configuracao.webp';
import kExclamacao from '../assets/cody/cody_exclamacao.webp';
import kAnimado from '../assets/cody/cody_animado.webp';
import kEncolhido from '../assets/cody/cody_encolhido.webp';
import kX from '../assets/cody/cody_x.webp';
import kDormindo from '../assets/cody/cody_dormindo.webp';

export const ROSTO: Record<Humor, string> = {
  oi: kAcenando,
  ok: kVerificado,
  duvida: kInterrogacao,
  pensando: kConfig,
  alerta: kExclamacao,
  feliz: kAnimado,
  triste: kEncolhido,
  erro: kX,
  dormindo: kDormindo,
};

interface Msg {
  id: number;
  de: 'cody' | 'eu';
  texto: string;
  humor?: Humor;
  acoes?: Acao[];
  /** guardado só para mostrar os rótulos; quem responde é o motor */
  opcoes?: string[];
  sugestoes?: string[];
  efemera?: boolean;
}

const CHAVE = (id: string) => `@Krypta:cody:${id}`;
const ESCONDER_EM = ['/loading', '/verify-email', '/auth/callback'];
const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';
let seq = Date.now();

/** **negrito**, `código` e quebras de linha */
function Texto({ t }: { t: string }) {
  const linha = (s: string, k: number): ReactNode => (
    <span key={k}>
      {s
        .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        .filter(Boolean)
        .map((p, i) =>
          p.startsWith('**') ? (
            <strong key={i}>{p.slice(2, -2)}</strong>
          ) : p.startsWith('`') ? (
            <code key={i} className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[0.95em] font-mono break-all select-all">
              {p.slice(1, -1)}
            </code>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
    </span>
  );
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

export function CodyBot() {
  const { user } = useAuth();
  const { modo } = useModo();
  const { isDark } = useTheme();
  const loc = useLocation();
  const navigate = useNavigate();
  const mobile = modo === 'mobile';
  const idConversa = user?.id ?? 'visitante';

  const [aberto, setAberto] = useState(false);
  const [flutuante] = useCodyFlutuante();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [digitando, setDigitando] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [balao, setBalao] = useState(false);
  const conversa = useRef(new Conversa());
  const perfilRef = useRef<{ p: PerfilAjuda; quando: number; pagina: string } | null>(null);
  const fila = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  // ---------- conversa guardada nesta aba ----------
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHAVE(idConversa));
      const salvo = raw ? (JSON.parse(raw) as { msgs: Msg[]; estado: { turno: number; anterior: string | null } }) : null;
      setMsgs((salvo?.msgs ?? []).map((m) => ({ ...m, opcoes: undefined })));
      conversa.current = new Conversa(salvo?.estado);
    } catch {
      setMsgs([]);
      conversa.current = new Conversa();
    }
    perfilRef.current = null;
  }, [idConversa]);
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE(idConversa), JSON.stringify({ msgs: msgs.filter((m) => !m.efemera).slice(-50), estado: conversa.current.estado() }));
    } catch {
      /* sem armazenamento */
    }
  }, [msgs, idConversa]);

  // ---------- perfil (com cache curto) ----------
  const perfil = useCallback(
    async (forcar = false): Promise<PerfilAjuda> => {
      const c = perfilRef.current;
      if (!forcar && c && c.pagina === loc.pathname && Date.now() - c.quando < 15000) return c.p;
      const p = await montarPerfil({ user: user ? { id: user.id, name: user.name, plan: user.plan } : null, pagina: loc.pathname, mobile }).catch(() => ({ ...PERFIL_VAZIO, pagina: loc.pathname }));
      perfilRef.current = { p, quando: Date.now(), pagina: loc.pathname };
      return p;
    },
    [user, loc.pathname, mobile],
  );
  useEffect(() => Trava.assinar(() => (perfilRef.current = null)), []);

  // ---------- fala em vários balões ----------
  const falar = useCallback(
    (r: Resultado, atrasoInicial = 450) => {
      fila.current.forEach(clearTimeout);
      fila.current = [];
      setDigitando(true);
      let t = atrasoInicial;
      r.baloes.forEach((b, i) => {
        const ultimo = i === r.baloes.length - 1;
        fila.current.push(
          setTimeout(() => {
            setMsgs((m) => [
              ...m,
              {
                id: ++seq,
                de: 'cody',
                texto: b,
                humor: i === 0 ? (r.humor ?? 'ok') : undefined,
                efemera: r.efemera,
                ...(ultimo ? { acoes: r.acoes, opcoes: r.opcoes?.map((o: Opcao) => o.rotulo), sugestoes: r.sugestoes } : {}),
              },
            ]);
            if (ultimo) {
              setDigitando(false);
              if (r.irPara) fila.current.push(setTimeout(() => irParaRef.current(r.irPara!), 650));
            }
          }, t),
        );
        t += Math.min(1300, 350 + (r.baloes[i + 1]?.length ?? 0) * 9);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => fila.current.forEach(clearTimeout), []);

  const irPara = (para: string) => {
    navigate(para);
    if (mobile) setAberto(false);
  };
  const irParaRef = useRef(irPara);
  irParaRef.current = irPara;

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || digitando) return;
    setEntrada('');
    setMsgs((m) => [...m.map((x) => ({ ...x, opcoes: undefined })), { id: ++seq, de: 'eu', texto: t }]);
    setDigitando(true);
    const p = await perfil();
    falar(conversa.current.responder(t, p), 300 + Math.min(700, t.length * 12));
  };
  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;

  const abrir = async (pergunta?: string) => {
    setBalao(false);
    setAberto(true);
    if (pergunta?.trim()) {
      setTimeout(() => void enviarRef.current(pergunta), 250);
    } else if (msgs.length === 0) {
      setDigitando(true);
      const p = await perfil(true);
      falar(conversa.current.saudacao(p), 500);
    }
    if (!mobile) setTimeout(() => campoRef.current?.focus(), 300);
  };
  const abrirRef = useRef(abrir);
  abrirRef.current = abrir;

  // outras telas abrem o Cody (cartão, dicas...)
  useEffect(() => {
    const f = (e: Event) => void abrirRef.current((e as CustomEvent<string>).detail);
    window.addEventListener(EVENTO_CODY, f);
    return () => window.removeEventListener(EVENTO_CODY, f);
  }, []);

  const recomecar = async () => {
    fila.current.forEach(clearTimeout);
    conversa.current = new Conversa();
    setMsgs([]);
    setDigitando(true);
    const p = await perfil(true);
    falar(conversa.current.saudacao(p), 350);
  };

  // balãozinho "Precisa de ajuda?" uma vez por aba
  useEffect(() => {
    if (sessionStorage.getItem('@Krypta:cody-balao')) return;
    const t = setTimeout(() => {
      setBalao(true);
      sessionStorage.setItem('@Krypta:cody-balao', '1');
      setTimeout(() => setBalao(false), 7000);
    }, 25000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, digitando, aberto]);

  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aberto]);

  if (ESCONDER_EM.some((p) => loc.pathname.startsWith(p))) return null;
  // celular: telas de entrada sem botão por cima; Início e Perfil já têm o cartão do Cody
  // v1.5.0: no app o Cody também fica na barra de baixo; a pessoa pode desligar o botão flutuante em Ajustes
  const semBotao = !flutuante || (mobile && ((!user && ['/', '/login', '/register', '/recover'].includes(loc.pathname)) || (!!user && ['/', '/profile'].includes(loc.pathname))));

  const fundo = isDark ? '#140726' : '#FFFFFF';
  const borda = isDark ? 'rgba(160,110,255,0.22)' : 'rgba(81,0,189,0.14)';
  const cor = isDark ? '#EDE7FF' : '#1C1030';
  const suave = isDark ? 'rgba(237,231,255,0.62)' : 'rgba(28,16,48,0.6)';
  const bolha = isDark ? 'rgba(141,81,255,0.13)' : '#F4EEFF';
  const roxo = isDark ? '#c9b3ff' : '#5100BD';
  const baixo = mobile ? 'calc(96px + env(safe-area-inset-bottom))' : '24px';
  const ultimaCody = [...msgs].reverse().find((m) => m.de === 'cody');
  const ultimaMsg = msgs[msgs.length - 1];
  const opcoesAtivas = !digitando && ultimaMsg?.de === 'cody' ? ultimaMsg.opcoes ?? [] : [];
  const chips = digitando || opcoesAtivas.length ? [] : ultimaCody?.sugestoes?.length ? ultimaCody.sugestoes : sugestoesDaPagina({ ...(perfilRef.current?.p ?? PERFIL_VAZIO), logado: !!user, pagina: loc.pathname });
  const humorAtual: Humor = digitando ? 'pensando' : ([...msgs].reverse().find((m) => m.humor)?.humor ?? 'oi');

  return (
    <>
      {/* botão flutuante */}
      <AnimatePresence>
        {!aberto && !semBotao && (
          <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="fixed z-[70] flex items-end gap-2" style={{ right: mobile ? 14 : 24, bottom: baixo }}>
            <AnimatePresence>
              {balao && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={() => void abrir()}
                  className="mb-3 px-3 py-2 rounded-2xl rounded-br-sm text-xs font-semibold shadow-lg"
                  style={{ background: fundo, color: cor, border: `1px solid ${borda}` }}
                >
                  Oi! Precisa de ajuda? 👋
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              onClick={() => void abrir()}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Falar com o Cody, assistente de ajuda"
              title="Fale com o Cody"
              className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
              style={{ background: GRAD, boxShadow: '0 10px 30px rgba(81,0,189,0.45)' }}
            >
              <img src={kAcenando} alt="" className="w-11 h-11 object-contain drop-shadow" draggable={false} />
              <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full" style={{ background: '#22c55e', border: '2px solid #fff' }} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* janela */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            role="dialog"
            aria-label="Conversa com o Cody"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed z-[80] flex flex-col overflow-hidden shadow-2xl"
            style={
              mobile
                ? { left: 8, right: 8, bottom: 'calc(8px + env(safe-area-inset-bottom))', top: 'calc(64px + env(safe-area-inset-top))', borderRadius: 24, background: fundo, border: `1px solid ${borda}`, color: cor, fontFamily: "'Quicksand', 'Poppins', sans-serif" }
                : { right: 24, bottom: 24, width: 400, height: 'min(640px, calc(100vh - 48px))', borderRadius: 22, background: fundo, border: `1px solid ${borda}`, color: cor }
            }
          >
            {/* topo */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: GRAD }}>
              <div className="relative">
                <motion.img key={humorAtual} src={ROSTO[humorAtual]} alt="" initial={{ scale: 0.8, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} className="w-11 h-11 object-contain drop-shadow" draggable={false} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e', border: '2px solid #6a1fe0' }} />
              </div>
              <div className="flex-1 min-w-0 text-white">
                <p className="font-bold leading-tight">Cody</p>
                <p className="text-[11px] opacity-85 leading-tight">{digitando ? 'digitando…' : user ? `online · plano ${perfilRef.current?.p.pro ? 'Pro' : 'Free'}` : 'online · assistente do Krypta'}</p>
              </div>
              <button onClick={() => void recomecar()} className="p-2 rounded-full text-white/85 hover:bg-white/15" aria-label="Recomeçar conversa" title="Recomeçar">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setAberto(false)} className="p-2 rounded-full text-white hover:bg-white/15" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            {/* mensagens */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 text-[13.5px]">
              {msgs.map((m, i) => {
                const primeiroDoGrupo = m.de === 'cody' && msgs[i - 1]?.de !== 'cody';
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${m.de === 'eu' ? 'justify-end' : 'justify-start'} ${primeiroDoGrupo && i > 0 ? 'pt-2' : ''}`}>
                    {m.de === 'cody' && (
                      <span className="w-7 shrink-0 self-start">{primeiroDoGrupo && <img src={ROSTO[m.humor ?? 'ok']} alt="" className="w-7 h-7 object-contain" draggable={false} />}</span>
                    )}
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 ${m.de === 'eu' ? 'rounded-2xl rounded-br-md text-white' : 'rounded-2xl rounded-tl-md'}`}
                      style={m.de === 'eu' ? { background: GRAD } : { background: bolha }}
                    >
                      <Texto t={m.texto} />
                      {m.acoes && m.acoes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {m.acoes.map((a) => (
                            <button key={a.para + a.rotulo} onClick={() => irPara(a.para)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white hover:opacity-90" style={{ background: '#6a1fe0' }}>
                              {a.rotulo} <ArrowRight size={12} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* opções da pergunta do Cody */}
              {opcoesAtivas.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-1.5 pl-9 pt-1">
                  {opcoesAtivas.map((o) => (
                    <button key={o} onClick={() => void enviar(o)} className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold" style={{ border: `1.5px solid ${roxo}`, color: roxo }}>
                      {o}
                    </button>
                  ))}
                </motion.div>
              )}

              {digitando && (
                <div className="flex items-end gap-2">
                  <img src={kConfig} alt="" className="w-7 h-7 object-contain" draggable={false} />
                  <div className="px-4 py-3 rounded-2xl rounded-tl-md flex gap-1" style={{ background: bolha }}>
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
                  <button key={s} onClick={() => void enviar(s)} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ border: `1px solid ${borda}`, color: roxo, background: isDark ? 'rgba(141,81,255,0.08)' : '#FAF7FF' }}>
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
                placeholder={opcoesAtivas.length ? 'Responda ou pergunte outra coisa…' : 'Pergunte do seu jeito…'}
                maxLength={300}
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full text-sm outline-none"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#F3F0FA', color: cor }}
              />
              <button type="submit" disabled={!entrada.trim() || digitando} className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40" style={{ background: GRAD }} aria-label="Enviar">
                <Send size={16} />
              </button>
            </form>
            <p className="text-center text-[10px] pb-2 -mt-1" style={{ color: suave }}>
              O Cody nunca vê suas senhas. Ele roda no seu aparelho.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
