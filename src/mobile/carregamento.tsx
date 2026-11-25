// src/mobile/carregamento.tsx
// ============================================================
// v1.4.0 — CARREGAMENTO INTELIGENTE DO APP (modo celular)
//
// Antes, o robô de carregamento (GIF de 26 MB, tela cheia) aparecia a
// CADA troca de tela, mesmo quando a tela abria na hora. Agora:
//   • troca de tela normal → nada de loader (só a transição curta)
//   • tela pesada/importante (cofre, chaves...) → loader na 1ª vez da sessão
//   • qualquer tela que demore mais de 0,7 s → loader até terminar
//   • o loader é compacto (cartão no meio da tela) e usa WebP leve
// As telas avisam com useCarregandoTela('id', carregando, pesada).
// ============================================================
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import roboCarregar from '../assets/Robo_Carregar.webp';

const ATRASO_MS = 700; // só mostra se demorar mais que isto
const MINIMO_MS = 380; // depois de aparecer, fica pelo menos isto (evita "piscar")
const K_VISTAS = '@Krypta:telas-vistas';

const ativos = new Map<string, { pesada: boolean; primeira: boolean }>();
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

function jaVista(id: string): boolean {
  try {
    return (JSON.parse(sessionStorage.getItem(K_VISTAS) ?? '[]') as string[]).includes(id);
  } catch {
    return true;
  }
}
function marcarVista(id: string) {
  try {
    const l = JSON.parse(sessionStorage.getItem(K_VISTAS) ?? '[]') as string[];
    if (!l.includes(id)) sessionStorage.setItem(K_VISTAS, JSON.stringify([...l, id]));
  } catch {
    /* ok */
  }
}

export const Carregamento = {
  comecar(id: string, pesada = false) {
    ativos.set(id, { pesada, primeira: pesada && !jaVista(id) });
    avisar();
  },
  terminar(id: string) {
    if (!ativos.has(id)) return;
    ativos.delete(id);
    marcarVista(id);
    avisar();
  },
};

/** A tela avisa que está carregando. `pesada` = mostra o loader já na 1ª vez da sessão. */
export function useCarregandoTela(id: string, carregando: boolean, pesada = false) {
  useEffect(() => {
    if (!carregando) return;
    Carregamento.comecar(id, pesada);
    return () => Carregamento.terminar(id);
  }, [id, carregando, pesada]);
}

/** O loader compacto (montado uma vez no App, só no modo celular) */
export function CarregadorApp() {
  const { isDark } = useTheme();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let desde = 0;
    const atualizar = () => {
      clearTimeout(timer);
      const lista = [...ativos.values()];
      if (lista.length) {
        const imediato = lista.some((a) => a.primeira);
        timer = setTimeout(
          () => {
            desde = Date.now();
            setVisivel(true);
          },
          imediato ? 0 : ATRASO_MS,
        );
      } else {
        const falta = desde ? Math.max(0, MINIMO_MS - (Date.now() - desde)) : 0;
        timer = setTimeout(() => {
          desde = 0;
          setVisivel(false);
        }, falta);
      }
    };
    ouvintes.add(atualizar);
    return () => {
      ouvintes.delete(atualizar);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          className="fixed inset-0 z-[9000] flex items-center justify-center"
          style={{ background: isDark ? 'rgba(7,1,15,0.55)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(6px)' }}
          aria-live="polite"
          aria-label="Carregando"
        >
          <motion.div
            initial={{ scale: 0.92, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            className="flex flex-col items-center rounded-3xl px-6 py-5"
            style={{ background: isDark ? '#140726' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(141,81,255,0.35)' : 'rgba(97,49,201,0.2)'}`, boxShadow: '0 18px 50px rgba(81,0,189,0.25)' }}
          >
            <img src={roboCarregar} alt="" className="w-28 h-auto" draggable={false} />
            <p className="text-[12.5px] mt-2 font-semibold" style={{ color: isDark ? '#c9b3ff' : '#5100BD', fontFamily: "'Quicksand', 'Poppins', sans-serif" }}>
              Carregando…
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
