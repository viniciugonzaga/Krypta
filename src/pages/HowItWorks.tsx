// src/pages/HowItWorks.tsx
// ============================================================
// COMO FUNCIONA (/como-funciona) — página pública
//
// Explica, para quem ainda não entrou (e para quem já usa):
//   • as 3 peças: conta, cofre e dispositivo
//   • a chave de contingência (CCP) e o Kill Switch
//   • a herança digital (lado do titular e lado do herdeiro)
//   • de onde vem o dispositivo físico (Produtos → Minhas compras → Meu Krypta)
//   • o que muda entre Free e Pro
// e leva cada pessoa para o lugar certo: entrar no cofre, resgatar herança,
// comprar o dispositivo ou ver os planos.
// ============================================================
import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Cloud,
  Cpu,
  Crown,
  KeyRound,
  Lock,
  Package,
  ShieldCheck,
  Truck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getPlanFullName, isProPlan } from '../utils/plan';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';

const PECAS = [
  {
    icone: UserIcon,
    titulo: 'Conta',
    texto: 'Seu login no site (e-mail e senha). Serve para administrar: plano, compras, pareamento e segurança. A senha do site NÃO abre o cofre.',
  },
  {
    icone: Lock,
    titulo: 'Cofre',
    texto: 'Suas senhas, cifradas dentro do dispositivo. O servidor guarda só um backup embaralhado que ele mesmo não consegue abrir. Cada conta tem um cofre.',
  },
  {
    icone: Cpu,
    titulo: 'Dispositivo',
    texto: 'Quem guarda e usa a chave do cofre. Pode ser de software (no navegador/app) ou o Dispositivo Krypta físico, comprado na loja (Pro).',
  },
];

const PASSOS_COFRE = [
  { titulo: 'Crie sua conta', texto: 'Cadastro no site com e-mail e senha.' },
  { titulo: 'Pareie um dispositivo', texto: 'Em "Meu Krypta", escolha software ou um dispositivo comprado. Ele cria um par de chaves e só a chave pública vai ao servidor.' },
  { titulo: 'Guarde sua chave de contingência', texto: 'A Chave de Contingência (32 caracteres) é gerada no seu aparelho e nunca é enviada. É ela que recupera o cofre se você perder o dispositivo.' },
  { titulo: 'Use o cofre', texto: 'Adicione senhas. A cada mudança o dispositivo envia um backup cifrado com número de versão (o servidor recusa versões antigas).' },
];

const PASSOS_DISPOSITIVO = [
  { icone: Package, titulo: 'Compre', texto: 'Em Produtos, com o plano Pro. O pedido fica salvo em "Minhas compras" com o número de série.' },
  { icone: Truck, titulo: 'Receba', texto: 'Quando chegar, confirme o recebimento em "Minhas compras". Ele passa a "Pronto para parear".' },
  { icone: Cpu, titulo: 'Pareie', texto: 'No Meu Krypta, escolha o número de série e gere sua chave de contingência. Pronto: ele protege seu cofre.' },
  { icone: ShieldCheck, titulo: 'Reserva', texto: 'Comprou mais de um? Os outros ficam guardados para vincular depois de um Kill Switch.' },
];

const PLANOS: Array<{ recurso: string; free: boolean | string; pro: boolean | string }> = [
  { recurso: 'Cofre zero-knowledge com dispositivo de software', free: true, pro: true },
  { recurso: 'Recuperação e troca da chave de contingência', free: true, pro: true },
  { recurso: 'Espaço do backup cifrado', free: '64 KB', pro: '1 MB' },
  { recurso: 'Dispositivo Krypta físico', free: false, pro: true },
  { recurso: 'Kill Switch (bloqueio remoto do dispositivo)', free: false, pro: true },
  { recurso: 'Herança digital', free: false, pro: true },
  { recurso: 'Alertas de acesso', free: false, pro: true },
];

