import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div className={`
      relative
      bg-gradient-to-br from-krypta-dark/60 via-krypta-black/40 to-krypta-deep/60
      backdrop-blur-xl 
      border border-krypta-purple/20 
      rounded-2xl 
      p-8 
      ${glow ? 'shadow-glow' : 'shadow-2xl'} 
      hover:border-krypta-purple/40
      transition-all duration-500
      ${className}
    `}>
      {/* Cantos decorativos */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-krypta-purple/50 rounded-tl-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-krypta-purple/50 rounded-br-2xl pointer-events-none" />
      {children}
    </div>
  );
}