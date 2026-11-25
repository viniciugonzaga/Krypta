// src/mobile/pages/MOnboarding.tsx
// ============================================================
// /boas-vindas — QUESTIONÁRIO DO PRIMEIRO ACESSO (5 perguntas)
//   1. Como pretende usar     (várias)
//   2. Nível de segurança     (uma, com explicação)
//   3. O que quer proteger    (várias)
//   4. Em quais dispositivos  (várias)
//   5. Como conheceu          (uma)
// O SERVIDOR calcula a recomendação (POST /api/onboarding) e a tela leva
// direto ao plano recomendado. Funciona no modo Mobile e no Web.
// ============================================================
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BellRing, Check, ChevronLeft, Cpu, HardDrive, Lock, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingAPI, handleApiError, type Recomendacao, type RecursoSugerido, type RespostasOnboarding } from '../../services/api';
import { FONTE, GRAD, MAviso, MBotao, MFolha, OndaFundo, useMCores } from '../ui';

import roboVerificado from '../../assets/cody/cody_verificado.webp';
import roboAcenando from '../../assets/cody/cody_acenando.webp';

type Opcao = { id: string; rotulo: string; desc?: string };
type Pergunta = {
  chave: 'usos' | 'nivel' | 'proteger' | 'dispositivos' | 'origem';
  titulo: string;
  sub: string;
  varias: boolean;
  opcoes: Opcao[];
  outro?: 'usos' | 'proteger' | 'origem';
};

const PERGUNTAS: Pergunta[] = [
  {
    chave: 'usos',
    titulo: 'Como você pretende usar o Krypta principalmente?',
    sub: 'Você pode selecionar várias opções.',
    varias: true,
    outro: 'usos',
    opcoes: [
      { id: 'pessoal', rotulo: 'Uso pessoal' },
      { id: 'profissional', rotulo: 'Uso profissional' },
      { id: 'empresarial', rotulo: 'Uso empresarial' },
      { id: 'privacidade', rotulo: 'Privacidade máxima' },
      { id: 'familia', rotulo: 'Proteção familiar' },
      { id: 'heranca', rotulo: 'Herança digital' },
      { id: 'parental', rotulo: 'Controle parental' },
      { id: 'academica', rotulo: 'Segurança acadêmica' },
      { id: 'idosos', rotulo: 'Segurança para idosos' },
      { id: 'outro', rotulo: 'Outro' },
    ],
  },
  {
    chave: 'nivel',
    titulo: 'Qual nível de segurança você deseja?',
    sub: 'Escolha a proteção que melhor equilibra praticidade e controle.',
    varias: false,
    opcoes: [
      { id: 'basico', rotulo: 'Básico', desc: 'Para o dia a dia: cofre cifrado de ponta a ponta, simples e prático.' },
      { id: 'avancado', rotulo: 'Avançado', desc: 'Camadas extras: chave de segurança física, alertas de acesso e proteção reforçada.' },
      { id: 'maximo', rotulo: 'Máximo', desc: 'Tudo do Krypta: chave física, NFC, bloqueio remoto (Kill Switch) e herança digital.' },
      { id: 'personalizado', rotulo: 'Personalizado', desc: 'Você escolhe os recursos de segurança de acordo com a sua rotina.' },
    ],
  },
  {
    chave: 'proteger',
    titulo: 'O que você deseja proteger principalmente?',
    sub: 'Você pode selecionar várias opções.',
    varias: true,
    outro: 'proteger',
    opcoes: [
      { id: 'senhas', rotulo: 'Senhas pessoais' },
      { id: 'bancos', rotulo: 'Contas bancárias' },
      { id: 'redes', rotulo: 'Redes sociais' },
      { id: 'profissionais', rotulo: 'Dados profissionais' },
      { id: 'documentos', rotulo: 'Documentos importantes' },
      { id: 'outro', rotulo: 'Outro' },
    ],
  },
  {
    chave: 'dispositivos',
    titulo: 'Com quais dispositivos você pretende usar o Krypta?',
    sub: 'Assim otimizamos sua experiência em cada um.',
    varias: true,
    opcoes: [
      { id: 'celular', rotulo: 'Celular' },
      { id: 'notebook', rotulo: 'Notebook' },
      { id: 'desktop', rotulo: 'Desktop' },
      { id: 'tablet', rotulo: 'Tablet' },
      { id: 'multiplos', rotulo: 'Múltiplos dispositivos' },
    ],
  },
  {
    chave: 'origem',
    titulo: 'Como conheceu o Krypta?',
    sub: 'Isso nos ajuda a chegar a mais pessoas que buscam segurança digital.',
    varias: false,
    outro: 'origem',
    opcoes: [
      { id: 'redes', rotulo: 'Redes sociais' },
      { id: 'indicacao', rotulo: 'Indicação de amigos' },
      { id: 'escola', rotulo: 'Escola / Faculdade' },
      { id: 'trabalho', rotulo: 'Local de trabalho' },
      { id: 'evento', rotulo: 'Evento de tecnologia' },
      { id: 'outro', rotulo: 'Outro' },
    ],
  },
];

