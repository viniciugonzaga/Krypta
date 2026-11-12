import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import loadingGif from '../../assets/Robo_Carregar.gif';

const STATUS_MESSAGES = [
  'Estabelecendo conexão segura...',
  'Validando hardware de autenticação...',
  'Sincronizando credenciais...',
  'Verificando integridade do cofre...',
  'Aguardando validação NFC...',
];

interface LoadingScreenProps {
  message?: string;
  minimal?: boolean;
  size?: number;
}

export function LoadingScreen({
  message,
  minimal = false,
  size = 380,
}: LoadingScreenProps) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [message]);

  const currentMessage = message ?? STATUS_MESSAGES[statusIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: { duration: 0.5, ease: 'easeInOut' },
      }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-krypta-black overflow-hidden"
    >
      {/* ============================================================
          CAMADA 1: FUNDO
          ============================================================ */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-15" />

      {/* Orbe de luz azul (combina com as bolinhas do GIF) */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: size * 2.4,
          height: size * 2.4,
          background:
            'radial-gradient(circle, rgba(52,132,173,0.25) 0%, rgba(52,159,182,0.1) 45%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orbe roxo (identidade Krypta) */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: size * 2,
          height: size * 2,
          background:
            'radial-gradient(circle, rgba(97,49,201,0.25) 0%, transparent 65%)',
          filter: 'blur(90px)',
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* ============================================================
          CONTEÚDO CENTRAL
          ============================================================ */}
      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* ==========================================================
            STAGE DO GIF (efeitos ATRÁS, GIF NA FRENTE)
            ========================================================== */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
        >

          {/* ---------- EFEITO A: ANEL EXTERNO GIRANDO ---------- */}
          <motion.svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 200 200"
            style={{ zIndex: 1 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          >
            <defs>
              <linearGradient id="outerRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3484AD" stopOpacity="0" />
                <stop offset="40%" stopColor="#8BCBD4" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#8BCBD4" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3484AD" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="url(#outerRing)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="140 460"
              style={{ filter: 'drop-shadow(0 0 8px #8BCBD4)' }}
            />
          </motion.svg>

          {/* ---------- EFEITO B: ANEL MÉDIO ROTANDO AO CONTRÁRIO ---------- */}
          <motion.svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 200 200"
            style={{ zIndex: 1 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="#8d51ff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="40 480"
              opacity="0.6"
              style={{ filter: 'drop-shadow(0 0 8px #8d51ff)' }}
            />
          </motion.svg>

          {/* ---------- EFEITO C: 3 ARCOS SEGMENTADOS GIRANDO ---------- */}
          <motion.svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 200 200"
            style={{ zIndex: 1 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            {/* Arco 1 */}
            <path
              d="M 100 14 A 86 86 0 0 1 174 60"
              fill="none"
              stroke="#8BCBD4"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
              style={{ filter: 'drop-shadow(0 0 6px #8BCBD4)' }}
            />
            {/* Arco 2 (oposto) */}
            <path
              d="M 100 186 A 86 86 0 0 1 26 140"
              fill="none"
              stroke="#8d51ff"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
              style={{ filter: 'drop-shadow(0 0 6px #8d51ff)' }}
            />
          </motion.svg>

          {/* ---------- EFEITO D: CHISPAS ORBITANDO ---------- */}
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <motion.div
              key={`spark-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                top: '50%',
                left: '50%',
                width: i % 2 === 0 ? '6px' : '4px',
                height: i % 2 === 0 ? '6px' : '4px',
                marginTop: i % 2 === 0 ? '-3px' : '-2px',
                marginLeft: i % 2 === 0 ? '-3px' : '-2px',
                background: i % 2 === 0 ? '#8BCBD4' : '#B4A0C8',
                boxShadow:
                  i % 2 === 0
                    ? '0 0 12px #8BCBD4, 0 0 24px #3484AD'
                    : '0 0 10px #B4A0C8, 0 0 20px #8d51ff',
                zIndex: 2,
              }}
              animate={{
                x: [
                  Math.cos((angle * Math.PI) / 180) * (size * 0.48),
                  Math.cos(((angle + 360) * Math.PI) / 180) * (size * 0.48),
                ],
                y: [
                  Math.sin((angle * Math.PI) / 180) * (size * 0.48),
                  Math.sin(((angle + 360) * Math.PI) / 180) * (size * 0.48),
                ],
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 7 + i * 0.5,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.3,
              }}
            />
          ))}

          {/* ---------- EFEITO E: HALO PULSANTE ATRÁS DO GIF ---------- */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: size * 0.12,
              background:
                'radial-gradient(circle, rgba(139,203,212,0.35) 0%, rgba(52,132,173,0.15) 50%, transparent 75%)',
              filter: 'blur(25px)',
              zIndex: 3,
            }}
            animate={{
              scale: [1, 1.18, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* ============================================================
              GIF PRINCIPAL — Z-INDEX MÁXIMO, NADA POR CIMA
              ============================================================ */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: size * 0.7,
              height: size * 0.7,
              zIndex: 50,  // ⬅️ SEMPRE NA FRENTE
            }}
          >
            <img
              src={loadingGif}
              alt="Carregando Krypta..."
              className="w-full h-full select-none pointer-events-none object-contain"
              style={{
                // Só um leve drop-shadow azul/roxo ao redor do GIF
                filter:
                  'drop-shadow(0 0 16px rgba(139,203,212,0.5)) drop-shadow(0 0 32px rgba(52,132,173,0.35))',
              }}
              draggable={false}
            />
          </div>

          {/* ---------- EFEITO F: BRILHO REATIVO POR BAIXO ---------- */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              bottom: '8%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: size * 0.6,
              height: size * 0.08,
              background:
                'radial-gradient(ellipse, rgba(139,203,212,0.5) 0%, transparent 70%)',
              filter: 'blur(12px)',
              zIndex: 4,
            }}
            animate={{
              opacity: [0.4, 0.9, 0.4],
              scaleX: [1, 1.15, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* ==========================================================
            TEXTO + BARRA DE PROGRESSO
            ========================================================== */}
        {!minimal && (
          <div className="text-center space-y-5" style={{ zIndex: 50 }}>
            {/* Marca */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl font-display font-black tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-r from-krypta-lilac via-white to-krypta-lilac"
              style={{ textShadow: '0 0 30px rgba(180,160,200,0.5)' }}
            >
              KRYPTA
            </motion.h1>

            {/* Mensagem rotativa */}
            <div className="h-5 flex items-center justify-center">
              <motion.p
                key={currentMessage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-[11px] font-mono text-krypta-lilac/70 tracking-[0.25em] uppercase"
              >
                {currentMessage}
              </motion.p>
            </div>

            {/* Barra de progresso com dois feixes */}
            <div className="relative w-64 h-[2px] bg-krypta-purple/15 rounded-full overflow-hidden mx-auto">
              <motion.div
                className="absolute top-0 bottom-0 w-1/2 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, #8BCBD4 50%, transparent 100%)',
                  boxShadow: '0 0 12px rgba(139,203,212,0.9)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute top-0 bottom-0 w-1/3 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, #8d51ff 50%, transparent 100%)',
                  boxShadow: '0 0 10px rgba(141,81,255,0.8)',
                }}
                animate={{ x: ['-100%', '300%'] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          EFEITO SCANLINE (bem sutil, no fundo)
          ============================================================ */}
      <motion.div
        className="absolute inset-x-0 h-24 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(139,203,212,0.05) 50%, transparent 100%)',
          zIndex: 5,
        }}
        animate={{ y: ['-15%', '115%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}