const FAQ = [
  {
    p: 'Posso ter mais de um cofre?',
    r: 'Não. Cada conta tem um cofre e um dispositivo pareado por vez. Isso garante que só exista uma fonte da verdade e que o Kill Switch e a herança saibam exatamente o que bloquear. Para cofres separados (ex.: pessoal e trabalho), use contas separadas.',
  },
  {
    p: 'Onde vejo o ID da minha conta?',
    r: 'Em "Meu Krypta", logo abaixo do estado do cofre, com um botão de copiar. Você quase nunca precisa dele: o código de herança já leva o ID dentro do link.',
  },
  {
    p: 'Se eu esquecer a senha do site, perco o cofre?',
    r: 'Não. A senha do site só administra a conta (recupere em "Esqueci a senha"). O cofre é aberto pelo dispositivo ou pela chave de contingência.',
  },
  {
    p: 'E se eu perder o dispositivo E a chave de contingência?',
    r: 'Aí ninguém consegue abrir o cofre, nem o Krypta. É o preço de o servidor não ter a chave. Por isso a chave de contingência deve ser guardada em papel, em lugar seguro.',
  },
  {
    p: 'O herdeiro precisa criar conta?',
    r: 'Não. Ele abre o link de resgate (ou a página de resgate) e o cofre é aberto num dispositivo novo, no navegador dele.',
  },
  {
    p: 'Tem versão para instalar no computador?',
    r: 'Sim: o app Krypta para Windows (menu "Aplicações"). É o mesmo Krypta do site, com a mesma conta, o mesmo plano e o mesmo cofre, tudo sincronizado pelo servidor.',
  },
  {
    p: 'Se eu cancelar o Pro, o que acontece?',
    r: 'O cofre continua funcionando. Recursos Pro ficam travados para novas ações e o limite de espaço volta a 64 KB para os próximos backups.',
  },
];

function Bloco({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45 }}
      className="scroll-mt-28 mb-16"
    >
      {children}
    </motion.section>
  );
}

