// src/pages/DownloadApp.tsx
// ============================================================
// BAIXAR O APP (/download) — página pública
//
// O app desktop (Tauri) é o MESMO front do site dentro de uma janela do
// Windows, falando com a MESMA API e o MESMO banco. Por isso conta, plano,
// compras, herança e estado do cofre aparecem iguais nos dois.
// ============================================================
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Cloud, Cpu, Download, Laptop, Monitor, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { DESKTOP_DOWNLOAD_URL, IS_DESKTOP, KRYPTA_VERSION } from '../config/desktop';

import spriteRoboAcenando from '../assets/sprites/sprite_robo_acenando.png';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';
const VERSAO = KRYPTA_VERSION;

const SINCRONIA = [
  { icone: ShieldCheck, titulo: 'Mesma conta', texto: 'Entre com o mesmo e-mail e senha. Plano, compras e perfil são os mesmos.' },
  { icone: Cloud, titulo: 'Mesmo servidor', texto: 'O app conversa com a mesma API e o mesmo banco do site. Nada fica separado.' },
  { icone: RefreshCw, titulo: 'Sempre igual', texto: 'Mudou algo no app? Aparece no site na hora, e o contrário também.' },
];

const COMPARACAO: Array<{ item: string; site: boolean | string; app: boolean | string }> = [
  { item: 'Conta, plano, compras e herança', site: true, app: true },
  { item: 'Cofre zero-knowledge e Kill Switch', site: true, app: true },
  { item: 'Abrir de qualquer computador, sem instalar', site: true, app: false },
  { item: 'Janela própria e atalho na área de trabalho', site: false, app: true },
  { item: 'Funciona sem abrir o navegador', site: false, app: true },
];

const PASSOS = [
  { titulo: 'Baixe o instalador', texto: 'Arquivo Krypta_x64-setup.exe (Windows 10 e 11, 64 bits).' },
  { titulo: 'Execute', texto: 'Se o Windows mostrar "O Windows protegeu o computador", clique em "Mais informações" → "Executar assim mesmo".' },
  { titulo: 'Entre na sua conta', texto: 'Use o mesmo e-mail e senha do site. Pronto: é o mesmo Krypta.' },
];

