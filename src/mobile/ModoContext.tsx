// src/mobile/ModoContext.tsx
// Guarda o modo atual (Mobile ou Web) e troca sozinho quando a janela muda de
// tamanho, quando o app é instalado ou quando a pessoa escolhe em Ajustes.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { EVENTO_MODO, LARGURA_MOBILE, calcularModo, lerPreferencia, salvarPreferencia, type Modo, type PreferenciaModo } from './modo';

interface ModoContextData {
  modo: Modo;
  preferencia: PreferenciaModo;
  mudarPreferencia: (p: PreferenciaModo) => void;
}

const ModoContext = createContext<ModoContextData>({
  modo: 'web',
  preferencia: 'auto',
  mudarPreferencia: () => undefined,
});

export function ModoProvider({ children }: { children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaModo>(lerPreferencia);
  const [modo, setModo] = useState<Modo>(() => calcularModo());

  const recalcular = useCallback(() => {
    const p = lerPreferencia();
    setPreferencia(p);
    setModo(calcularModo(p));
  }, []);

  useEffect(() => {
    const telas = window.matchMedia(`(max-width: ${LARGURA_MOBILE}px)`);
    const app = window.matchMedia('(display-mode: standalone)');
    telas.addEventListener('change', recalcular);
    app.addEventListener('change', recalcular);
    window.addEventListener(EVENTO_MODO, recalcular);
    window.addEventListener('storage', recalcular);
    return () => {
      telas.removeEventListener('change', recalcular);
      app.removeEventListener('change', recalcular);
      window.removeEventListener(EVENTO_MODO, recalcular);
      window.removeEventListener('storage', recalcular);
    };
  }, [recalcular]);

  // Classe no <html> para o CSS (ex.: esconder barras de rolagem no modo Mobile)
  useEffect(() => {
    document.documentElement.classList.toggle('krypta-mobile', modo === 'mobile');
  }, [modo]);

  const mudarPreferencia = useCallback((p: PreferenciaModo) => salvarPreferencia(p), []);

  return <ModoContext.Provider value={{ modo, preferencia, mudarPreferencia }}>{children}</ModoContext.Provider>;
}

export const useModo = () => useContext(ModoContext);
