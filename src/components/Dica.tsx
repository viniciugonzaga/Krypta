// src/components/Dica.tsx
// ============================================================
// v1.3.0 — CARTÕES DE DICA ("Você sabia?")
// Aparecem nas telas principais (site, app do Windows e celular) com uma
// dica de uso que combina com a tela e com o plano. Fechou → não volta
// neste aparelho. "Perguntar ao Cody" abre o robô de ajuda já com a pergunta.
// ============================================================
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { abrirCody } from '../ajuda/abrir';

const CHAVE = (id: string) => `@Krypta:dica:${id}`;


export function Dica({
  id,
  titulo,
  children,
  acao,
  pergunta,
  className = '',
}: {
  id: string;
  titulo: string;
  children: ReactNode;
  acao?: { rotulo: string; para: string };
  /** pergunta pronta para o Cody */
  pergunta?: string;
  className?: string;
}) {
  const { isDark } = useTheme();
  const [fechada, setFechada] = useState(() => {
    try {
      return localStorage.getItem(CHAVE(id)) === '1';
    } catch {
      return false;
    }
  });
  const fechar = () => {
    setFechada(true);
    try {
      localStorage.setItem(CHAVE(id), '1');
    } catch {
      /* ok */
    }
  };
  const cor = isDark ? '#c9b3ff' : '#5100BD';

  return (
    <AnimatePresence initial={false}>
      {!fechada && (
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
          className={`relative rounded-2xl p-4 pr-10 flex gap-3 overflow-hidden ${className}`}
          style={{
            background: isDark ? 'linear-gradient(135deg, rgba(141,81,255,0.16) 0%, rgba(81,0,189,0.08) 100%)' : 'linear-gradient(135deg, #F6F0FF 0%, #EFE7FF 100%)',
            border: `1px dashed ${isDark ? 'rgba(169,122,255,0.55)' : 'rgba(97,49,201,0.4)'}`,
            color: isDark ? '#FFFFFF' : '#1a1a1a',
          }}
          aria-label={`Dica: ${titulo}`}
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
            <Lightbulb className="w-4 h-4" />
          </span>
          <div className="min-w-0 text-[13px] leading-relaxed">
            <p className="font-semibold text-[13.5px]">{titulo}</p>
            <div className="opacity-80 mt-0.5">{children}</div>
            {(acao || pergunta) && (
              <div className="flex flex-wrap gap-3 mt-2 text-[12.5px] font-semibold">
                {acao && (
                  <Link to={acao.para} className="underline underline-offset-4" style={{ color: cor }}>
                    {acao.rotulo} →
                  </Link>
                )}
                {pergunta && (
                  <button type="button" onClick={() => abrirCody(pergunta)} className="underline underline-offset-4" style={{ color: cor }}>
                    Perguntar ao Cody
                  </button>
                )}
              </div>
            )}
          </div>
          <button type="button" onClick={fechar} aria-label="Fechar dica" className="absolute top-3 right-3 opacity-55 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
