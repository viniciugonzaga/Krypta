// src/pages/Products.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Quote,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  ZoomIn,
  Fingerprint,
  Radio,
  Usb,
  Cpu,
  KeyRound,
  Lock,
  Truck,
  BadgeCheck,
  Minus,
  Plus,
  Crown,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { DevicesAPI, type DispositivoComprado } from '../services/api';
import { isProPlan } from '../utils/plan';
import { KRYPTA_DEVICE } from '../data/catalog';
import { formatBRL } from '../services/fakePayment';

import Krypta0 from '../assets/Produtos/Krypta0.png';
import Krypta1 from '../assets/Produtos/Krypta1.png';
import Krypta2 from '../assets/Produtos/Krypta2.png';
import Krypta3 from '../assets/Produtos/Krypta3.png';
import Krypta4 from '../assets/Produtos/Krypta4.png';
import Krypta6 from '../assets/Produtos/Krypta6.png';
import spriteRoboVerificado from '../assets/cody/cody_verificado.webp';
import spriteRoboAnimado from '../assets/cody/cody_animado.webp';
import { Camada } from '../components/Camada';

// ============================================================
// ESTILOS DOS TÍTULOS (iguais ao Welcome)
// ============================================================
const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const LILAC = '#B4A0C8';

const titleBaseStyle = (isDark: boolean): React.CSSProperties =>
  isDark
    ? { fontFamily: ROUNDED_FONT, fontWeight: 600, letterSpacing: '0.01em', color: LILAC }
    : { fontFamily: ROUNDED_FONT, fontWeight: 600, letterSpacing: '0.01em', color: '#1a1a1a' };

const titleAccentStyle = (isDark: boolean): React.CSSProperties =>
  isDark
    ? {
        fontFamily: ROUNDED_FONT,
        fontWeight: 700,
        letterSpacing: '0.01em',
        backgroundImage: 'linear-gradient(90deg, #7c3aed 0%, #7c3aed 5%, #B4A0C8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
      }
    : {
        fontFamily: ROUNDED_FONT,
        fontWeight: 700,
        letterSpacing: '0.01em',
        color: '#5100BD',
        WebkitTextFillColor: '#5100BD',
      };

const productImages = [Krypta0, Krypta1, Krypta2, Krypta3, Krypta4, Krypta6];

const PARTICLES = [
  { x: '5%', y: '12%', s: 4, d: 0 },
  { x: '18%', y: '48%', s: 3, d: 1.2 },
  { x: '31%', y: '22%', s: 5, d: 0.6 },
  { x: '47%', y: '8%', s: 3, d: 2 },
  { x: '62%', y: '38%', s: 4, d: 0.3 },
  { x: '76%', y: '16%', s: 3, d: 1.6 },
  { x: '90%', y: '44%', s: 5, d: 0.9 },
  { x: '12%', y: '78%', s: 3, d: 2.4 },
  { x: '55%', y: '70%', s: 4, d: 1.8 },
  { x: '84%', y: '84%', s: 3, d: 0.4 },
];

const HIGHLIGHTS = [
  { icon: Fingerprint, label: 'Digital' },
  { icon: Radio, label: 'NFC' },
  { icon: Usb, label: 'USB' },
  { icon: Lock, label: 'AES-256' },
];

const FEATURES = [
  {
    icon: Fingerprint,
    title: 'Leitor de digital',
    text: 'Só a sua impressão digital libera o acesso às credenciais guardadas no cofre.',
  },
  {
    icon: Radio,
    title: 'Autenticação por NFC',
    text: 'Aproxime o Krypta do celular para confirmar acessos de forma rápida e segura.',
  },
  {
    icon: Usb,
    title: 'Conexão por cabo USB',
    text: 'Conecte no computador para autenticar e gerenciar suas senhas pelo software.',
  },
  {
    icon: KeyRound,
    title: 'Chave física Ed25519',
    text: 'Cada dispositivo tem sua própria chave criptográfica, que nunca sai do hardware.',
  },
  {
    icon: Lock,
    title: 'Criptografia AES-256-GCM',
    text: 'Seus dados são cifrados com o mesmo padrão usado por bancos e governos.',
  },
  {
    icon: Cpu,
    title: 'Processador ESP32',
    text: 'Hardware dedicado e identificado de forma única para cada usuário Krypta.',
  },
];