export function DownloadApp() {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const bright = isDark ? '#a97aff' : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.7)';
  const border = isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.18)';
  const card = {
    background: isDark
      ? 'linear-gradient(160deg, rgba(25,6,55,0.9) 0%, rgba(0,0,0,0.85) 100%)'
      : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,251,0.95) 100%)',
    border: `1px solid ${border}`,
  };

  const Titulo = ({ tag, children }: { tag: string; children: ReactNode }) => (
    <div className="mb-6">
      <p className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: bright }}>{tag}</p>
      <h2 className="text-2xl md:text-3xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>{children}</h2>
    </div>
  );

  const celula = (v: boolean | string) =>
    v ? <Check className="w-5 h-5 mx-auto text-green-500" /> : <X className="w-5 h-5 mx-auto" style={{ color: muted }} />;

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

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 pt-32 pb-12">
        {/* ============ HERO ============ */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 items-center mb-16">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3" style={{ color: bright }}>Krypta para Windows</p>
            <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>
              O mesmo Krypta, agora no seu computador
            </h1>
            <p className="mb-7 max-w-xl" style={{ color: muted }}>
              Mesmo visual, mesma conta e o mesmo cofre do site, numa janela própria com atalho na área de trabalho.
              Tudo continua sincronizado pelo servidor do Krypta.
            </p>

            {IS_DESKTOP ? (
              <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ ...card, borderColor: 'rgba(34,197,94,0.45)' }}>
                <Check className="w-6 h-6 text-green-500 shrink-0" />
                <p className="flex-1 text-sm">Você já está usando o app Krypta para Windows (versão {VERSAO}).</p>
                <Link to={user ? '/device' : '/login'} className="px-4 py-2 rounded-lg text-sm font-bold text-white text-center" style={{ background: GRAD }}>
                  {user ? 'Abrir Meu Krypta' : 'Entrar'}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <a
                  href={DESKTOP_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white transition-transform hover:scale-[1.03]"
                  style={{ background: GRAD, fontFamily: ROUNDED_FONT, boxShadow: '0 0 26px rgba(141,81,255,0.45)' }}
                >
                  <Download className="w-5 h-5" /> Baixar para Windows
                </a>
                <span className="text-xs" style={{ color: muted }}>
                  Versão {VERSAO} · Windows 10 e 11 (64 bits) · gratuito
                </span>
              </div>
            )}
          </div>

          <div className="relative hidden md:flex items-center justify-center h-64">
            <motion.div className="absolute w-56 h-56 rounded-full" style={{ border: `1.5px dashed ${bright}`, opacity: 0.5 }} animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="absolute" animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} style={{ width: 224, height: 224 }}>
              <Monitor className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6" style={{ color: bright }} />
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

        {/* ============ SINCRONIA ============ */}
        <section className="mb-16">
          <Titulo tag="Sincronizado">Site e app são o mesmo Krypta</Titulo>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SINCRONIA.map(({ icone: Icone, titulo, texto }, i) => (
              <motion.div key={titulo} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-2xl p-5" style={card}>
                <Icone className="w-7 h-7 mb-3" style={{ color: bright }} />
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: ROUNDED_FONT }}>{titulo}</h3>
                <p className="text-sm" style={{ color: muted }}>{texto}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 rounded-xl p-4 flex items-start gap-3 text-sm" style={card}>
            <Cpu className="w-5 h-5 shrink-0 mt-0.5" style={{ color: bright }} />
            <p style={{ color: muted }}>
              <strong style={{ color: fg }}>E o dispositivo de software?</strong> A chave do cofre fica guardada onde você pareou
              (no navegador ou no app), como um dispositivo físico. Cada conta tem um dispositivo por vez: o outro lado
              mostra o mesmo cofre, plano e herança, e as ações de emergência continuam disponíveis.
            </p>
          </div>
        </section>

        {/* ============ COMPARAÇÃO ============ */}
        <section className="mb-16">
          <Titulo tag="Site ou app?">Use os dois, do jeito que preferir</Titulo>
          <div className="rounded-2xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  <th className="text-left p-4 font-semibold" style={{ color: muted }}>Recurso</th>
                  <th className="p-4 w-28 font-bold"><Laptop className="w-4 h-4 inline mr-1" />Site</th>
                  <th className="p-4 w-28 font-bold text-white" style={{ background: GRAD }}><Monitor className="w-4 h-4 inline mr-1" />App</th>
                </tr>
              </thead>
              <tbody>
                {COMPARACAO.map((l) => (
                  <tr key={l.item} style={{ borderBottom: `1px solid ${border}` }}>
                    <td className="p-4">{l.item}</td>
                    <td className="p-4 text-center">{celula(l.site)}</td>
                    <td className="p-4 text-center">{celula(l.app)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: muted }}>
            <Smartphone className="w-3.5 h-3.5" /> Versão para celular (PWA) chega numa próxima etapa.
          </p>
        </section>

        {/* ============ INSTALAÇÃO ============ */}
        {!IS_DESKTOP && (
          <section className="mb-6">
            <Titulo tag="Instalação">Pronto em 3 passos</Titulo>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="rounded-2xl p-5" style={card}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mb-3" style={{ background: GRAD }}>{i + 1}</span>
                  <h3 className="font-bold mb-1" style={{ fontFamily: ROUNDED_FONT }}>{p.titulo}</h3>
                  <p className="text-sm" style={{ color: muted }}>{p.texto}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={DESKTOP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white" style={{ background: GRAD, fontFamily: ROUNDED_FONT }}>
                <Download className="w-4 h-4" /> Baixar agora
              </a>
              <Link to="/como-funciona" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold" style={{ border: `1.5px solid ${bright}`, color: bright, fontFamily: ROUNDED_FONT }}>
                Como funciona o cofre <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
