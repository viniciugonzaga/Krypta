import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext'; // Importação necessária
import { Check, CreditCard, QrCode, ArrowLeft, AlertCircle } from 'lucide-react';
import { ROUNDED_FONT, LILAC, AppleIcon } from '../components/auth/authShared';

import spriteRoboAbraco from '../assets/sprites/sprite_robo_abraco.gif';

const BASE_FEATURES = [
  'Cofre de credenciais',
  'Senha Mestre',
  'Gerenciamento de credenciais',
  'Aplicativo Krypta',
];

const PLAN_FEATURES: Record<string, string[]> = {
  essential: [
    'Cofre de credenciais',
    'Senha Mestre',
    'Criptografia AES-256-GCM',
    'Gerenciamento de credenciais',
    'Aplicativo Krypta',
  ],
  advanced: [
    ...BASE_FEATURES,
    'Autenticação multifator',
    'Chave de segurança física',
    'Alertas de acesso',
    'Proteção reforçada',
  ],
  max: [
    'Cofre de credenciais',
    'Senha Mestre',
    'Gerenciamento de credenciais',
    'Aplicativo Krypta',
    'Autenticação multifator',
    'Alertas de acesso',
    'Bloqueio remoto',
    'Verificações rigorosas de acesso',
    'Recursos de emergência',
    'Herança Digital',
  ],
  custom: [
    'Escolha os métodos de autenticação',
    'Defina os recursos de segurança',
    'Adapte o Krypta às suas necessidades',
    'Personalize o nível de proteção',
  ],
};

const PixIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12 1.5 9.5 4 12 6.5 14.5 4 12 1.5ZM4 9.5 1.5 12 4 14.5 6.5 12 4 9.5ZM20 9.5 17.5 12 20 14.5 22.5 12 20 9.5ZM12 17.5 9.5 20 12 22.5 14.5 20 12 17.5Z" />
  </svg>
);

const chipBase = 'w-[30px] h-[19px] rounded-[3px] flex items-center justify-center shrink-0';

const VisaChip = () => (
  <div className={`${chipBase} text-[8px] font-extrabold italic text-white`} style={{ background: '#1a4fc4' }}>
    VISA
  </div>
);

const MasterChip = () => (
  <div className={chipBase} style={{ background: '#1b1b1b' }}>
    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#eb001b' }} />
    <span className="w-2.5 h-2.5 rounded-full -ml-1" style={{ background: '#f79e1b' }} />
  </div>
);

const AmexChip = () => (
  <div className={`${chipBase} text-[6.5px] font-bold text-white`} style={{ background: '#2e8bd0' }}>
    AMEX
  </div>
);

const DiscoverChip = () => (
  <div className={`${chipBase} text-[5px] font-bold`} style={{ background: '#f1f1f1', color: '#333' }}>
    DISCOVER
  </div>
);

const fmtCard = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const fmtCvv = (v: string) => v.replace(/\D/g, '').slice(0, 4);