// Do pedido ao cofre: de onde vem o dispositivo que o usuário pareia
const JORNADA = [
  { icon: ShoppingCart, titulo: 'Compre', texto: 'O pedido fica salvo na sua conta, com um número de série para cada dispositivo.' },
  { icon: Truck, titulo: 'Receba', texto: 'Acompanhe em "Minhas compras" e confirme quando o dispositivo chegar.' },
  { icon: Cpu, titulo: 'Pareie', texto: 'No Meu Krypta, escolha o número de série e gere sua chave de contingência.' },
  { icon: Lock, titulo: 'Proteja', texto: 'O dispositivo passa a guardar o cofre. O servidor só recebe o backup cifrado.' },
];

const SPECS: [string, string][] = [
  ['Processador', 'ESP32'],
  ['Autenticação', 'Digital, NFC, cabo USB e senha'],
  ['Criptografia', 'AES-256-GCM'],
  ['Assinatura digital', 'Ed25519'],
  ['Compatibilidade', 'Aplicativo e software Krypta'],
  ['Garantia', '12 meses'],
];

const testimonials = [
  {
    id: 1,
    name: 'Danilo Pereira',
    text: 'Gostei da proposta de combinar software, hardware e criptografia. É uma abordagem que me dá mais controle sobre minhas credenciais e torna a segurança parte da minha rotina.',
  },
  {
    id: 2,
    name: 'Mariana Costa',
    text: 'O Krypta tornou muito mais fácil organizar minhas credenciais. Agora tenho uma forma mais prática de gerenciar meus acessos sem depender tanto da minha memória.',
  },
  {
    id: 3,
    name: 'Pedro Farias',
    text: 'O que mais me chamou a atenção foi a ideia de reunir minhas credenciais em um só lugar, com recursos de segurança pensados para facilitar o acesso sem complicar a experiência.',
  },
  {
    id: 4,
    name: 'Lucas Silveira',
    text: 'A tranquilidade de saber que minhas senhas estão protegidas por um hardware físico é indescritível. Recomendo para todos que levam a segurança digital a sério.',
  },
  {
    id: 5,
    name: 'Ana Beatriz',
    text: 'A interface é limpa e super intuitiva. Mesmo não sendo especialista em segurança, consegui configurar tudo em minutos e me sinto muito mais seguro.',
  },
  {
    id: 6,
    name: 'Roberto Alves',
    text: 'Uso para minha empresa e a gestão de acessos da equipe ficou muito mais segura. A autenticação multifator do dispositivo físico é um diferencial enorme.',
  },
];

