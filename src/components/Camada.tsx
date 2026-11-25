// src/components/Camada.tsx
// v1.5.0 — janelas e folhas por cima de TUDO.
// No app, o conteúdo da tela fica numa camada abaixo da barra de baixo; uma janela
// aberta dentro dele ficava "por baixo" da barra (texto e botões escondidos).
// Renderizando direto no <body>, a janela sempre fica por cima.
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export function Camada({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
}
