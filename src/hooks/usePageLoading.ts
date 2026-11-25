import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface Options {
  minDuration?: number;   // tempo mínimo visível
  maxDuration?: number;   // fallback de segurança
}

export function usePageLoading({
  minDuration = 350,   // v1.3.0: transição curta (antes 1,1 s)
  maxDuration = 1500,
}: Options = {}): boolean {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ignora a primeira renderização (evita mostrar loading ao abrir o site)
    if (typeof window !== 'undefined' && !window.__kryptaFirstLoad) {
      window.__kryptaFirstLoad = true;
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    // Aguarda o próximo frame pra dar tempo da página montar
    const raf = requestAnimationFrame(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      const timer = setTimeout(() => {
        setLoading(false);
      }, remaining);

      const maxTimer = setTimeout(() => {
        setLoading(false);
      }, maxDuration);

      return () => {
        clearTimeout(timer);
        clearTimeout(maxTimer);
      };
    });

    return () => cancelAnimationFrame(raf);
  }, [location.pathname, minDuration, maxDuration]);

  return loading;
}

// Tipagem global
declare global {
  interface Window {
    __kryptaFirstLoad?: boolean;
  }
}