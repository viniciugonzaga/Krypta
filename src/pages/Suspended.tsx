import { Link } from 'react-router-dom';
import { AlertOctagon, Mail, Home, ShieldOff } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Suspended() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-krypta-black relative p-6 overflow-hidden">
      {/* Fundo */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-15" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-900/20 blur-[200px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-900/20 blur-[180px] rounded-full" />

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Ícone */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500 blur-[60px] opacity-40 rounded-full" />
            <div className="relative w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.4)]">
              <AlertOctagon className="w-12 h-12 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-xs text-amber-400 font-mono tracking-[0.4em] uppercase mb-4">
          // Conta Suspensa
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 leading-tight">
          Acesso{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
            Temporariamente
          </span>{' '}
          Bloqueado
        </h1>

        <p className="text-white/70 leading-relaxed mb-10 max-w-lg mx-auto">
          Sua conta foi suspensa por motivos de segurança. Todos os dados permanecem intactos
          e protegidos. Entre em contato com o suporte para reativar o acesso.
        </p>

        {/* Info box */}
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-6 mb-10 backdrop-blur-xl text-left">
          <div className="flex items-start gap-3">
            <ShieldOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-semibold mb-2">O que fazer agora?</p>
              <ul className="text-xs text-white/70 space-y-1.5">
                <li>• Verifique seu e-mail para notificações do Krypta</li>
                <li>• Contate nosso suporte com seu e-mail de cadastro</li>
                <li>
                  • Informe o código:{' '}
                  <span className="font-mono text-amber-400 font-bold">423-SUSPENDED</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:suporte@krypta.com"
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all"
          >
            <Mail className="w-4 h-4" /> Contatar Suporte
          </a>
          <Link to="/">
            <Button variant="secondary" className="px-8 py-3">
              <Home className="w-4 h-4" /> Voltar ao Início
            </Button>
          </Link>
        </div>

        {/* Rodapé */}
        <p className="mt-10 text-xs text-white/30 font-mono">
          KRYPTA • Erro 423 • {new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  );
}