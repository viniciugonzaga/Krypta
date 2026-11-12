import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

import logoTextoClaro from '../../assets/logos/Krypta_de_texto.png';
import logoTextoEscuro from '../../assets/logos/Krypta_de_texto2.png';

const FacebookIcon = ({ size = 22, ...props }: { size?: number; [key: string]: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const XIcon = ({ size = 22, ...props }: { size?: number; [key: string]: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

const InstagramIcon = ({ size = 22, ...props }: { size?: number; [key: string]: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const SocialIcon = ({ icon: Icon, href, isDark }: { icon: React.ElementType; href: string; isDark: boolean }) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={{ scale: 1.1, y: -2 }}
    whileTap={{ scale: 0.95 }}
    className="flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300"
    style={{
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      border: `1px solid ${isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.2)'}`,
      boxShadow: isDark ? '0 0 15px rgba(141,81,255,0.1)' : 'none',
    }}
  >
    <Icon size={24} style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }} />
  </motion.a>
);

export function Footer() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');

  const logoTextoAtual = isDark ? logoTextoClaro : logoTextoEscuro;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Inscrito com o email:', email);
    setEmail('');
  };

  return (
    <footer
      className="relative w-full pt-16 pb-8 px-6 md:px-12 lg:px-20 z-10 mt-auto border-t"
      style={{
        backgroundColor: isDark ? '#05010A' : '#F8F7FB',
        borderColor: isDark ? 'rgba(141,81,255,0.15)' : 'rgba(81,0,189,0.1)',
        color: isDark ? '#FFFFFF' : '#1a1a1a',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/*
          3 colunas iguais, todas ALINHADAS À ESQUERDA e ao TOPO (items-start no grid).
          No celular (< md) elas empilham e ficam centralizadas.
        */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-12 md:gap-8 mb-16">
          {/* COLUNA 1 — LOGO + ÍCONES (alinhados à esquerda) */}
          <div className="flex flex-col items-center md:items-start gap-6">
            <img
              src={logoTextoAtual}
              alt="KRYPTA"
              className="h-9 md:h-10 w-auto object-contain select-none"
              draggable={false}
              style={{
                filter: isDark
                  ? 'drop-shadow(0 0 16px rgba(141,81,255,0.5))'
                  : 'drop-shadow(0 2px 4px rgba(81,0,189,0.15))',
              }}
            />
            <div className="flex items-center gap-4">
              <SocialIcon icon={FacebookIcon} href="#" isDark={isDark} />
              <SocialIcon icon={XIcon} href="#" isDark={isDark} />
              <SocialIcon icon={InstagramIcon} href="#" isDark={isDark} />
            </div>
          </div>

          {/* COLUNA 2 — CONTATO */}
          <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
            <h3 className="text-lg font-semibold mb-2 leading-tight" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>
              Contate-nos
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:kryptacompany.ofc@gmail.com"
                className="text-sm transition-colors duration-300 hover:text-[#8d51ff]"
                style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,26,0.7)' }}
              >
                kryptacompany.ofc@gmail.com
              </a>
              <a
                href="tel:+5511987654321"
                className="text-sm transition-colors duration-300 hover:text-[#8d51ff]"
                style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,26,0.7)' }}
              >
                +55 (11) 98765-4321
              </a>
            </div>
          </div>

          {/* COLUNA 3 — NEWSLETTER */}
          <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left w-full max-w-sm mx-auto md:mx-0">
            <h3 className="text-lg font-semibold leading-tight" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>
              Inscreva-se
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.6)' }}>
              Deixe seu e-mail para receber todas as atualizações e tirar suas dúvidas.
            </p>
            <form onSubmit={handleSubscribe} className="w-full mt-2 relative flex items-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                required
                className="w-full py-3.5 pl-4 pr-14 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-purple-500/50"
                style={{
                  backgroundColor: isDark ? 'rgba(20,5,45,0.5)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.2)'}`,
                  color: isDark ? '#FFFFFF' : '#1a1a1a',
                }}
              />
              <button
                type="submit"
                aria-label="Inscrever-se"
                className="absolute right-1.5 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                  boxShadow: isDark ? '0 0 15px rgba(141,81,255,0.4)' : '0 2px 8px rgba(81,0,189,0.2)',
                }}
              >
                <Mail size={18} className="text-white" />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t text-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          <p className="text-[11px] md:text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,26,0.5)' }}>
            ©2026 Krypta - TCC Técnico do curso de Desenvolvimento de Sistemas Articulado ao Médio Superior
          </p>
        </div>
      </div>
    </footer>
  );
}