export function Checkout() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { changePlan } = useAuth(); // Pega a função que realmente salva no banco

  const state = location.state as { plan?: any; isAnnual?: boolean } | null;
  const plan = state?.plan;
  const isAnnual = state?.isAnnual || false;

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [saveDetails, setSaveDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Para capturar erros do backend
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const textMain = isDark ? '#FFFFFF' : '#1a1a1a';
  const mutedText = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.65)';
  const accent = isDark ? LILAC : '#5100BD';
  const link = '#8d51ff';

  if (!plan) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}
      >
        <div className="text-center">
          <p className="mb-4" style={{ color: textMain }}>
            Nenhum plano selecionado.
          </p>
          <button
            onClick={() => navigate('/services')}
            className="px-6 py-2 rounded-lg text-white"
            style={{ background: '#5100BD' }}
          >
            Voltar para Serviços
          </button>
        </div>
      </div>
    );
  }

  const features = PLAN_FEATURES[plan.tier] || PLAN_FEATURES.max;
  const planTitle = String(plan.name).toLowerCase().startsWith('krypta') ? plan.name : `Krypta ${plan.name}`;

  const fieldBorder = isDark ? 'rgba(110,55,230,0.7)' : 'rgba(81,0,189,0.35)';
  const fieldStyle = {
    background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${fieldBorder}`,
    boxShadow: isDark ? '0 0 12px rgba(97,49,201,0.25)' : 'none',
    color: textMain,
  };
  const fieldClass = `w-full py-3 px-4 rounded-md text-xs outline-none transition-all duration-300 focus:ring-2 focus:ring-purple-500/50 ${
    isDark ? 'placeholder:text-white/85' : 'placeholder:text-black/50'
  }`;

  const payBtnStyle = {
    background: '#5100BD',
    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.92)' : '#3b0090'}`,
    boxShadow: isDark ? '0 0 18px rgba(97,49,201,0.35)' : '0 4px 14px rgba(81,0,189,0.25)',
  };

  const cardBg = isDark
    ? 'linear-gradient(180deg, rgba(8,2,20,0.92) 0%, rgba(18,5,44,0.92) 55%, rgba(52,14,128,0.8) 100%)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,234,252,0.95) 100%)';
  const cardBorder = isDark ? 'rgba(120,64,240,0.75)' : 'rgba(81,0,189,0.3)';

  // ---------------------------------------------------------
  // CORREÇÃO AQUI: Chamada real para o backend
  // ---------------------------------------------------------
  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Chama a API, salva no banco e atualiza o AuthContext global
      await changePlan(plan.tier);
      
      // Se chegar aqui, o banco foi atualizado com sucesso
      navigate('/profile');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao processar sua assinatura. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { id: 'card' as const, label: 'Cartão', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'pix' as const, label: 'PIX', icon: <PixIcon size={13} /> },
  ];

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden transition-colors duration-500"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}
    >
      <Navbar />

      <main className="flex-1 w-full pt-32 pb-24 px-4 sm:px-6 md:px-12 relative z-10">
        {isDark && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-20 right-[6%] w-[520px] h-[520px] rounded-full blur-[140px]"
              style={{ background: 'rgba(97,49,201,0.22)' }}
            />
            <div
              className="absolute bottom-10 left-[4%] w-[420px] h-[420px] rounded-full blur-[140px]"
              style={{ background: 'rgba(81,0,189,0.15)' }}
            />
          </div>
        )}

        <div className="max-w-6xl mx-auto relative">
          <button
            onClick={() => navigate('/services')}
            className="flex items-center gap-2 text-sm mb-8 transition-colors hover:opacity-80"
            style={{ color: accent }}
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para planos
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="flex flex-col gap-9 w-full max-w-[480px]">
              <div className="flex items-center gap-4">
                <h1
                  className="text-3xl sm:text-4xl font-medium leading-snug"
                  style={{ fontFamily: ROUNDED_FONT, color: textMain }}
                >
                  Olá, vamos iniciar
                  <br />
                  sua compra online
                </h1>
                <img
                  src={spriteRoboAbraco}
                  alt="Robô Krypta"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0"
                  draggable={false}
                />
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-xl mb-1" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
                  Pagar com
                </h2>

                <button
                  type="button"
                  className="w-full h-10 rounded-[4px] flex items-center justify-center gap-1.5 text-white text-[17px] font-medium transition-all duration-300 hover:brightness-110 active:scale-[0.99]"
                  style={payBtnStyle}
                >
                  <AppleIcon size={18} /> Pay
                </button>
                <button
                  type="button"
                  className="w-full h-10 rounded-[4px] flex items-center justify-center text-white text-[17px] font-medium tracking-tight transition-all duration-300 hover:brightness-110 active:scale-[0.99]"
                  style={payBtnStyle}
                >
                  Google Pay
                </button>

                <div className="flex items-center gap-4 my-1">
                  <div className="h-[1px] flex-1" style={{ background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)' }} />
                  <span className="text-xs" style={{ color: mutedText }}>
                    ou
                  </span>
                  <div className="h-[1px] flex-1" style={{ background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)' }} />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {methods.map((m) => {
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className="h-11 px-3 rounded-[4px] flex flex-col items-start justify-center gap-0.5 text-[10px] transition-all duration-300"
                        style={{
                          background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
                          border: `${active ? 1.5 : 1}px solid ${
                            active ? (isDark ? 'rgba(255,255,255,0.92)' : '#5100BD') : fieldBorder
                          }`,
                          boxShadow: isDark ? '0 0 12px rgba(97,49,201,0.25)' : 'none',
                          color: active ? textMain : mutedText,
                        }}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === 'card' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4 mt-2"
                  >
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="Número do cartão"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(fmtCard(e.target.value))}
                        className={`${fieldClass} pr-[150px]`}
                        style={fieldStyle}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <VisaChip />
                        <MasterChip />
                        <AmexChip />
                        <DiscoverChip />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="Data de Validade"
                        value={expiry}
                        onChange={(e) => setExpiry(fmtExpiry(e.target.value))}
                        className={fieldClass}
                        style={fieldStyle}
                      />
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          placeholder="Código de segurança"
                          value={cvv}
                          onChange={(e) => setCvv(fmtCvv(e.target.value))}
                          className={`${fieldClass} pr-11`}
                          style={fieldStyle}
                        />
                        <CreditCard
                          className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: mutedText }}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 mt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveDetails}
                        onChange={(e) => setSaveDetails(e.target.checked)}
                        className="sr-only"
                      />
                      <span
                        className="w-[18px] h-[18px] rounded-[3px] flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: saveDetails ? '#8d51ff' : isDark ? 'rgba(0,0,0,0.4)' : '#FFFFFF',
                          border: `1px solid ${saveDetails ? '#8d51ff' : fieldBorder}`,
                          boxShadow: isDark ? '0 0 10px rgba(97,49,201,0.3)' : 'none',
                        }}
                      >
                        {saveDetails && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="text-[10px]" style={{ color: mutedText }}>
                        Salvar dados de pagamento para compras futuras em Krypta.
                      </span>
                    </label>
                  </motion.div>
                )}

                {paymentMethod === 'pix' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-8 rounded-md gap-4 mt-2"
                    style={fieldStyle}
                  >
                    <QrCode className="w-16 h-16" style={{ color: accent }} />
                    <p className="text-xs text-center" style={{ color: mutedText }}>
                      Escaneie o QR Code com o app do seu banco
                      <br />
                      para realizar o pagamento.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full max-w-[420px] lg:justify-self-end flex flex-col gap-4"
            >
              <div
                className="w-full flex flex-col rounded-lg p-5 gap-4"
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  boxShadow: isDark ? '0 0 36px rgba(97,49,201,0.3)' : '0 10px 40px rgba(81,0,189,0.1)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div>
                  <h3 className="text-sm font-semibold mb-2.5" style={{ fontFamily: ROUNDED_FONT, color: textMain }}>
                    {planTitle}
                  </h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: mutedText }}>
                    {plan.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-[11px]">
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: isDark ? '#9d7bff' : '#5100BD' }} />
                      <span style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(26,26,26,0.85)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div
                  className="flex flex-col gap-2 pt-4 border-t"
                  style={{ borderColor: isDark ? 'rgba(180,160,255,0.45)' : 'rgba(81,0,189,0.2)' }}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: mutedText }}>{isAnnual ? 'Anual assinatura' : 'Mensal assinatura'}</span>
                    <span style={{ color: textMain }}>{plan.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span style={{ color: textMain }}>TOTAL A PAGAR:</span>
                    <span style={{ color: textMain }}>{plan.price}</span>
                  </div>
                </div>

                {/* Exibição de erro caso a API falhe */}
                {error && (
                  <div className="rounded-lg p-2.5 flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full h-9 rounded-[4px] text-sm font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    ...payBtnStyle,
                    fontFamily: ROUNDED_FONT,
                  }}
                >
                  {loading ? 'Processando...' : 'Assinar'}
                </button>
              </div>

              <p className="text-[10px] leading-relaxed px-1" style={{ color: mutedText }}>
                A assinatura será renovada {isAnnual ? 'anualmente' : 'mensalmente'} até ser cancelada. Será cobrado o
                valor de {plan.price}.{' '}
                <Link to="/settings" className="underline" style={{ color: link }}>
                  Cancele quando quiser
                </Link>{' '}
                em Configurações. Ao assinar, você concorda com nossos{' '}
                <a href="#" className="underline" style={{ color: link }}>
                  Termos de uso
                </a>{' '}
                e{' '}
                <a href="#" className="underline" style={{ color: link }}>
                  Termos de crédito de serviço
                </a>
                , confirma que leu nossa{' '}
                <a href="#" className="underline" style={{ color: link }}>
                  Política de Privacidade
                </a>{' '}
                e autoriza a Krypta a armazenar sua forma de pagamento e fazer cobranças nela.
              </p>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}