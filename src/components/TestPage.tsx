import type { LucideIcon } from 'lucide-react';

interface TestPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
}

export function TestPage({ title, description, icon: Icon, accent = '#8d51ff' }: TestPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center pt-32 pb-20 px-6">
      {/* Grid de fundo */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20 pointer-events-none" />

      {/* Orbes de luz */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full filter blur-[150px] opacity-20 animate-pulse-slow"
        style={{ backgroundColor: accent }}
      />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-krypta-cyan rounded-full filter blur-[120px] opacity-10" />

      {/* Conteúdo */}
      <div className="relative z-10 max-w-3xl text-center">
        <div className="flex justify-center mb-8">
          <div
            className="relative w-32 h-32 rounded-3xl flex items-center justify-center border border-krypta-purple/30 backdrop-blur-xl"
            style={{ boxShadow: `0 0 60px ${accent}66, inset 0 0 40px ${accent}22` }}
          >
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
              style={{ backgroundColor: accent }}
            />
            <Icon className="w-16 h-16 relative z-10" style={{ color: accent }} strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-xs text-krypta-cyan/70 font-mono tracking-[0.4em] uppercase mb-4">
          // Página de Teste
        </div>

        <h1 className="text-6xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-krypta-lilac to-krypta-purple mb-6 tracking-tight">
          {title}
        </h1>

        <p className="text-lg md:text-xl text-krypta-white/50 max-w-xl mx-auto leading-relaxed mb-10">
          {description}
        </p>

        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-krypta-purple/10 border border-krypta-purple/30 rounded-full text-xs font-mono text-krypta-lilac">
          <div className="w-2 h-2 rounded-full bg-krypta-cyan animate-pulse" />
          Rota de teste ativa — conteúdo em breve
        </div>
      </div>
    </div>
  );
}