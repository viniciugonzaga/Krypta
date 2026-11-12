import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, MessageCircle, ArrowUpRight, AlertCircle } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { ROUNDED_FONT, LILAC } from '../components/auth/authShared';

// Imagem do robô com interrogação
import spriteRoboDuvida from '../assets/sprites/sprite_robo_interrogacao.png';
// ALTERADO AQUI: Agora importa a imagem .gif do robô acenando
import spriteRoboAcenando from '../assets/sprites/sprite_robo_acenando.png';

// Link do botão "Conversar com o Cody" (troque pela rota/URL do chat)
const CODY_HREF = '#';
const MAX_CHARS = 500;

// ============================================================
// MÁSCARAS
// ============================================================
const fmtDate = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
};

const fmtPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 13);
  let out = '';
  if (d.length > 0) out += `+${d.slice(0, 2)}`;
  if (d.length > 2) out += ` (${d.slice(2, 4)}`;
  if (d.length > 4) out += `) ${d.slice(4, 5)}`;
  if (d.length > 5) out += ` ${d.slice(5, 9)}`;
  if (d.length > 9) out += `-${d.slice(9, 13)}`;
  return out;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

// ============================================================
// PEQUENOS COMPONENTES
// ============================================================
function SectionTitle() {
  const { isDark } = useTheme();
  return (
    <h2
      className="text-3xl md:text-4xl font-bold text-center leading-tight"
      style={{ fontFamily: ROUNDED_FONT, color: isDark ? LILAC : '#3b0090' }}
    >
      Por que o <span style={{ color: '#8d51ff' }}>Krypta</span> existe?
    </h2>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  autoComplete?: string;
}

function UnderlineField({ label, value, onChange, placeholder, type = 'text', inputMode, autoComplete }: FieldProps) {
  const { isDark } = useTheme();
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold mb-1" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent border-b py-1.5 text-xs outline-none transition-colors duration-300 focus:border-[#8d51ff] ${
          isDark
            ? 'border-white/50 text-white placeholder:text-white/35'
            : 'border-black/30 text-[#1a1a1a] placeholder:text-black/35'
        }`}
      />
    </label>
  );
}

// Monitor + celular (traço branco grosso, como no wireframe)
function DevicesIllustration({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 240 200" className="w-full max-w-[260px] h-auto" fill="none" style={{ color }} aria-hidden="true">
      <defs>
        <mask id="devices-cut">
          <rect width="240" height="200" fill="white" />
          <rect x="146" y="56" width="82" height="138" rx="18" fill="black" />
        </mask>
      </defs>
      <g mask="url(#devices-cut)" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="10" width="190" height="130" rx="12" />
        <path d="M80 142v28M128 142v28M56 172h96" />
      </g>
      <g stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="158" y="68" width="58" height="116" rx="12" />
        <path d="M178 82h18" />
        <circle cx="187" cy="168" r="2" fill="currentColor" />
      </g>
    </svg>
  );
}

// ============================================================
// PÁGINA DE CONTATO
// ============================================================
interface FormState {
  name: string;
  birth: string;
  email: string;
  phone: string;
  message: string;
}

const EMPTY_FORM: FormState = { name: '', birth: '', email: '', phone: '', message: '' };

export function Contact() {
  const { isDark } = useTheme();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const textMain = isDark ? '#FFFFFF' : '#1a1a1a';
  const mutedText = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.72)';
  const accent = isDark ? LILAC : '#5100BD';
  const cardBorder = isDark ? 'rgba(110,55,230,0.85)' : 'rgba(81,0,189,0.35)';
  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(8,2,22,0.95) 0%, rgba(20,6,50,0.95) 50%, rgba(48,12,115,0.85) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(238,230,252,0.96) 100%)';
  const cardShadow = isDark ? '0 0 40px rgba(97,49,201,0.3)' : '0 10px 40px rgba(81,0,189,0.1)';

  const canSend =
    form.name.trim().length >= 3 && EMAIL_RE.test(form.email) && form.message.trim().length >= 10 && status !== 'sending';

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (status !== 'idle') setStatus('idle');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (form.name.trim().length < 3) return setError('Informe seu nome completo.');
    if (form.birth && form.birth.length !== 10) return setError('Data de nascimento incompleta (DD/MM/AAAA).');
    if (!EMAIL_RE.test(form.email)) return setError('Informe um e-mail válido.');
    if (form.message.trim().length < 10) return setError('Explique sua dúvida com pelo menos 10 caracteres.');

    setStatus('sending');
    // TODO: trocar pela chamada real da API de contato
    setTimeout(() => {
      setStatus('sent');
      setForm(EMPTY_FORM);
    }, 1200);
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden transition-colors duration-500"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}
    >
      <Navbar />

      <main className="flex-1 w-full pt-32 pb-24 px-4 sm:px-6 md:px-12 relative z-10">
        {/* Brilhos de fundo (só no tema escuro) */}
        {isDark && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-40 right-[5%] w-[500px] h-[500px] rounded-full blur-[140px]"
              style={{ background: 'rgba(97,49,201,0.18)' }}
            />
            <div
              className="absolute top-[55%] left-[4%] w-[420px] h-[420px] rounded-full blur-[140px]"
              style={{ background: 'rgba(81,0,189,0.14)' }}
            />
          </div>
        )}

        <div className="max-w-5xl mx-auto relative flex flex-col gap-24">
          {/* ================= HERO ================= */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-8"
          >
            {/* Texto com colchetes nos cantos (superior direito e inferior esquerdo) */}
            <div className="relative max-w-xl p-7">
              <span
                className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2"
                style={{ borderColor: textMain }}
              />
              <span
                className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2"
                style={{ borderColor: textMain }}
              />

              <h1
                className="text-3xl md:text-5xl font-medium leading-tight mb-4"
                style={{ fontFamily: ROUNDED_FONT, color: textMain }}
              >
                Estamos aqui para proteger o que importa.
              </h1>
              <p className="text-xs md:text-sm leading-relaxed" style={{ color: mutedText }}>
                Tem dúvidas sobre o Krypta, nossos recursos ou planos?
                <br />
                Entre em contato com nossa equipe. Estamos prontos para ajudar você a encontrar a solução ideal para
                sua segurança digital.
              </p>
            </div>

            <img
              src={spriteRoboDuvida}
              alt="Robô Krypta"
              className="w-40 h-40 md:w-56 md:h-56 object-contain justify-self-center md:justify-self-end"
              draggable={false}
            />
          </motion.section>

          {/* ================= POR QUE O KRYPTA EXISTE? (1) ================= */}
          <motion.section {...fadeUp} className="flex flex-col items-center gap-4 text-center">
            <SectionTitle />
            <p className="max-w-3xl text-xs md:text-sm leading-relaxed font-medium" style={{ color: textMain }}>
              Seja para esclarecer dúvidas, conhecer melhor nossas soluções ou compartilhar sugestões, nossa equipe
              está pronta para ajudar. Queremos tornar sua experiência com o Krypta mais simples, segura e intuitiva.
            </p>
          </motion.section>

          {/* ================= ENTRE EM CONTATO ================= */}
          <motion.section
            {...fadeUp}
            className="rounded-lg p-6 md:p-8 flex flex-col gap-6"
            style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(20px)' }}
          >
            <div>
              <h2
                className="text-2xl md:text-3xl font-medium mb-2"
                style={{ fontFamily: ROUNDED_FONT, color: textMain }}
              >
                Entre em contato
              </h2>
              <p className="text-[11px] md:text-xs font-medium max-w-2xl leading-relaxed" style={{ color: textMain }}>
                Preencha os campos abaixo e conte como podemos ajudar. Nossa equipe poderá utilizar seu e-mail e número
                de telefone para responder à solicitação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Formulário */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <UnderlineField
                  label="Nome Completo"
                  placeholder="nome aqui"
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                />
                <UnderlineField
                  label="Data de Nascimento"
                  placeholder="00/00/0000"
                  value={form.birth}
                  onChange={(v) => set('birth')(fmtDate(v))}
                  inputMode="numeric"
                  autoComplete="bday"
                />
                <UnderlineField
                  label="E-mail"
                  placeholder="e-mail aqui"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  inputMode="email"
                  autoComplete="email"
                />
                <UnderlineField
                  label="Telefone"
                  placeholder="+00 (00) 0 0000-0000"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => set('phone')(fmtPhone(v))}
                  inputMode="tel"
                  autoComplete="tel"
                />

                {/* Mensagem: caixa com título, ✓ (enviar) e contador */}
                <div
                  className="rounded-md p-3 flex flex-col gap-2"
                  style={{
                    border: `1px solid ${cardBorder}`,
                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  <div
                    className="flex items-center justify-between border-b pb-1"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)' }}
                  >
                    <span className="text-base" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
                      Mensagem
                    </span>
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      title="Enviar mensagem"
                      aria-label="Enviar mensagem"
                      className="transition-all duration-300 hover:scale-110 disabled:opacity-50"
                      style={{ color: canSend ? '#8d51ff' : mutedText }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    value={form.message}
                    onChange={(e) => set('message')(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Explique sua Dúvida"
                    rows={4}
                    maxLength={MAX_CHARS}
                    className={`w-full bg-transparent resize-none text-[11px] outline-none ${
                      isDark ? 'text-white placeholder:text-white/70' : 'text-[#1a1a1a] placeholder:text-black/55'
                    }`}
                  />
                  <span className="self-end text-[9px]" style={{ color: mutedText }}>
                    {form.message.length}/{MAX_CHARS}
                  </span>
                </div>

                {/* Feedback */}
                {error && (
                  <div
                    className="rounded-md p-2.5 flex items-start gap-2 text-xs"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                {status === 'sending' && (
                  <p className="text-xs" style={{ color: mutedText }}>
                    Enviando...
                  </p>
                )}
                {status === 'sent' && (
                  <p className="text-xs flex items-center gap-2" style={{ color: accent }}>
                    <Check className="w-4 h-4" /> Mensagem enviada! Responderemos em breve.
                  </p>
                )}
              </form>

              {/* Ilustração */}
              <div className="hidden md:flex items-center justify-center">
                <DevicesIllustration color={isDark ? '#FFFFFF' : '#5100BD'} />
              </div>
            </div>
          </motion.section>

          {/* ================= POR QUE O KRYPTA EXISTE? (2) ================= */}
          <motion.section {...fadeUp} className="flex flex-col items-center gap-4 text-center -mt-8">
            <SectionTitle />
            <p className="max-w-3xl text-xs md:text-sm leading-relaxed font-medium" style={{ color: textMain }}>
              Escolha a melhor forma de entrar em contato com o Krypta. Seja para esclarecer dúvidas ou resolver
              questões com mais agilidade, estamos aqui para ajudar você.
            </p>
          </motion.section>

          {/* ================= CODY ================= */}
          <motion.section
            {...fadeUp}
            className="w-full max-w-3xl mx-auto rounded-lg p-6 md:p-7 flex flex-col gap-5 -mt-8"
            style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center gap-3">
              {/* ALTERADO AQUI: Usando o gif do robô acenando */}
              <img src={spriteRoboAcenando} alt="Cody" className="w-12 h-12 object-contain shrink-0" draggable={false} />
              <div>
                <h3
                  className="text-xl md:text-2xl font-medium leading-tight"
                  style={{ fontFamily: ROUNDED_FONT, color: textMain }}
                >
                  Precisa de uma resposta agora?
                </h3>
                <p className="text-[11px] md:text-xs" style={{ color: isDark ? '#a98bf0' : '#5100BD' }}>
                  Conheça o Cody, seu assistente Krypta.
                </p>
              </div>
            </div>

            <p className="text-xs md:text-sm font-medium leading-relaxed" style={{ color: textMain }}>
              Nosso robô de suporte está aqui para ajudar você a encontrar respostas, esclarecer dúvidas e entender
              melhor os recursos do Krypta. Converse com o Cody e encontre a orientação de que precisa de forma rápida e
              prática.
            </p>

            <a
              href={CODY_HREF}
              className="w-full py-3 rounded-md flex items-center justify-center gap-2 text-xs font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #6d3fcf 0%, #8d51ff 100%)',
                boxShadow: isDark ? '0 0 24px rgba(141,81,255,0.35)' : '0 6px 20px rgba(81,0,189,0.25)',
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Conversar com o Cody
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}