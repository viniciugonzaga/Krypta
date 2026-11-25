// src/pages/inicio/Novidades.tsx
// ============================================================
// v1.4.0 — "O que há de novo" na página inicial do site/Windows.
// Mesmas novidades do app, com botões que levam à tela certa
// (para quem não tem conta, levam a criar conta / como funciona).
// ============================================================
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { abrirCody } from '../../ajuda/abrir';
import kVerificado from '../../assets/cody/cody_verificado.webp';
import kAcenando from '../../assets/cody/cody_acenando.webp';
import kExclamacao from '../../assets/cody/cody_exclamacao.webp';
import av7 from '../../assets/cody/avatar7.webp';

const FONTE = "'Quicksand', 'Poppins', sans-serif";

export function Novidades() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const logado = !!user;
  const ativo = user?.estadoCofre === 'ATIVA';

  const cards = [
    {
      img: kVerificado,
      titulo: 'Seu cofre em qualquer aparelho',
      texto: 'Em todos os planos, o cofre tranca com senha e abre nos seus outros aparelhos com ela. No Pro: PIN de 6 dígitos e digital no celular.',
      botao: logado ? (ativo ? { rotulo: 'Senha do cofre', para: '/cofre/acesso' } : { rotulo: 'Ativar meu cofre', para: '/device' }) : { rotulo: 'Criar conta grátis', para: '/register' },
    },
    {
      img: kAcenando,
      titulo: 'Cody, seu assistente',
      texto: 'Um robô que conhece a sua conta, resolve problemas passo a passo e te leva para a tela certa. Sem ver suas senhas.',
      cody: true,
    },
    {
      img: kExclamacao,
      titulo: 'Avisos na hora',
      texto: 'Novo acesso, cofre aberto em outro aparelho ou herança: o Krypta avisa no Windows, no navegador e no celular.',
      botao: logado ? { rotulo: 'Ligar notificações', para: '/settings' } : { rotulo: 'Como funciona', para: '/como-funciona' },
    },
    {
      img: av7,
      titulo: 'Seu avatar do seu jeito',
      texto: 'Escolha um dos 12 Codys e a cor do fundo, ou use uma foto sua. Aparece no site, no celular e no Windows.',
      botao: logado ? { rotulo: 'Escolher avatar', para: '/profile' } : { rotulo: 'Criar conta grátis', para: '/register' },
    },
  ];

  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(26,26,26,0.65)';
  const roxo = isDark ? '#c9b3ff' : '#5100BD';

  return (
    <section className="relative w-full py-20 px-6 md:px-12 lg:px-20 z-10" style={{ color: fg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-4 text-white" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
            NOVIDADES
          </span>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-5xl font-semibold" style={{ fontFamily: FONTE }}>
            Mais seguro, mais <span style={{ color: roxo }}>simples</span>
          </motion.h2>
          <p className="text-sm md:text-base mt-3 max-w-xl mx-auto" style={{ color: muted }}>
            O que chegou no Krypta para proteger você sem complicar.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={card.titulo}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col rounded-2xl p-6"
              style={{
                background: isDark ? 'linear-gradient(160deg, rgba(46,8,83,0.35) 0%, rgba(0,0,0,0.55) 100%)' : '#FFFFFF',
                border: `1.5px solid ${isDark ? 'rgba(141,81,255,0.3)' : 'rgba(81,0,189,0.16)'}`,
              }}
            >
              <img src={card.img} alt="" className="w-20 h-20 object-contain mb-4" draggable={false} loading="lazy" />
              <h3 className="text-lg font-semibold" style={{ fontFamily: FONTE }}>
                {card.titulo}
              </h3>
              <p className="text-sm mt-2 leading-relaxed flex-1" style={{ color: muted }}>
                {card.texto}
              </p>
              {card.cody ? (
                <button type="button" onClick={() => abrirCody()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: roxo }}>
                  Falar com o Cody <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                card.botao && (
                  <Link to={card.botao.para} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: roxo }}>
                    {card.botao.rotulo} <ArrowRight className="w-4 h-4" />
                  </Link>
                )
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
