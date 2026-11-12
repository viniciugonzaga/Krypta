import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { AuthAPI, handleApiError } from '../services/api';

type Step = 'email' | 'code' | 'done';

export function RecoverPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await AuthAPI.requestRecovery(email);
      setStep('code');
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await AuthAPI.resetPassword(email, code, newPassword);
      setStep('done');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-krypta-black relative p-4 py-12 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-20" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-krypta-purple blur-[180px] opacity-20 rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-krypta-violet blur-[150px] opacity-15 rounded-full" />

      <Card className="w-full max-w-md z-10 relative" glow>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-krypta-purple to-krypta-violet flex items-center justify-center shadow-glow">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-display font-bold text-krypta-lilac mb-2">
            {step === 'email' && 'Recuperar Senha'}
            {step === 'code' && 'Novo Código'}
            {step === 'done' && 'Tudo Pronto!'}
          </h2>
          <p className="text-white/60 text-sm">
            {step === 'email' && 'Enviaremos um código para o seu e-mail.'}
            {step === 'code' && 'Insira o código e defina uma nova senha.'}
            {step === 'done' && 'Sua senha foi alterada com sucesso.'}
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleRequestCode} className="space-y-5">
            <Input
              label="E-mail da conta"
              type="email"
              placeholder="seu@email.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Código'}
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleReset} className="space-y-5">
            <Input
              label="Código de Recuperação"
              type="text"
              placeholder="XXXXXX"
              icon={ShieldCheck}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <Input
              label="Nova Senha"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirmar Nova Senha"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Alterando...' : 'Redefinir Senha'}
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <p className="text-white/80 text-sm">
              Redirecionando para o login em{' '}
              <span className="text-krypta-lilac font-bold">3 segundos</span>...
            </p>
            <Link to="/login" className="block">
              <Button variant="primary" fullWidth>Ir para o Login</Button>
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao login
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}