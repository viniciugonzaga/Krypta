import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldAlert, User, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';

export function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validações locais
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (formData.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.name, formData.email, formData.password);
      navigate('/dashboard'); // Auto-login após cadastro
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-krypta-black relative p-4 py-12 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-20" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-krypta-purple blur-[180px] opacity-20 rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-krypta-cyan blur-[150px] opacity-10 rounded-full" />

      <Card className="w-full max-w-xl z-10 relative" glow>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-14 h-14 text-krypta-purple drop-shadow-[0_0_20px_rgba(141,81,255,0.9)]" />
          </div>
          <h2 className="text-3xl font-display font-bold text-krypta-lilac mb-2">Criar Conta</h2>
          <p className="text-krypta-white/50 text-sm">
            Inicie sua jornada com o cofre digital mais seguro do mundo.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <Input
            label="Nome Completo"
            type="text"
            placeholder="Seu nome"
            icon={User}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="E-mail Administrativo"
            type="email"
            placeholder="seu@email.com"
            icon={Mail}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Senha do Portal"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <Input
              label="Confirmar Senha"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>

          {/* Checklist de segurança */}
          <div className="bg-krypta-purple/5 border border-krypta-purple/20 rounded-lg p-4 space-y-2">
            <p className="text-xs text-krypta-lilac font-bold mb-2">Requisitos de segurança:</p>
            <div className="flex items-center gap-2 text-xs text-krypta-white/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-krypta-cyan" /> Mínimo 8 caracteres
            </div>
            <div className="flex items-center gap-2 text-xs text-krypta-white/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-krypta-cyan" /> Letras maiúsculas e minúsculas
            </div>
          </div>

          {/* AVISO SOBRE SENHA MESTRE */}
          <div className="bg-krypta-purple/10 border border-krypta-purple/30 rounded-lg p-4 flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-krypta-purple shrink-0 mt-0.5" />
            <p className="text-xs text-krypta-lilac/80 leading-relaxed">
              <strong>Atenção:</strong> Esta senha é apenas para o portal administrativo. Sua{' '}
              <strong>Senha Mestre</strong> será criada após conectar o hardware físico.
            </p>
          </div>

          {/* ERRO (aqui está o lugar certo!) */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="lgpd" required className="accent-krypta-purple w-4 h-4" />
            <label htmlFor="lgpd" className="text-xs text-krypta-white/50">
              Aceito os termos de uso e a política de privacidade (LGPD).
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            className="mt-6"
            disabled={loading}
          >
            {loading ? 'Criando conta...' : 'Criar Conta Administrativa'}
          </Button>
        </form>

        <p className="text-center text-sm text-krypta-white/50 mt-6">
          Já tem uma conta?{' '}
          <Link
            to="/login"
            className="text-krypta-purple hover:text-krypta-lilac transition-colors font-bold"
          >
            Faça login
          </Link>
        </p>
      </Card>
    </div>
  );
}