const faqs = [
  {
    q: 'Para quem é o Krypta?',
    a: 'O Krypta foi pensado para quem deseja proteger suas senhas e informações digitais de forma mais robusta e descentralizada. É ideal para pessoas que buscam mais controle e segurança sobre suas credenciais, seja no ambiente pessoal ou profissional.',
  },
  {
    q: 'Preciso ter o dispositivo físico para usar o Krypta?',
    a: 'Não é obrigatório: o plano Krypta Free funciona só pelo software. Mas a segurança máxima é alcançada com o dispositivo físico, que guarda suas chaves e adiciona autenticação por digital, NFC e cabo USB.',
  },
  {
    q: 'Como o Krypta protege minhas senhas?',
    a: 'O Krypta utiliza criptografia de ponta a ponta para armazenar e transmitir suas senhas. O dispositivo físico atua como um fator adicional de segurança, garantindo que apenas você tenha acesso às suas credenciais.',
  },
  {
    q: 'O que é a senha mestre?',
    a: 'A senha mestre é a chave principal que protege todas as suas senhas e dados criptografados. Ela funciona como um "cadeado" que só você pode abrir, sendo crucial mantê-la em segurança e nunca compartilhá-la.',
  },
  {
    q: 'O que é autenticação em múltiplos fatores?',
    a: 'É uma camada extra de segurança que exige duas ou mais formas de verificação para acessar suas contas. No Krypta, isso inclui a senha mestre e a confirmação via dispositivo físico, dificultando acessos não autorizados.',
  },
  {
    q: 'Para que serve o dispositivo físico Krypta?',
    a: 'O dispositivo físico serve como uma camada adicional de segurança, armazenando suas chaves criptográficas offline. Isso impede que invasores acessem suas credenciais mesmo se comprometerem o software.',
  },
  {
    q: 'E se eu esquecer minha senha mestre?',
    a: 'Se você esquecer sua senha mestre, infelizmente, não será possível recuperar o acesso aos seus dados, pois o Krypta não armazena essa informação em servidores. É fundamental guardá-la de forma segura.',
  },
  {
    q: 'Existe uma versão gratuita?',
    a: 'Sim! O Krypta Free inclui cofre digital, senha mestre, criptografia e o aplicativo Krypta, com capacidade limitada de armazenamento. É ideal para começar.',
  },
  {
    q: 'Qual é a diferença entre os planos?',
    a: 'Existem dois planos: o Krypta Free, gratuito e só pelo software, e o Krypta Pro, que reúne todos os recursos — autenticação multifator, chave física, alertas de acesso, bloqueio remoto, recursos de emergência, Herança Digital e personalização completa.',
  },
  {
    q: 'O que acontece se eu perder o dispositivo Krypta?',
    a: 'Se você perder o dispositivo, poderá usar o processo de recuperação para restaurar o acesso aos seus dados. Recomenda-se registrar o dispositivo e manter seus backups atualizados para facilitar a recuperação.',
  },
  {
    q: 'Como posso tirar outras dúvidas?',
    a: 'Você pode entrar em contato com nossa equipe de suporte através do e-mail suporte@krypta.com ou pelo formulário de contato em nosso site. Estamos prontos para ajudar!',
  },
];

