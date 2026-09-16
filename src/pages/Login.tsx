import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, Mail, Shield, Usb } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await signIn(email, password);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-krypta-black relative p-4 overflow-hidden">
      {/* Fundo com grid + orbes */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-30" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-krypta-purple rounded-full filter blur-[200px] opacity-20" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-krypta-cyan rounded-full filter blur-[150px] opacity-10" />

      {/* Container Principal - Split Diagonal */}
      <div className="w-full max-w-5xl z-10 relative">
        <div className="relative grid grid-cols-1 md:grid-cols-2 bg-krypta-black/60 backdrop-blur-2xl rounded-3xl overflow-hidden border border-krypta-purple/30 shadow-[0_0_60px_rgba(141,81,255,0.3)] min-h-[600px]">
          
          {/* CORTE DIAGONAL DECORATIVO (visível em desktop) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="diagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#310788" />
                  <stop offset="50%" stopColor="#8d51ff" />
                  <stop offset="100%" stopColor="#8445d6" />
                </linearGradient>
              </defs>
              <polygon points="55,0 100,0 100,100 35,100" fill="url(#diagGrad)" />
            </svg>
          </div>

          {/* LADO ESQUERDO - Formulário */}
          <div className="relative z-10 p-10 md:p-14 flex flex-col justify-center">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-10 h-10 text-krypta-purple drop-shadow-[0_0_15px_rgba(141,81,255,0.9)]" />
                <span className="text-lg font-display font-bold tracking-[0.3em] text-krypta-lilac">KRYPTA</span>
              </div>
              <h2 className="text-4xl font-display font-bold text-white mb-2">Login</h2>
              <p className="text-krypta-white/40 text-sm">Acesse seu cofre digital seguro.</p>
            </div>

            {/* Status do Hardware */}
            <div className="mb-6 flex items-center gap-2 text-xs bg-krypta-purple/10 border border-krypta-purple/30 rounded-full py-2 px-4 w-fit">
              <Usb className="w-3.5 h-3.5 text-krypta-purple" />
              <span className="text-krypta-lilac">Hardware Conectado</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,1)]" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                label="Username / E-mail"
                type="email"
                placeholder="seu@email.com"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Senha Mestre"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" fullWidth className="mt-6">
                Entrar no Cofre
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs">
              <Link to="/register" className="text-krypta-purple hover:text-krypta-lilac transition-colors">
                Não tem conta? <span className="font-bold">Registre-se</span>
              </Link>
              <button className="text-krypta-white/40 hover:text-krypta-lilac">Esqueci a senha</button>
            </div>

            <button className="mt-6 flex items-center justify-center gap-2 text-xs text-krypta-cyan/70 hover:text-krypta-cyan border border-krypta-cyan/20 hover:border-krypta-cyan/50 rounded-lg py-2.5 transition-all">
              <Fingerprint className="w-4 h-4" /> Usar Biometria
            </button>
          </div>

          {/* LADO DIREITO - Welcome Back (Sobre o gradiente diagonal) */}
          <div className="hidden md:flex relative z-10 p-14 flex-col justify-center items-end text-right">
            <h2 className="text-4xl lg:text-5xl font-display font-black text-white mb-4 leading-tight drop-shadow-lg">
              WELCOME<br />BACK!
            </h2>
            <p className="text-white/80 max-w-xs leading-relaxed text-sm">
              Seu cofre digital está protegido e pronto. Conecte o hardware para liberar o acesso às suas credenciais.
            </p>
            <div className="mt-8 flex gap-2 items-center text-xs text-white/60 font-mono">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>CONEXÃO CIFRADA</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}