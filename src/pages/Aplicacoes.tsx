// src/pages/Aplicacoes.tsx
// ============================================================
// APLICAÇÕES (/aplicacoes) — no menu principal, logado ou não
//
// • Windows: botão que baixa o instalador NA HORA (link direto da última
//   versão publicada no GitHub Releases, ver src/config/desktop.ts).
// • Celular (PWA): instala pelo navegador. Android abre a janela do sistema;
//   iPhone mostra o caminho (Compartilhar → Adicionar à Tela de Início);
//   no computador aparece um QR code para abrir esta página no celular.
// • Navegador: o próprio site.
//
// Site, app e (em breve) celular usam a mesma conta, a mesma API e o
// mesmo banco: tudo sincronizado.
// ============================================================
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Clock,
  Cloud,
  Download,
  Globe,
  Loader2,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Share,
  SquarePlus,
  Smartphone,
  EllipsisVertical,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  DESKTOP_DOWNLOAD_URL,
  GITHUB_REPO,
  IS_DESKTOP,
  KRYPTA_VERSION,
  NOME_INSTALADOR,
  SITE_URL,
  buscarUltimaVersao,
  detectarSistema,
  type VersaoPublicada,
} from '../config/desktop';

import { aoMudarPwa, foiInstalado, instalarPwa, podeInstalar } from '../config/pwa';
import spriteRoboAcenando from '../assets/cody/cody_acenando.webp';
import { Dica } from '../components/Dica';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';

const SINCRONIA = [
  { icone: ShieldCheck, titulo: 'Mesma conta', texto: 'O mesmo e-mail e senha em todos. Plano, compras e perfil iguais.' },
  { icone: Cloud, titulo: 'Mesmo servidor', texto: 'Todos falam com a mesma API e o mesmo banco do Krypta.' },
  { icone: RefreshCw, titulo: 'Sempre sincronizado', texto: 'Mudou num lugar, aparece nos outros na hora.' },
];

const PASSOS_WINDOWS = [
  { titulo: 'Clique em "Baixar"', texto: `O arquivo ${NOME_INSTALADOR} vai para a pasta Downloads.` },
  { titulo: 'Abra o arquivo', texto: 'Se aparecer "O Windows protegeu o computador": "Mais informações" → "Executar assim mesmo".' },
  { titulo: 'Entre na sua conta', texto: 'O Krypta abre sozinho e cria um atalho na área de trabalho.' },
];

type EstadoVersao = 'carregando' | 'pronta' | 'sem-versao' | 'desconhecida';

