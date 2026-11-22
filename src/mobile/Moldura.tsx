// src/mobile/Moldura.tsx
// A mesma tela serve aos dois modos:
//   • modo Mobile → dentro do app (MobileShell, com a barra de baixo)
//   • modo Web    → página do site (Navbar + Footer)
import type { ReactNode } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useModo } from './ModoContext';
import { MobileShell, useMCores } from './ui';

export function Moldura({ children, voltar }: { children: ReactNode; voltar: string | true }) {
  const { modo } = useModo();
  const c = useMCores();
  if (modo === 'mobile') return <MobileShell voltar={voltar}>{children}</MobileShell>;
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'rgb(var(--krypta-bg))', color: c.texto }}>
      <Navbar />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-32 pb-16">{children}</main>
      <Footer />
    </div>
  );
}
