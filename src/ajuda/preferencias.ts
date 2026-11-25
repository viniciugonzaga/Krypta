// src/ajuda/preferencias.ts
// v1.5.0 — "Mostrar o Cody flutuante" (Configurações do site/Windows e Ajustes do app).
// Desligado, o botão do canto some; o Cody continua no Início, no Perfil e na barra do app.
import { useEffect, useState } from 'react';

const CHAVE = '@Krypta:cody-flutuante';
const EVENTO = 'krypta:cody-flutuante';

export function codyFlutuanteLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== '0';
  } catch {
    return true;
  }
}

export function useCodyFlutuante(): [boolean, (v: boolean) => void] {
  const [ligado, setLigado] = useState(codyFlutuanteLigado);
  useEffect(() => {
    const f = () => setLigado(codyFlutuanteLigado());
    window.addEventListener(EVENTO, f);
    window.addEventListener('storage', f);
    return () => {
      window.removeEventListener(EVENTO, f);
      window.removeEventListener('storage', f);
    };
  }, []);
  const mudar = (v: boolean) => {
    try {
      localStorage.setItem(CHAVE, v ? '1' : '0');
    } catch {
      /* ok */
    }
    window.dispatchEvent(new Event(EVENTO));
  };
  return [ligado, mudar];
}