export function Aplicacoes() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const sistema = detectarSistema();

  const [versao, setVersao] = useState<VersaoPublicada | null>(null);
  const [estado, setEstado] = useState<EstadoVersao>(IS_DESKTOP ? 'desconhecida' : 'carregando');
  const [baixou, setBaixou] = useState(false);

  // App de celular (PWA): o navegador avisa quando dá para instalar
  const [pwa, setPwa] = useState(() => ({ pode: podeInstalar(), instalado: foiInstalado() }));
  const [instalando, setInstalando] = useState(false);
  useEffect(() => aoMudarPwa(() => setPwa({ pode: podeInstalar(), instalado: foiInstalado() })), []);
  const noCelular = sistema === 'android' || sistema === 'ios';
  const linkCelular = SITE_URL ? `${SITE_URL}/aplicacoes` : null;
  // O celular só instala com HTTPS: endereço local (localhost / IP da rede) não serve para o QR code
  const linkCelularValido = !!linkCelular && linkCelular.startsWith('https://');

  useEffect(() => {
    if (IS_DESKTOP) return;
    buscarUltimaVersao().then((v) => {
      if (v === null) setEstado('sem-versao');
      else if (v === undefined) setEstado('desconhecida');
      else {
        setVersao(v);
        setEstado('pronta');
      }
    });
  }, []);

  const bright = isDark ? '#a97aff' : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.7)';
  const border = isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.18)';
  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(25,6,55,0.9) 0%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,251,0.95) 100%)';
  const card = { background: cardBg, border: `1px solid ${border}` };

  const urlDownload = versao?.url ?? DESKTOP_DOWNLOAD_URL;
  const podeBaixar = !IS_DESKTOP && (estado === 'pronta' || estado === 'desconhecida');

  // ---------- peças ----------
  const Selo = ({ children, cor }: { children: ReactNode; cor: string }) => (
    <span className="inline-flex items-center gap-1 text-[10.5px] px-2.5 py-1 rounded-full font-bold" style={{ background: `${cor}22`, border: `1px solid ${cor}66`, color: cor }}>
      {children}
    </span>
  );

  const BotaoWindows = ({ grande }: { grande?: boolean }) =>
    IS_DESKTOP ? (
      <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold" style={{ border: '1px solid rgba(34,197,94,0.5)', color: '#22c55e' }}>
        <Check className="w-5 h-5" /> Você está usando o app (v{KRYPTA_VERSION})
      </span>
    ) : estado === 'carregando' ? (
      <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold" style={{ border: `1px solid ${border}`, color: muted }}>
        <Loader2 className="w-5 h-5 animate-spin" /> Procurando a versão mais nova...
      </span>
    ) : !podeBaixar ? (
      <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold" style={{ border: `1px dashed ${border}`, color: muted }}>
        <Clock className="w-5 h-5" /> Primeira versão em preparação
      </span>
    ) : (
      <motion.a
        href={urlDownload}
        download={NOME_INSTALADOR}
        onClick={() => setBaixou(true)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold text-white ${grande ? 'px-7 py-4 text-lg' : 'px-5 py-3'}`}
        style={{ background: GRAD, fontFamily: ROUNDED_FONT, boxShadow: '0 0 28px rgba(141,81,255,0.5)' }}
      >
        <Download className={grande ? 'w-6 h-6' : 'w-5 h-5'} /> Baixar para Windows
      </motion.a>
    );

  // ---------- ações do app de celular, conforme o aparelho ----------
  const Passos = ({ itens }: { itens: Array<{ icone: ReactNode; texto: ReactNode }> }) => (
    <ol className="space-y-2 text-sm">
      {itens.map((p, i) => (
        <li key={i} className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: GRAD }}>{i + 1}</span>
          <span className="shrink-0" style={{ color: bright }}>{p.icone}</span>
          <span>{p.texto}</span>
        </li>
      ))}
    </ol>
  );

  const AcoesCelular = ({ grande }: { grande?: boolean }) => {
    if (pwa.instalado) {
      return (
        <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold self-start" style={{ border: '1px solid rgba(34,197,94,0.5)', color: '#22c55e' }}>
          <Check className="w-5 h-5" /> Instalado: abra pelo ícone Krypta
        </span>
      );
    }
    if (pwa.pode) {
      return (
        <motion.button
          type="button"
          disabled={instalando}
          onClick={async () => {
            setInstalando(true);
            await instalarPwa().catch(() => false);
            setInstalando(false);
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold text-white self-start disabled:opacity-60 ${grande ? 'px-7 py-4 text-lg' : 'px-5 py-3'}`}
          style={{ background: GRAD, fontFamily: ROUNDED_FONT, boxShadow: '0 0 28px rgba(141,81,255,0.5)' }}
        >
          {instalando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className={grande ? 'w-6 h-6' : 'w-5 h-5'} />}
          {noCelular ? 'Instalar no celular' : 'Instalar neste computador'}
        </motion.button>
      );
    }
    if (sistema === 'ios') {
      return (
        <div className="rounded-xl p-4" style={card}>
          <p className="text-sm font-semibold mb-3">No iPhone, pelo Safari:</p>
          <Passos
            itens={[
              { icone: <Share className="w-4 h-4" />, texto: <>Toque em <strong>Compartilhar</strong> (quadrado com seta, embaixo)</> },
              { icone: <SquarePlus className="w-4 h-4" />, texto: <>Escolha <strong>Adicionar à Tela de Início</strong></> },
              { icone: <Check className="w-4 h-4" />, texto: <>Toque em <strong>Adicionar</strong>. Pronto!</> },
            ]}
          />
        </div>
      );
    }
    if (sistema === 'android') {
      return (
        <div className="rounded-xl p-4" style={card}>
          <p className="text-sm font-semibold mb-3">No Android, pelo Chrome:</p>
          <Passos
            itens={[
              { icone: <EllipsisVertical className="w-4 h-4" />, texto: <>Toque no menu <strong>⋮</strong> (canto de cima)</> },
              { icone: <SquarePlus className="w-4 h-4" />, texto: <>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></> },
              { icone: <Check className="w-4 h-4" />, texto: <>Confirme. O ícone Krypta aparece na tela inicial</> },
            ]}
          />
        </div>
      );
    }
    // Computador: QR code para abrir esta página no celular
    return linkCelularValido ? (
      <div className="flex items-center gap-4">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(linkCelular!)}`}
          alt="QR code para abrir o Krypta no celular"
          width={112}
          height={112}
          className="rounded-lg bg-white p-1 shrink-0"
        />
        <p className="text-xs" style={{ color: muted }}>
          Aponte a câmera do celular para o código. A página abre no celular com o botão de instalar.
        </p>
      </div>
    ) : (
      <p className="text-xs rounded-lg p-3" style={{ border: `1px dashed ${border}`, color: muted }}>
        Abra este site no navegador do celular e entre em <strong style={{ color: fg }}>Aplicações</strong> para instalar.
        {!window.isSecureContext && ' (A instalação no celular precisa do site com HTTPS, depois da hospedagem.)'}
      </p>
    );
  };

  const infoVersao =
    estado === 'pronta' && versao
      ? `Versão ${versao.versao}${versao.tamanhoMB ? ` · ${versao.tamanhoMB} MB` : ''} · ${new Date(versao.publicadaEm).toLocaleDateString('pt-BR')}`
      : 'Windows 10 e 11 (64 bits) · gratuito';

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: fg }}>
      <Navbar />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <motion.div
          className="absolute top-[-10%] left-[-10%] w-[620px] h-[620px] rounded-full blur-[180px]"
          style={{ background: `${bright}30` }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="absolute bottom-[5%] right-[-10%] w-[520px] h-[520px] rounded-full blur-[170px]" style={{ background: `${bright}22` }} />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 pt-32 pb-12">
        <Dica id="aplicacoes-conta" titulo="Uma conta, todos os aparelhos" pergunta="Tem app para celular?" className="mb-8">
          Site, celular e Windows usam a <strong>mesma conta</strong>. O cofre fica no aparelho que você pareou{user ? '' : ' (depois de criar a conta)'}; nos outros, abra com o PIN (Pro). O app do celular e o do Windows se atualizam a cada versão nova.
        </Dica>
        {/* ============ HERO ============ */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 items-center mb-14">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3" style={{ color: bright }}>Aplicações</p>
            <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>
              O Krypta onde você estiver
            </h1>
            <p className="mb-7 max-w-xl" style={{ color: muted }}>
              No navegador, no computador e, em breve, no celular. A mesma conta e o mesmo cofre, sempre sincronizados.
            </p>

            {sistema === 'windows' || IS_DESKTOP ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <BotaoWindows grande />
                {!IS_DESKTOP && <span className="text-xs" style={{ color: muted }}>{infoVersao}</span>}
              </div>
            ) : noCelular ? (
              <AcoesCelular grande />
            ) : (
              <div className="rounded-xl p-4 inline-flex items-center gap-3" style={card}>
                <Monitor className="w-6 h-6" style={{ color: bright }} />
                <p className="text-sm">
                  O app desktop é para Windows. Em {sistema === 'mac' ? 'Mac' : 'Linux'}, use o Krypta pelo navegador.
                </p>
              </div>
            )}

            {/* Depois do clique: o que fazer com o arquivo */}
            <AnimatePresence>
              {baixou && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-xl p-4 text-sm max-w-xl"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.4)' }}
                >
                  <p className="font-semibold flex items-center gap-2" style={{ color: '#22c55e' }}>
                    <Check className="w-4 h-4" /> Download iniciado!
                  </p>
                  <p className="mt-1" style={{ color: muted }}>
                    Abra o <strong style={{ color: fg }}>{NOME_INSTALADOR}</strong> na barra de downloads do navegador (ou na pasta Downloads).
                    Se o Windows avisar, clique em "Mais informações" → "Executar assim mesmo".
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative hidden md:flex items-center justify-center h-64">
            <motion.div className="absolute w-56 h-56 rounded-full" style={{ border: `1.5px dashed ${bright}`, opacity: 0.5 }} animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="absolute" animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} style={{ width: 224, height: 224 }}>
              <Monitor className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6" style={{ color: bright }} />
              <Smartphone className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6" style={{ color: bright }} />
              <Globe className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6" style={{ color: bright }} />
            </motion.div>
            <motion.img
              src={spriteRoboAcenando}
              alt="Robô do Krypta acenando"
              draggable={false}
              className="relative w-36 select-none"
              style={{ filter: `drop-shadow(0 0 24px ${bright}AA)` }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.section>

        {/* ============ PLATAFORMAS ============ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          {/* Windows */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl p-6 flex flex-col" style={{ ...card, borderColor: bright, boxShadow: `0 0 30px ${bright}33` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: GRAD }}>
                <Monitor className="w-6 h-6 text-white" />
              </span>
              <Selo cor="#22c55e">{IS_DESKTOP ? 'INSTALADO' : 'DISPONÍVEL'}</Selo>
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: ROUNDED_FONT }}>Windows</h2>
            <p className="text-sm mt-1 mb-4 flex-1" style={{ color: muted }}>
              App com janela própria e atalho na área de trabalho. {infoVersao}.
            </p>
            <BotaoWindows />
          </motion.div>

          {/* Celular */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="rounded-2xl p-6 flex flex-col" style={noCelular ? { ...card, borderColor: bright, boxShadow: `0 0 30px ${bright}33` } : card}>
            <div className="flex items-center justify-between mb-3">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={noCelular ? { background: GRAD } : { border: `1px solid ${border}` }}>
                <Smartphone className="w-6 h-6" style={{ color: noCelular ? '#fff' : bright }} />
              </span>
              <Selo cor="#22c55e">{pwa.instalado ? 'INSTALADO' : 'DISPONÍVEL'}</Selo>
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: ROUNDED_FONT }}>Android e iPhone</h2>
            <p className="text-sm mt-1 mb-4" style={{ color: muted }}>
              Instala direto do navegador, sem loja e sem ocupar quase nada. Ganha ícone na tela inicial e abre em tela cheia.
            </p>
            <div className="flex-1 flex flex-col justify-end">
              <AcoesCelular />
            </div>
          </motion.div>

          {/* Navegador */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="rounded-2xl p-6 flex flex-col" style={card}>
            <div className="flex items-center justify-between mb-3">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ border: `1px solid ${border}` }}>
                <Globe className="w-6 h-6" style={{ color: bright }} />
              </span>
              <Selo cor={bright}>{IS_DESKTOP ? 'NA WEB' : 'VOCÊ ESTÁ AQUI'}</Selo>
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: ROUNDED_FONT }}>Navegador</h2>
            <p className="text-sm mt-1 mb-4 flex-1" style={{ color: muted }}>
              Funciona em qualquer computador ou celular, sem instalar nada.
            </p>
            <Link to={user ? '/device' : '/login'} className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: bright }}>
              {user ? 'Abrir Meu Krypta' : 'Entrar na minha conta'} <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </section>

        {/* ============ SINCRONIA ============ */}
        <section className="mb-14">
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: bright }}>Sincronizado</p>
          <h2 className="text-2xl md:text-3xl mb-6" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>Um Krypta só, em todo lugar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SINCRONIA.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl p-5" style={card}>
                <Icone className="w-7 h-7 mb-3" style={{ color: bright }} />
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: ROUNDED_FONT }}>{titulo}</h3>
                <p className="text-sm" style={{ color: muted }}>{texto}</p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4 max-w-3xl" style={{ color: muted }}>
            A chave do dispositivo de software fica onde você pareou (navegador ou app), como um dispositivo físico.
            Conta, plano, compras e herança aparecem iguais em todos.
          </p>
        </section>

        {/* ============ COMO INSTALAR ============ */}
        {!IS_DESKTOP && (
          <section>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: bright }}>Windows</p>
            <h2 className="text-2xl md:text-3xl mb-6" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>Instale em 3 passos</h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PASSOS_WINDOWS.map((p, i) => (
                <li key={p.titulo} className="rounded-2xl p-5" style={card}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mb-3" style={{ background: GRAD }}>{i + 1}</span>
                  <h3 className="font-bold mb-1" style={{ fontFamily: ROUNDED_FONT }}>{p.titulo}</h3>
                  <p className="text-sm" style={{ color: muted }}>{p.texto}</p>
                </li>
              ))}
            </ol>
            <p className="text-xs mt-4" style={{ color: muted }}>
              O download não começou?{' '}
              <a href={`https://github.com/${GITHUB_REPO}/releases/latest`} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: bright }}>
                Baixe pela página de versões
              </a>
              .
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
