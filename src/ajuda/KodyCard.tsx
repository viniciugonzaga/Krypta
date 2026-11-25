// src/ajuda/KodyCard.tsx
// ============================================================
// Cartão "Fale com o Kody" — Início e Perfil (app, site e Windows)
// Abre a conversa; os atalhos já mandam a pergunta pronta.
// ============================================================
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { abrirKody } from './abrir';
import kAcenando from '../assets/kody/kody_acenando.webp';

export function KodyCard({ atalhos = [], titulo = 'Fale com o Kody', sub = 'Precisa de ajuda?', variante = 'app', className = '' }: { atalhos?: string[]; titulo?: string; sub?: string; variante?: 'app' | 'site'; className?: string }) {
  const { isDark } = useTheme();
  const reduzir = useReducedMotion();
  const roxo = isDark ? '#c9b3ff' : '#5100BD';
  const site = variante === 'site';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative overflow-hidden rounded-2xl ${site ? 'p-6 md:p-7' : 'p-4'} ${className}`}
      style={{
        background: isDark ? 'linear-gradient(160deg, rgba(141,81,255,0.14) 0%, rgba(20,7,38,0.9) 100%)' : '#FFFFFF',
        border: `1.5px solid ${isDark ? 'rgba(141,81,255,0.55)' : 'rgba(97,49,201,0.55)'}`,
        color: isDark ? '#FFFFFF' : '#1a1a1a',
      }}
    >
      <div className={`flex ${site ? 'flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-5' : 'flex-col items-center text-center gap-1'}`}>
        <button type="button" onClick={() => abrirKody()} aria-label="Abrir o chat com o Kody" className="relative shrink-0">
          <motion.span className="absolute inset-2 rounded-full blur-xl" style={{ background: 'rgba(141,81,255,0.35)' }} animate={reduzir ? undefined : { opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
          <motion.img
            src={kAcenando}
            alt="Kody"
            className={`relative object-contain ${site ? 'w-28 h-28' : 'w-20 h-20'}`}
            draggable={false}
            animate={reduzir ? undefined : { rotate: [-5, 5, -5], y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${site ? 'text-xl' : 'text-[16px]'}`}>{titulo}</p>
          <p className={`${site ? 'text-sm mt-1' : 'text-[12.5px]'} opacity-70`}>{sub}</p>
          {site && <p className="text-[13px] mt-2 opacity-75 leading-relaxed">O Kody conhece a sua conta (plano, cofre e aparelho), resolve problemas passo a passo e te leva direto para a tela certa. Ele nunca vê suas senhas.</p>}
          <button
            type="button"
            onClick={() => abrirKody()}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full font-semibold ${site ? 'px-5 py-2.5 text-sm text-white' : 'px-4 py-1.5 text-[12.5px]'}`}
            style={site ? { background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' } : { border: `1.5px solid ${roxo}`, color: roxo }}
          >
            {site && <MessageCircle className="w-4 h-4" />} Abrir o chat <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {atalhos.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 mt-4 ${site ? 'justify-center sm:justify-start' : 'justify-center'}`}>
          {atalhos.map((a) => (
            <button key={a} type="button" onClick={() => abrirKody(a)} className="px-3 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: isDark ? 'rgba(141,81,255,0.14)' : '#F4EEFF', color: roxo }}>
              {a}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