export function Products() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meusDispositivos, setMeusDispositivos] = useState<DispositivoComprado[] | null>(null);

  // Logado: mostra quantos dispositivos a pessoa já tem e em que etapa estão
  useEffect(() => {
    if (!user) {
      setMeusDispositivos(null);
      return;
    }
    DevicesAPI.list()
      .then(setMeusDispositivos)
      .catch(() => setMeusDispositivos(null));
  }, [user]);
  const [activeImg, setActiveImg] = useState(0);
  const [direction, setDirection] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  // === Zoom estilo e-commerce ===
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const goToImage = (idx: number) => {
    const next = (idx + productImages.length) % productImages.length;
    setDirection(next > activeImg ? 1 : -1);
    setActiveImg(next);
  };

  const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleZoomLeave = () => {
    setIsZooming(false);
    setZoomOrigin({ x: 50, y: 50 });
  };

  const handleBuyNow = () => {
    navigate('/checkout', { state: { kind: 'product', quantity } });
  };

  // Cores reutilizáveis
  const purple = isDark ? '#8d51ff' : '#5100BD';
  const bright = isDark ? '#a97aff' : '#6131C9';
  const cardBg = isDark
    ? 'linear-gradient(160deg, rgba(46,8,83,0.5) 0%, rgba(0,0,0,0.7) 100%)'
    : 'linear-gradient(160deg, rgba(255,255,255,1) 0%, rgba(240,237,248,0.95) 100%)';
  const cardBorder = isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.25)';
  const textMain = isDark ? '#FFFFFF' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,26,0.78)';
  const corner = `1.5px solid ${bright}`;
  const total = KRYPTA_DEVICE.price * quantity;

  const Corners = () => (
    <>
      <span className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderLeft: corner }} />
      <span className="absolute top-0 right-0 w-3 h-3 pointer-events-none" style={{ borderTop: corner, borderRight: corner }} />
      <span className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderLeft: corner }} />
      <span className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: corner, borderRight: corner }} />
    </>
  );

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: 'rgb(var(--krypta-fg))' }}
    >
      {/* ============ FUNDO DECORADO ============ */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-15" />
        <motion.div
          className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full blur-[170px]"
          style={{ background: `${purple}40` }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[30%] right-[-12%] w-[560px] h-[560px] rounded-full blur-[180px]"
          style={{ background: `${purple}2e` }}
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute bottom-[-10%] left-[20%] w-[600px] h-[500px] rounded-full blur-[200px]"
          style={{ background: 'rgb(var(--krypta-cyan) / 0.12)' }}
        />
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s, background: bright, boxShadow: `0 0 12px ${bright}` }}
            animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -14, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: p.d, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <Navbar />

      <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          {/* ============================================================
              SEÇÃO 1 — PRODUTO
             ============================================================ */}
          <section className="flex flex-col lg:flex-row gap-12 mb-28">
            {/* Lado Esquerdo: Imagens */}
            <motion.div
              className="flex-1 min-w-0"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="relative mb-6">
                {/* Halo atrás da imagem */}
                <motion.div
                  className="absolute -inset-3 rounded-[28px] pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg, #5100BD, #8d51ff, #C6AEF6, #5100BD)',
                    filter: 'blur(26px)',
                    opacity: isDark ? 0.45 : 0.25,
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                />

                <div
                  className="relative bg-white rounded-3xl p-8 flex items-center justify-center h-[400px] md:h-[500px] overflow-hidden cursor-zoom-in"
                  style={{
                    boxShadow: isDark
                      ? '0 0 60px rgba(141,81,255,0.25), 0 20px 60px rgba(0,0,0,0.5)'
                      : '0 20px 60px rgba(81,0,189,0.15)',
                    border: `1px solid ${cardBorder}`,
                  }}
                  onMouseEnter={() => setIsZooming(true)}
                  onMouseLeave={handleZoomLeave}
                  onMouseMove={handleZoomMove}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                      transform: isZooming ? 'scale(2.2)' : 'scale(1)',
                      transition: isZooming
                        ? 'transform 0.15s ease-out, transform-origin 0s'
                        : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), transform-origin 0s',
                    }}
                  >
                    <AnimatePresence mode="wait" custom={direction}>
                      <motion.img
                        key={activeImg}
                        src={productImages[activeImg]}
                        alt={`Dispositivo Krypta — foto ${activeImg + 1}`}
                        className="w-full h-full object-contain select-none pointer-events-none"
                        initial={{ opacity: 0, x: direction * 40, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: direction * -40, scale: 0.96 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        draggable={false}
                      />
                    </AnimatePresence>
                  </div>

                  <span
                    className="absolute top-4 left-4 text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none"
                    style={{ background: 'rgba(26,10,60,0.75)', color: '#FFFFFF' }}
                  >
                    {activeImg + 1} / {productImages.length}
                  </span>

                  <span
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap bg-white/80 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-opacity duration-300 pointer-events-none"
                    style={{ color: '#1a1a1a', opacity: isZooming ? 0 : 1 }}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    Passe o mouse para ampliar
                  </span>

                  <AnimatePresence>
                    {isZooming && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none"
                        style={{
                          background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                          color: '#FFFFFF',
                          boxShadow: '0 0 14px rgba(141,81,255,0.6)',
                        }}
                      >
                        <Sparkles className="w-3 h-3" />
                        Zoom 2.2x
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Thumbnails + setas */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToImage(activeImg - 1)}
                  aria-label="Foto anterior"
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 active:scale-95"
                  style={{ background: isDark ? 'rgba(141,81,255,0.15)' : 'rgba(81,0,189,0.08)', border: `1px solid ${cardBorder}`, color: purple }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-3 overflow-x-auto py-2 px-1 scrollbar-hide flex-1">
                  {productImages.map((img, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => goToImage(idx)}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden transition-opacity duration-300 ${
                        activeImg === idx ? '' : 'opacity-60 hover:opacity-100'
                      } bg-white p-1`}
                      style={{
                        border: `2px solid ${activeImg === idx ? purple : 'transparent'}`,
                        boxShadow:
                          activeImg === idx
                            ? isDark
                              ? '0 0 20px rgba(141,81,255,0.6)'
                              : '0 4px 18px rgba(81,0,189,0.35)'
                            : 'none',
                      }}
                    >
                      <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-contain" draggable={false} />
                    </motion.button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => goToImage(activeImg + 1)}
                  aria-label="Próxima foto"
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 active:scale-95"
                  style={{ background: isDark ? 'rgba(141,81,255,0.15)' : 'rgba(81,0,189,0.08)', border: `1px solid ${cardBorder}`, color: purple }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* Lado Direito: Detalhes */}
            <motion.div
              className="flex-1 flex flex-col justify-center"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider"
                  style={{
                    background: isDark ? 'rgba(141,81,255,0.14)' : 'rgba(81,0,189,0.08)',
                    border: `1px solid ${cardBorder}`,
                    color: bright,
                    fontFamily: ROUNDED_FONT,
                  }}
                >
                  <Sparkles className="w-3 h-3" /> HARDWARE KRYPTA
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', color: isDark ? '#86efac' : '#15803d' }}
                >
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
                  </span>
                  Em estoque
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex" style={{ color: purple }}>
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 400 }}
                    >
                      <Star size={20} fill="currentColor" />
                    </motion.span>
                  ))}
                </div>
                <span className="text-sm" style={{ color: textMuted }}>
                  4.9 | 867 avaliações
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4" style={{ color: textMain, fontFamily: ROUNDED_FONT }}>
                {KRYPTA_DEVICE.name}
              </h1>

              <p className="text-[15px] leading-relaxed mb-6" style={{ color: textMuted }}>
                Seu cofre de senhas em formato físico. Autentique com digital, NFC ou cabo USB e
                mantenha suas chaves criptográficas longe da internet.
              </p>

              {/* Destaques */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {HIGHLIGHTS.map((h, i) => (
                  <motion.div
                    key={h.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.08 }}
                    whileHover={{ y: -4, scale: 1.04 }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl cursor-default"
                    style={{
                      background: isDark ? 'rgba(141,81,255,0.08)' : 'rgba(81,0,189,0.05)',
                      border: `1px solid ${cardBorder}`,
                    }}
                  >
                    <h.icon className="w-5 h-5" style={{ color: purple }} />
                    <span className="text-[11px] font-semibold" style={{ color: textMain }}>{h.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Preço */}
              <div className="relative mb-6 p-5 rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <Corners />
                <motion.span
                  className="absolute top-0 bottom-0 w-1/3 -skew-x-12 pointer-events-none"
                  style={{ background: `linear-gradient(90deg, transparent, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(141,81,255,0.1)'}, transparent)` }}
                  initial={{ left: '-40%' }}
                  animate={{ left: '140%' }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                />
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.p
                        key={total}
                        initial={{ y: -12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        className="text-4xl font-extrabold"
                        style={{ color: textMain, fontFamily: ROUNDED_FONT }}
                      >
                        {formatBRL(total)}
                      </motion.p>
                    </AnimatePresence>
                    <p className="text-sm mt-1" style={{ color: textMuted }}>
                      em até {KRYPTA_DEVICE.maxInstallments}x de {formatBRL(total / KRYPTA_DEVICE.maxInstallments)} sem juros
                    </p>
                  </div>

                  {/* Quantidade */}
                  <div>
                    <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: textMuted }}>
                      Quantidade
                    </p>
                    <div className="inline-flex items-center rounded-xl overflow-hidden" style={{ border: `1px solid ${cardBorder}` }}>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-purple-500/15"
                        style={{ color: textMain }}
                        aria-label="Diminuir"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={quantity}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 10, opacity: 0 }}
                          className="w-10 text-center font-bold"
                          style={{ color: textMain }}
                        >
                          {quantity}
                        </motion.span>
                      </AnimatePresence>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(KRYPTA_DEVICE.maxQuantity, q + 1))}
                        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-purple-500/15"
                        style={{ color: textMain }}
                        aria-label="Aumentar"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={handleBuyNow}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative w-full py-4 rounded-xl font-bold text-lg text-white overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                    boxShadow: isDark
                      ? '0 0 28px rgba(141,81,255,0.55), inset 0 0 15px rgba(255,255,255,0.05)'
                      : '0 6px 24px rgba(81,0,189,0.35)',
                    border: '1px solid rgba(180,160,200,0.35)',
                    fontFamily: ROUNDED_FONT,
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
                    Comprar agora
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </motion.button>

                <div className="grid grid-cols-2 gap-3">
                  {['Amazon', 'Mercado Livre'].map((store) => (
                    <motion.button
                      key={store}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setToast(`Simulação: aqui você seria levado à loja oficial na ${store}.`)}
                      className="py-3 rounded-xl text-sm font-semibold transition-colors"
                      style={{
                        background: 'transparent',
                        border: `1px solid ${bright}`,
                        color: bright,
                        fontFamily: ROUNDED_FONT,
                      }}
                    >
                      Ver na {store}
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]" style={{ color: textMuted }}>
                  <span className="flex items-center justify-center gap-1.5"><Truck className="w-3.5 h-3.5" style={{ color: purple }} /> Frete grátis</span>
                  <span className="flex items-center justify-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" style={{ color: purple }} /> Compra segura</span>
                  <span className="flex items-center justify-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5" style={{ color: purple }} /> Garantia 12 meses</span>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ============================================================
              SEÇÃO 1.5 — DO PEDIDO AO COFRE
             ============================================================ */}
          <section className="mb-28">
            <div className="text-center mb-10">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-4xl md:text-5xl mb-4"
                style={titleBaseStyle(isDark)}
              >
                Do pedido ao <span style={titleAccentStyle(isDark)}>cofre</span>
              </motion.h2>
              <p className="max-w-2xl mx-auto text-[15px]" style={{ color: textMuted, fontFamily: ROUNDED_FONT }}>
                O dispositivo que você compra aqui é o mesmo que você liga no seu cofre, no Meu Krypta.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {JORNADA.map((j, i) => (
                <motion.div
                  key={j.titulo}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative rounded-2xl p-5"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                >
                  <Corners />
                  <span className="absolute top-4 right-4 text-3xl font-black opacity-15" style={{ color: purple, fontFamily: ROUNDED_FONT }}>
                    {i + 1}
                  </span>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                    <j.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold mb-1" style={{ color: textMain, fontFamily: ROUNDED_FONT }}>{j.titulo}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{j.texto}</p>
                </motion.div>
              ))}
            </div>

            {/* Situação da pessoa logada */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-6 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4"
              style={{ background: isDark ? 'rgba(141,81,255,0.08)' : 'rgba(81,0,189,0.05)', border: `1px dashed ${purple}` }}
            >
              <div className="flex-1 text-sm" style={{ color: textMain }}>
                {!user ? (
                  <>Entre na sua conta para comprar, acompanhar a entrega e parear o dispositivo no seu cofre.</>
                ) : meusDispositivos && meusDispositivos.length > 0 ? (
                  <>
                    Você tem <strong>{meusDispositivos.length}</strong> dispositivo(s):{' '}
                    {meusDispositivos.filter((d) => d.status === 'EM_TRANSPORTE').length} em transporte,{' '}
                    {meusDispositivos.filter((d) => d.status === 'DISPONIVEL').length} pronto(s) para parear,{' '}
                    {meusDispositivos.filter((d) => d.status === 'PAREADO').length} em uso no cofre.
                  </>
                ) : (
                  <>Você ainda não tem um Dispositivo Krypta. Ele protege o cofre com a chave física (recurso do Krypta Pro).</>
                )}
                {user && !isProPlan(user.plan) && (
                  <p className="text-xs mt-1" style={{ color: textMuted }}>
                    Para parear o dispositivo físico no cofre é preciso o <strong>Krypta Pro</strong>.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!user ? (
                  <Link to="/login" className="px-4 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                    Entrar
                  </Link>
                ) : (
                  <>
                    <Link to="/compras" className="px-4 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
                      Minhas compras
                    </Link>
                    {!isProPlan(user.plan) && (
                      <Link to="/services#planos" className="px-4 py-2.5 rounded-lg text-sm font-bold" style={{ border: `1px solid ${bright}`, color: bright }}>
                        Ver o Krypta Pro
                      </Link>
                    )}
                  </>
                )}
                <Link to="/como-funciona" className="px-4 py-2.5 rounded-lg text-sm font-bold inline-flex items-center gap-1" style={{ color: bright }}>
                  Como funciona <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </section>

          {/* ============================================================
              SEÇÃO 2 — POR DENTRO DO KRYPTA
             ============================================================ */}
          <section className="relative mb-28">
            <motion.img
              src={spriteRoboVerificado}
              alt=""
              draggable={false}
              className="hidden lg:block absolute -top-16 right-0 w-28 pointer-events-none select-none"
              style={{ filter: `drop-shadow(0 0 24px ${purple}88)` }}
              animate={{ y: [0, -12, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-4xl md:text-5xl mb-4"
                style={titleBaseStyle(isDark)}
              >
                Por dentro do <span style={titleAccentStyle(isDark)}>Krypta</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="max-w-2xl mx-auto text-[15px]"
                style={{ color: textMuted, fontFamily: ROUNDED_FONT }}
              >
                Cada camada do dispositivo foi pensada para que só você tenha acesso às suas credenciais.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="group relative rounded-2xl p-6 overflow-hidden"
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    boxShadow: isDark ? '0 0 22px rgba(97,49,201,0.15)' : '0 6px 22px rgba(81,0,189,0.08)',
                  }}
                >
                  <Corners />
                  <div
                    className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${purple}40 0%, transparent 70%)`, filter: 'blur(20px)' }}
                  />
                  <div
                    className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                    style={{
                      background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                      boxShadow: isDark ? '0 0 20px rgba(141,81,255,0.5)' : '0 6px 16px rgba(81,0,189,0.3)',
                    }}
                  >
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="relative text-lg font-bold mb-2" style={{ color: textMain, fontFamily: ROUNDED_FONT }}>
                    {f.title}
                  </h3>
                  <p className="relative text-sm leading-relaxed" style={{ color: textMuted }}>
                    {f.text}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Especificações + CTA do Pro */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 mt-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative rounded-2xl p-6"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <Corners />
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4" style={{ color: textMain, fontFamily: ROUNDED_FONT }}>
                  <Info className="w-5 h-5" style={{ color: purple }} /> Especificações técnicas
                </h3>
                <dl className="divide-y" style={{ borderColor: cardBorder }}>
                  {SPECS.map(([k, v], i) => (
                    <motion.div
                      key={k}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="flex justify-between gap-4 py-2.5 text-sm"
                      style={{ borderColor: isDark ? 'rgba(141,81,255,0.18)' : 'rgba(81,0,189,0.1)' }}
                    >
                      <dt style={{ color: textMuted }}>{k}</dt>
                      <dd className="font-semibold text-right" style={{ color: textMain }}>{v}</dd>
                    </motion.div>
                  ))}
                </dl>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative rounded-2xl p-6 overflow-hidden flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, #2a0a63 0%, #5100BD 55%, #8d51ff 100%)',
                  boxShadow: '0 0 40px rgba(141,81,255,0.4)',
                }}
              >
                <motion.img
                  src={spriteRoboAnimado}
                  alt=""
                  draggable={false}
                  className="absolute -bottom-4 -right-4 w-32 opacity-90 pointer-events-none select-none"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider mb-4 bg-white/15 text-white">
                  <Crown className="w-3 h-3" /> COMBINE COM O PRO
                </span>
                <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: ROUNDED_FONT }}>
                  Libere tudo o que o dispositivo pode fazer
                </h3>
                <p className="text-sm text-white/80 mb-6 max-w-[90%]">
                  O Krypta Pro ativa chave física, multifator, alertas, bloqueio remoto e Herança Digital.
                </p>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/services#planos', { state: { tier: 'pro' } })}
                  className="mt-auto self-start px-5 py-2.5 rounded-lg bg-white text-sm font-bold flex items-center gap-2"
                  style={{ color: '#5100BD', fontFamily: ROUNDED_FONT }}
                >
                  Ver Krypta Pro <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            </div>
          </section>

          {/* ============================================================
              SEÇÃO 3 — DEPOIMENTOS (MARQUEE)
             ============================================================ */}
          <section className="mb-28">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-4xl md:text-5xl mb-5"
                style={titleBaseStyle(isDark)}
              >
                Nossos <span style={titleAccentStyle(isDark)}>Depoimentos</span>
              </motion.h2>
            </div>

            <div
              className="relative w-full overflow-hidden py-3"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              }}
            >
              <motion.div
                className="flex gap-6 w-max"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ repeat: Infinity, ease: 'linear', duration: 45 }}
              >
                {[...testimonials, ...testimonials].map((t, idx) => (
                  <motion.div
                    key={`${t.id}-${idx}`}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className="w-[340px] shrink-0 p-6 rounded-2xl relative"
                    style={{
                      background: cardBg,
                      border: `1px solid ${cardBorder}`,
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(81,0,189,0.08)',
                    }}
                  >
                    <Quote className="absolute top-5 right-5 opacity-30" size={38} style={{ color: purple }} fill="currentColor" />

                    <div className="flex gap-0.5 mb-3" style={{ color: purple }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={13} fill="currentColor" />
                      ))}
                    </div>

                    <p className="text-sm leading-relaxed mb-6 relative z-10 min-h-[110px]" style={{ color: textMuted }}>
                      "{t.text}"
                    </p>

                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                          border: `2px solid ${purple}`,
                          boxShadow: isDark ? '0 0 15px rgba(141,81,255,0.5)' : '0 4px 14px rgba(81,0,189,0.25)',
                        }}
                      >
                        <User className="text-white" size={22} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: textMain }}>{t.name}</p>
                        <p className="text-xs font-medium flex items-center gap-1" style={{ color: purple }}>
                          <BadgeCheck className="w-3.5 h-3.5" /> Usuário Krypta
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ============================================================
              SEÇÃO 4 — DÚVIDAS FREQUENTES
             ============================================================ */}
          <section className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-4xl md:text-5xl mb-5"
                style={titleBaseStyle(isDark)}
              >
                Dúvidas <span style={titleAccentStyle(isDark)}>Frequentes</span>
              </motion.h2>
            </div>

            <div className="flex flex-col gap-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                    className="rounded-xl overflow-hidden transition-all duration-300"
                    style={{
                      background: isOpen
                        ? isDark
                          ? 'linear-gradient(160deg, rgba(97,49,201,0.35) 0%, rgba(46,8,83,0.55) 100%)'
                          : 'linear-gradient(160deg, rgba(141,81,255,0.12) 0%, rgba(81,0,189,0.08) 100%)'
                        : isDark
                          ? 'rgba(20,5,45,0.5)'
                          : 'rgba(255,255,255,0.85)',
                      border: `1.5px solid ${isOpen ? purple : cardBorder}`,
                      boxShadow: isOpen
                        ? isDark
                          ? '0 0 30px rgba(141,81,255,0.35), inset 0 0 20px rgba(141,81,255,0.06)'
                          : '0 8px 28px rgba(81,0,189,0.18)'
                        : 'none',
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full px-5 md:px-6 py-5 text-left flex items-center gap-4 font-medium transition-colors duration-300"
                      style={{
                        color: isDark
                          ? isOpen
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.92)'
                          : isOpen
                            ? '#2e0853'
                            : 'rgba(26,26,26,0.9)',
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-300"
                        style={{
                          background: isOpen
                            ? 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)'
                            : isDark
                              ? 'rgba(141,81,255,0.15)'
                              : 'rgba(81,0,189,0.1)',
                          border: `1px solid ${isOpen ? purple : cardBorder}`,
                          color: isOpen ? '#FFFFFF' : purple,
                          boxShadow: isOpen ? '0 0 12px rgba(141,81,255,0.6)' : 'none',
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <span className="flex-1 text-[15px] md:text-base">{faq.q}</span>

                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="shrink-0">
                        <ChevronDown style={{ color: isOpen ? purple : textMuted }} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div
                            className="px-5 md:px-6 pb-5 pt-4 ml-11 text-sm leading-relaxed border-t"
                            style={{
                              color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(26,26,26,0.82)',
                              borderColor: isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.15)',
                            }}
                          >
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer />

      {/* Toast */}
      <Camada>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm max-w-[92vw]"
            style={{
              background: isDark ? 'rgba(20,5,45,0.95)' : '#FFFFFF',
              border: `1px solid ${cardBorder}`,
              boxShadow: isDark ? '0 0 30px rgba(141,81,255,0.4)' : '0 10px 30px rgba(81,0,189,0.2)',
              color: textMain,
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: purple }} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      </Camada>
    </div>
  );
}