export function HowItWorks() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const logado = !!user;
  const pro = isProPlan(user?.plan);

  const bright = isDark ? '#a97aff' : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.7)';
  const border = isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.18)';
  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(25,6,55,0.9) 0%, rgba(0,0,0,0.85) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,251,0.95) 100%)';
  const card = { background: cardBg, border: `1px solid ${border}` };

  // Rola até a âncora (#heranca, #planos, ...) quando vier de um link
  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }), 350);
    return () => clearTimeout(t);
  }, [location.hash]);

  const Titulo = ({ tag, children }: { tag: string; children: ReactNode }) => (
    <div className="mb-6">
      <p className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: bright }}>{tag}</p>
      <h2 className="text-2xl md:text-3xl" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>{children}</h2>
    </div>
  );

  const BotaoPrimario = ({ to, children }: { to: string; children: ReactNode }) => (
    <Link to={to} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-transform hover:scale-[1.02]" style={{ background: GRAD, fontFamily: ROUNDED_FONT }}>
      {children}
    </Link>
  );
  const BotaoSecundario = ({ to, children }: { to: string; children: ReactNode }) => (
    <Link to={to} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors" style={{ border: `1.5px solid ${bright}`, color: bright, fontFamily: ROUNDED_FONT }}>
      {children}
    </Link>
  );

  const celula = (v: boolean | string) =>
    typeof v === 'string' ? (
      <span className="font-semibold">{v}</span>
    ) : v ? (
      <Check className="w-5 h-5 mx-auto" style={{ color: '#22c55e' }} />
    ) : (
      <X className="w-5 h-5 mx-auto" style={{ color: muted }} />
    );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: fg }}>
      <Navbar />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[180px]" style={{ background: `${bright}2e` }} />
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[160px]" style={{ background: `${bright}22` }} />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 pt-32 pb-12">
        {/* ============ HERO ============ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3" style={{ color: bright }}>Como funciona</p>
          <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>
            Um cofre que nem o Krypta consegue abrir
          </h1>
          <p className="max-w-2xl mx-auto mb-8" style={{ color: muted }}>
            Suas senhas são cifradas dentro do seu dispositivo. O servidor guarda só um backup embaralhado, ajuda a
            parear, bloquear e transmitir o cofre, mas nunca tem a chave.
          </p>

          {logado ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <BotaoPrimario to="/device"><Lock className="w-4 h-4" /> Abrir Meu Krypta</BotaoPrimario>
              {!pro && <BotaoSecundario to="/services#planos"><Crown className="w-4 h-4" /> Conhecer o Pro</BotaoSecundario>}
              {pro && <BotaoSecundario to="/compras"><Package className="w-4 h-4" /> Minhas compras</BotaoSecundario>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
              <div className="rounded-2xl p-5" style={card}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: GRAD }}>
                  <Lock className="w-5 h-5 text-white" />
                </span>
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: ROUNDED_FONT }}>Quero usar meu cofre</h3>
                <p className="text-sm mb-4" style={{ color: muted }}>
                  Entre (ou crie a conta grátis) para parear um dispositivo e guardar suas senhas.
                </p>
                <div className="flex flex-wrap gap-2">
                  <BotaoPrimario to="/login">Entrar</BotaoPrimario>
                  <BotaoSecundario to="/register">Criar conta</BotaoSecundario>
                </div>
              </div>
              <div className="rounded-2xl p-5" style={card}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: GRAD }}>
                  <Users className="w-5 h-5 text-white" />
                </span>
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: ROUNDED_FONT }}>Recebi um código de herança</h3>
                <p className="text-sm mb-4" style={{ color: muted }}>
                  Não precisa de conta. Abra o link de resgate ou cole o código que o titular deixou.
                </p>
                <BotaoPrimario to="/heranca">Resgatar herança <ArrowRight className="w-4 h-4" /></BotaoPrimario>
              </div>
            </div>
          )}
        </motion.div>

        {/* ============ AS 3 PEÇAS ============ */}
        <Bloco id="pecas">
          <Titulo tag="O básico">Três peças, cada uma com um papel</Titulo>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PECAS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl p-5" style={card}>
                <Icone className="w-7 h-7 mb-3" style={{ color: bright }} />
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: ROUNDED_FONT }}>{titulo}</h3>
                <p className="text-sm" style={{ color: muted }}>{texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl p-4 flex items-start gap-3 text-sm" style={{ ...card }}>
            <Cloud className="w-5 h-5 shrink-0 mt-0.5" style={{ color: bright }} />
            <p style={{ color: muted }}>
              <strong style={{ color: fg }}>O que o servidor tem:</strong> sua conta, a chave pública do dispositivo e o
              backup cifrado. <strong style={{ color: fg }}>O que ele nunca tem:</strong> suas senhas, a chave de contingência e a chave do herdeiro.
            </p>
          </div>
        </Bloco>

        {/* ============ PASSO A PASSO DO COFRE ============ */}
        <Bloco id="cofre">
          <Titulo tag="Cofre">Do cadastro ao cofre protegido</Titulo>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PASSOS_COFRE.map((p, i) => (
              <li key={p.titulo} className="rounded-2xl p-5 relative" style={card}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mb-3" style={{ background: GRAD }}>{i + 1}</span>
                <h3 className="font-bold mb-1" style={{ fontFamily: ROUNDED_FONT }}>{p.titulo}</h3>
                <p className="text-sm" style={{ color: muted }}>{p.texto}</p>
              </li>
            ))}
          </ol>
        </Bloco>

        {/* ============ DISPOSITIVO FÍSICO ============ */}
        <Bloco id="dispositivo">
          <Titulo tag="Dispositivo">De onde vem o dispositivo que você liga no cofre</Titulo>
          <p className="text-sm mb-5 max-w-3xl" style={{ color: muted }}>
            No plano Free o dispositivo é de software. No Pro você pode usar o Dispositivo Krypta físico: a compra fica
            registrada na sua conta e cada unidade tem um número de série. Só unidades suas, já recebidas, podem ser pareadas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PASSOS_DISPOSITIVO.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl p-5" style={card}>
                <Icone className="w-6 h-6 mb-2" style={{ color: bright }} />
                <h3 className="font-bold mb-1" style={{ fontFamily: ROUNDED_FONT }}>{titulo}</h3>
                <p className="text-sm" style={{ color: muted }}>{texto}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <BotaoSecundario to="/products">Ver o dispositivo</BotaoSecundario>
            {logado && <BotaoSecundario to="/compras">Minhas compras</BotaoSecundario>}
          </div>
        </Bloco>

        {/* ============ chave de contingência + KILL SWITCH ============ */}
        <Bloco id="kill-switch">
          <Titulo tag="Segurança">Perdeu o dispositivo? Você ainda manda no cofre</Titulo>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={card}>
              <KeyRound className="w-6 h-6 mb-2" style={{ color: bright }} />
              <h3 className="font-bold text-lg mb-1" style={{ fontFamily: ROUNDED_FONT }}>Chave de Contingência</h3>
              <p className="text-sm" style={{ color: muted }}>
                Gerada no pareamento, aparece uma vez. Com ela você recupera o cofre neste ou em outro dispositivo e pode
                trocá-la quando quiser (a antiga para de funcionar). Disponível em todos os planos.
              </p>
            </div>
            <div className="rounded-2xl p-5" style={card}>
              <AlertCircle className="w-6 h-6 mb-2" style={{ color: '#f87171' }} />
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
                Kill Switch <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: GRAD }}>PRO</span>
              </h3>
              <p className="text-sm" style={{ color: muted }}>
                Prova com a chave de contingência que é você, e o dispositivo perdido é banido na hora: ele não entra mais. Depois você
                vincula um dispositivo novo (outro comprado ou de software) e o cofre é restaurado do backup.
              </p>
            </div>
          </div>
        </Bloco>

        {/* ============ HERANÇA ============ */}
        <Bloco id="heranca">
          <Titulo tag="Herança digital">Seu cofre chega a quem você escolher</Titulo>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={card}>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
                <UserIcon className="w-5 h-5" style={{ color: bright }} /> Você (titular, Pro)
              </h3>
              <ol className="space-y-2 text-sm" style={{ color: muted }}>
                <li><strong style={{ color: fg }}>1.</strong> Em Meu Krypta → Herança digital, ative com a sua chave de contingência.</li>
                <li><strong style={{ color: fg }}>2.</strong> É gerado o <strong style={{ color: fg }}>código de herança</strong>: um arquivo com um link pronto e a chave do herdeiro.</li>
                <li><strong style={{ color: fg }}>3.</strong> Entregue o código de herança a quem você confia (impresso, num envelope, com o advogado...).</li>
                <li><strong style={{ color: fg }}>4.</strong> Mudou de ideia? Desative: o código de herança antigo deixa de valer.</li>
              </ol>
            </div>
            <div className="rounded-2xl p-5" style={card}>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ fontFamily: ROUNDED_FONT }}>
                <Users className="w-5 h-5" style={{ color: bright }} /> O herdeiro (sem conta)
              </h3>
              <ol className="space-y-2 text-sm" style={{ color: muted }}>
                <li><strong style={{ color: fg }}>1.</strong> Abre o link de resgate. O ID da conta e a chave já vêm preenchidos.</li>
                <li><strong style={{ color: fg }}>2.</strong> Sem o link? Entra em Krypta → Como funciona → "Recebi um código de herança" e cola o código.</li>
                <li><strong style={{ color: fg }}>3.</strong> Clica em Resgatar: um dispositivo novo é criado no navegador dele e o cofre abre.</li>
                <li><strong style={{ color: fg }}>4.</strong> O dispositivo do titular é revogado e ele recebe um e-mail. A chave do herdeiro vale uma vez.</li>
              </ol>
              <div className="mt-4">
                <BotaoPrimario to="/heranca">Resgatar herança <ArrowRight className="w-4 h-4" /></BotaoPrimario>
              </div>
            </div>
          </div>
        </Bloco>

        {/* ============ PLANOS ============ */}
        <Bloco id="planos">
          <Titulo tag="Planos">O que muda entre Free e Pro</Titulo>
          <div className="rounded-2xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  <th className="text-left p-4 font-semibold" style={{ color: muted }}>Recurso</th>
                  <th className="p-4 w-28 font-bold">Free</th>
                  <th className="p-4 w-28 font-bold text-white" style={{ background: GRAD }}>Pro</th>
                </tr>
              </thead>
              <tbody>
                {PLANOS.map((l) => (
                  <tr key={l.recurso} style={{ borderBottom: `1px solid ${border}` }}>
                    <td className="p-4">{l.recurso}</td>
                    <td className="p-4 text-center">{celula(l.free)}</td>
                    <td className="p-4 text-center">{celula(l.pro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            {logado && <span className="text-sm" style={{ color: muted }}>Seu plano: <strong style={{ color: fg }}>{getPlanFullName(user?.plan)}</strong></span>}
            {!pro && <BotaoPrimario to="/services#planos"><Crown className="w-4 h-4" /> Assinar o Pro</BotaoPrimario>}
          </div>
        </Bloco>

        {/* ============ FAQ ============ */}
        <Bloco id="perguntas">
          <Titulo tag="Dúvidas">Perguntas frequentes</Titulo>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.p} className="rounded-xl p-4 group" style={card}>
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between gap-3">
                  {f.p}
                  <ArrowRight className="w-4 h-4 transition-transform group-open:rotate-90 shrink-0" style={{ color: bright }} />
                </summary>
                <p className="text-sm mt-3" style={{ color: muted }}>{f.r}</p>
              </details>
            ))}
          </div>
        </Bloco>
      </main>
      <Footer />
    </div>
  );
}