const ICONE_RECURSO: Record<RecursoSugerido, ReactNode> = {
  heranca: <Users className="w-5 h-5" />,
  killSwitch: <AlertTriangle className="w-5 h-5" />,
  dispositivoFisico: <Cpu className="w-5 h-5" />,
  alertasAcesso: <BellRing className="w-5 h-5" />,
  armazenamento: <HardDrive className="w-5 h-5" />,
  cofre: <Lock className="w-5 h-5" />,
};

const VAZIO: RespostasOnboarding = { usos: [], nivel: null, proteger: [], dispositivos: [], origem: null, outros: {}, pulou: false };

export function MOnboarding() {
  const c = useMCores();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState<'intro' | number | 'resultado'>('intro');
  const [r, setR] = useState<RespostasOnboarding>(VAZIO);
  const [folhaPular, setFolhaPular] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recomendacao, setRecomendacao] = useState<Recomendacao | null>(null);

  const primeiroNome = user?.name.trim().split(/\s+/)[0] ?? '';
  const indice = typeof etapa === 'number' ? etapa : 0;
  const p = PERGUNTAS[indice];

  const selecionados = (q: Pergunta): string[] => {
    const v = r[q.chave];
    return Array.isArray(v) ? v : v ? [v] : [];
  };

  const alternar = (q: Pergunta, id: string) => {
    setR((atual) => {
      if (!q.varias) return { ...atual, [q.chave]: (atual[q.chave] as string | null) === id ? null : id };
      const lista = atual[q.chave] as string[];
      return { ...atual, [q.chave]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] };
    });
  };

  const enviar = async (final: RespostasOnboarding) => {
    setErro(null);
    setEnviando(true);
    try {
      const { recomendacao: rec } = await OnboardingAPI.salvar(final);
      await refreshUser().catch(() => undefined);
      if (final.pulou || !rec) {
        navigate('/', { replace: true });
        return;
      }
      setRecomendacao(rec);
      setEtapa('resultado');
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setEnviando(false);
    }
  };

  const avancar = () => {
    if (typeof etapa !== 'number') return;
    if (etapa < PERGUNTAS.length - 1) setEtapa(etapa + 1);
    else enviar(r);
  };

  // ---------------- INTRO ----------------
  if (etapa === 'intro') {
    return (
      <div className="relative min-h-[100dvh] flex flex-col overflow-hidden" style={{ fontFamily: FONTE, background: c.fundo, color: c.texto }}>
        <div className="absolute inset-x-0 top-0 h-[42dvh] overflow-hidden rounded-b-[40px]">
          <OndaFundo />
        </div>
        <div className="relative z-10 h-[42dvh] flex items-end justify-center pb-4">
          <motion.img src={roboAcenando} alt="Robô do Krypta" className="w-40" draggable={false} animate={{ y: [0, -10, 0] }} transition={{ duration: 3.5, repeat: Infinity }} />
        </div>
        <div className="relative z-10 flex-1 px-6 pt-6 flex flex-col" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <h1 className="text-[26px] leading-tight font-semibold">Olá{primeiroNome ? `, ${primeiroNome}` : ''}! Vamos personalizar seu Krypta</h1>
          <p className="text-[13.5px] mt-3" style={{ color: c.suave }}>
            Responda 5 perguntas rápidas e o Krypta recomenda o plano e os recursos certos para você. Suas respostas ficam protegidas e você pode pular quando quiser.
          </p>
          <p className="text-[12px] mt-3 flex items-center gap-1.5" style={{ color: c.roxo }}>
            <Sparkles className="w-4 h-4" /> Leva cerca de 1 minuto
          </p>
          <div className="flex-1" />
          <MBotao onClick={() => setEtapa(0)}>Começar</MBotao>
          <button type="button" onClick={() => setFolhaPular(true)} className="mt-3 text-[13px] underline underline-offset-4" style={{ color: c.suave }}>
            Agora não
          </button>
        </div>
        <FolhaPular aberta={folhaPular} onFechar={() => setFolhaPular(false)} onPular={() => enviar({ ...VAZIO, pulou: true })} enviando={enviando} />
      </div>
    );
  }

  // ---------------- RESULTADO ----------------
  if (etapa === 'resultado' && recomendacao) {
    const pro = recomendacao.plano === 'pro';
    return (
      <div className="relative min-h-[100dvh] overflow-hidden" style={{ fontFamily: FONTE, background: c.fundo, color: c.texto }}>
        <div className="absolute inset-x-0 top-0 h-56 overflow-hidden rounded-b-[40px]">
          <OndaFundo />
        </div>
        <div className="relative z-10 px-6 pt-10 text-white text-center">
          <motion.img src={roboVerificado} alt="" className="w-28 mx-auto" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} draggable={false} />
        </div>
        <div className="relative z-10 px-6 pt-16" style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
          <span className="inline-flex items-center gap-1 text-[11px] px-3 py-1 rounded-full font-bold text-white" style={{ background: GRAD }}>
            <Sparkles className="w-3.5 h-3.5" /> Recomendação para você
          </span>
          <h1 className="text-[26px] leading-tight font-semibold mt-3">{recomendacao.titulo}</h1>
          <p className="text-[13.5px] mt-2" style={{ color: c.suave }}>{recomendacao.resumo}</p>

          <ul className="mt-5 space-y-3">
            {recomendacao.motivos.map((m, k) => (
              <motion.li
                key={k}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + k * 0.1 }}
                className="flex gap-3 rounded-2xl p-3.5"
                style={{ background: c.cartao, border: `1.5px solid ${c.borda}` }}
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.faixa, color: c.roxo }}>{ICONE_RECURSO[m.recurso]}</span>
                <span className="text-[13.5px] leading-snug">{m.texto}</span>
              </motion.li>
            ))}
          </ul>

          <div className="mt-6 space-y-3">
            <MBotao onClick={() => navigate('/plans?recomendado=' + recomendacao.plano, { replace: true })}>
              <ShieldCheck className="w-5 h-5" /> {pro ? 'Ver o Krypta Pro' : 'Ver os planos'}
            </MBotao>
            {recomendacao.dispositivoFisico && (
              <MBotao variante="secundario" onClick={() => navigate('/products')}>
                <Cpu className="w-5 h-5" /> Conhecer o dispositivo Krypta
              </MBotao>
            )}
            <button type="button" onClick={() => navigate('/', { replace: true })} className="w-full text-center text-[13px] underline underline-offset-4 pt-1" style={{ color: c.suave }}>
              Continuar com o {pro ? 'Free por enquanto' : 'Krypta Free'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- PERGUNTAS ----------------
  const sel = selecionados(p);
  const outroMarcado = !!p.outro && sel.includes('outro');
  const textoOutro = p.outro ? r.outros[p.outro] ?? '' : '';

  return (
    <div className="relative min-h-[100dvh] flex flex-col" style={{ fontFamily: FONTE, background: c.fundo, color: c.texto }}>
      <header className="sticky top-0 z-20 px-5 pt-4 pb-3" style={{ background: c.fundo, paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Voltar" onClick={() => setEtapa(indice === 0 ? 'intro' : indice - 1)} className="w-9 h-9 -ml-2 flex items-center justify-center" style={{ color: c.roxo }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button type="button" onClick={() => setFolhaPular(true)} className="text-[13px] font-medium" style={{ color: c.suave }}>
            Pular
          </button>
        </div>
        <p className="text-[13px] font-semibold mt-1" style={{ color: c.roxo }}>{indice + 1}/{PERGUNTAS.length}</p>
        <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: c.faixa }}>
          <motion.div className="h-full rounded-full" style={{ background: GRAD }} animate={{ width: `${((indice + 1) / PERGUNTAS.length) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={indice}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.28 }}
          className="flex-1 px-5 pt-3"
        >
          <h1 className="text-[24px] leading-tight font-semibold">{p.titulo}</h1>
          <p className="text-[13px] mt-2 mb-5" style={{ color: c.suave }}>{p.sub}</p>

          <div className="space-y-2.5">
            {p.opcoes.map((o) => {
              const marcado = sel.includes(o.id);
              return (
                <div key={o.id}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => alternar(p, o.id)}
                    className="w-full text-left px-4 py-3.5 rounded-xl text-[15px] flex items-center justify-between"
                    style={marcado ? { background: GRAD, color: '#fff', boxShadow: '0 6px 18px rgba(97,49,201,0.35)' } : { border: `1.5px solid ${c.borda}`, background: c.cartao }}
                    aria-pressed={marcado}
                  >
                    {o.rotulo}
                    {marcado && <Check className="w-5 h-5" />}
                  </motion.button>
                  <AnimatePresence>
                    {marcado && o.desc && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[12.5px] px-2 pt-2" style={{ color: c.suave }}>
                        {o.desc}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {outroMarcado && p.outro && (
            <div className="mt-4">
              <textarea
                value={textoOutro}
                maxLength={200}
                onChange={(e) => setR((a) => ({ ...a, outros: { ...a.outros, [p.outro!]: e.target.value } }))}
                placeholder="Especifique sua resposta"
                rows={3}
                className="w-full rounded-xl p-3 text-[14px] outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
                style={{ background: c.campo, border: `1.5px solid ${c.borda}`, color: c.texto }}
              />
              <p className="text-right text-[11px]" style={{ color: c.suave }}>{textoOutro.length}/200</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-0 px-5 pt-3" style={{ background: c.fundo, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
        {erro && <div className="mb-3"><MAviso tipo="erro">{erro}</MAviso></div>}
        <MBotao onClick={avancar} carregando={enviando}>
          {indice === PERGUNTAS.length - 1 ? 'Ver minha recomendação' : 'Avançar'}
        </MBotao>
      </div>

      <FolhaPular aberta={folhaPular} onFechar={() => setFolhaPular(false)} onPular={() => enviar({ ...r, pulou: true })} enviando={enviando} />
    </div>
  );
}

function FolhaPular({ aberta, onFechar, onPular, enviando }: { aberta: boolean; onFechar: () => void; onPular: () => void; enviando: boolean }) {
  const c = useMCores();
  return (
    <MFolha aberta={aberta} onFechar={onFechar} titulo="Pular">
      <p className="text-[13.5px] mb-5" style={{ color: c.suave }}>
        Essas respostas ajudam o Krypta a recomendar os recursos de segurança mais adequados ao seu perfil. Se preferir,
        pule agora: você pode ver os planos a qualquer momento em Ajustes.
      </p>
      <MBotao onClick={onPular} carregando={enviando}>Pular</MBotao>
      <button type="button" onClick={onFechar} className="w-full text-center text-[13px] mt-3" style={{ color: c.roxo }}>
        Continuar respondendo
      </button>
    </MFolha>
  );
}
