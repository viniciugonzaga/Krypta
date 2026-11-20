// src/pages/RecoverPassword.tsx
// ============================================================
// RECUPERAR A SENHA DO SITE (/recover)
//   1. e-mail → o servidor manda um código (vale 30 min)
//   2. código + nova senha → todas as sessões abertas são encerradas
//   3. pronto → volta para o login
//
// Esta é a senha do SITE. O cofre não depende dela: ele é aberto pelo
// dispositivo ou pela chave de contingência (CCP).
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { AuthAPI, handleApiError } from '../services/api';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GRAD = 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)';

type Step = 'email' | 'code' | 'done';
const PASSOS: Array<{ id: Step; label: string }> = [
  { id: 'email', label: 'E-mail' },
  { id: 'code', label: 'Código' },
  { id: 'done', label: 'Pronto' },
];

/** 0–4: tamanho, maiúsc./minúsc., número, símbolo */
function forcaSenha(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function RecoverPassword() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reenviarEm, setReenviarEm] = useState(0);
  const [redirecionarEm, setRedirecionarEm] = useState(5);

  const bright = isDark ? '#a97aff' : '#6131C9';
  const fg = isDark ? '#FFFFFF' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(26,26,26,0.7)';
  const border = isDark ? 'rgba(141,81,255,0.45)' : 'rgba(81,0,189,0.25)';
  const fieldBg = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.95)';

  // Contagem para reenviar o código
  useEffect(() => {
    if (reenviarEm <= 0) return;
    const t = setTimeout(() => setReenviarEm((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenviarEm]);

  // Concluído: volta ao login sozinho
  useEffect(() => {
    if (step !== 'done') return;
    if (redirecionarEm <= 0) {
      navigate('/login', { replace: true });
      return;
    }
    const t = setTimeout(() => setRedirecionarEm((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, redirecionarEm, navigate]);

  const forca = forcaSenha(newPassword);
  const corForca = ['#f87171', '#f87171', '#f59e0b', '#22c55e', '#22c55e'][forca];
  const rotuloForca = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'][forca];

  const pedirCodigo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      await AuthAPI.requestRecovery(email.trim().toLowerCase());
      setStep('code');
      setReenviarEm(60);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const redefinir = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 6) return setError('Digite o código que chegou no seu e-mail.');
    if (newPassword.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    if (newPassword !== confirmPassword) return setError('As senhas não coincidem.');

    setLoading(true);
    try {
      await AuthAPI.resetPassword(email.trim().toLowerCase(), code.trim().toUpperCase(), newPassword);
      setStep('done');
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const campo = 'w-full py-3 pl-11 pr-4 rounded-lg text-[14px] outline-none transition-all focus:ring-2 focus:ring-purple-500/50';
  const estiloCampo = { background: fieldBg, border: `1px solid ${border}`, color: fg };
  const rotulo = 'block text-[10.5px] font-semibold tracking-[0.12em] uppercase mb-1.5';
  const passoAtual = PASSOS.findIndex((p) => p.id === step);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'rgb(var(--krypta-bg))', color: fg }}>
      <Navbar />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
        <motion.div
          className="absolute top-[-10%] right-[-10%] w-[560px] h-[560px] rounded-full blur-[180px]"
          style={{ background: `${bright}33` }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 7, repeat: Infinity }}
        />
        <div className="absolute bottom-[-15%] left-[-10%] w-[480px] h-[480px] rounded-full blur-[170px]" style={{ background: `${bright}22` }} />
      </div>

      <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: isDark
              ? 'linear-gradient(160deg, rgba(25,6,55,0.92) 0%, rgba(0,0,0,0.88) 100%)'
              : 'linear-gradient(160deg, #FFFFFF 0%, #F4F0FC 100%)',
            border: `1px solid ${border}`,
            boxShadow: isDark ? '0 0 36px rgba(97,49,201,0.3)' : '0 12px 36px rgba(81,0,189,0.12)',
          }}
        >
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: GRAD, boxShadow: '0 0 24px rgba(141,81,255,0.45)' }}>
            {step === 'done' ? <ShieldCheck className="w-7 h-7 text-white" /> : <KeyRound className="w-7 h-7 text-white" />}
          </div>
          <h1 className="text-2xl md:text-3xl text-center mb-1" style={{ fontFamily: ROUNDED_FONT, fontWeight: 700 }}>
            {step === 'email' ? 'Recuperar senha' : step === 'code' ? 'Crie a nova senha' : 'Senha alterada!'}
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: muted }}>
            {step === 'email' && 'Enviaremos um código para o e-mail da sua conta.'}
            {step === 'code' && (
              <>
                Código enviado para <strong style={{ color: fg }}>{email}</strong>. Ele vale 30 minutos.
              </>
            )}
            {step === 'done' && 'Por segurança, todas as sessões abertas foram encerradas.'}
          </p>

          {/* Passos */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {PASSOS.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={i <= passoAtual ? { background: GRAD, color: '#fff' } : { border: `1px solid ${border}`, color: muted }}
                >
                  {i < passoAtual || step === 'done' ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="text-xs hidden sm:inline" style={{ color: i <= passoAtual ? fg : muted }}>{p.label}</span>
                {i < PASSOS.length - 1 && <span className="w-6 h-px" style={{ background: border }} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.form key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={pedirCodigo} className="space-y-4" noValidate>
                <div>
                  <label className={rotulo} style={{ color: muted }}>E-mail da conta</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: bright }} />
                    <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={campo} style={estiloCampo} autoFocus />
                  </div>
                </div>
                {error && <Erro msg={error} />}
                <BotaoPrincipal loading={loading} texto="Enviar código" carregando="Enviando..." />
              </motion.form>
            )}

            {step === 'code' && (
              <motion.form key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={redefinir} className="space-y-4" noValidate>
                <div>
                  <label className={rotulo} style={{ color: muted }}>Código de recuperação</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: bright }} />
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXXXX-XXXXXX" autoComplete="one-time-code" spellCheck={false} className={`${campo} font-mono tracking-wider`} style={estiloCampo} autoFocus />
                  </div>
                </div>
                <div>
                  <label className={rotulo} style={{ color: muted }}>Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: bright }} />
                    <input type={verSenha ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={`${campo} pr-11`} style={estiloCampo} />
                    <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: muted }}>
                      {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i < forca ? corForca : border }} />
                        ))}
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: corForca }}>{rotuloForca}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className={rotulo} style={{ color: muted }}>Confirmar nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: bright }} />
                    <input type={verSenha ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={campo} style={estiloCampo} />
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && <p className="text-[11px] mt-1 text-red-400">As senhas não coincidem.</p>}
                </div>
                {error && <Erro msg={error} />}
                <BotaoPrincipal loading={loading} texto="Redefinir senha" carregando="Alterando..." />
                <div className="flex justify-between text-xs">
                  <button type="button" onClick={() => { setStep('email'); setError(null); }} style={{ color: muted }} className="hover:underline">
                    Trocar e-mail
                  </button>
                  <button type="button" disabled={reenviarEm > 0 || loading} onClick={() => pedirCodigo()} className="font-semibold hover:underline disabled:opacity-50 disabled:no-underline" style={{ color: bright }}>
                    {reenviarEm > 0 ? `Reenviar em ${reenviarEm}s` : 'Reenviar código'}
                  </button>
                </div>
                {import.meta.env.DEV && (
                  <p className="text-[10.5px]" style={{ color: muted }}>
                    Desenvolvimento: sem SMTP configurado, o código aparece no terminal do servidor.
                  </p>
                )}
              </motion.form>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                <motion.div
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.45)' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                >
                  <Check className="w-10 h-10 text-green-500" />
                </motion.div>
                <p className="text-sm" style={{ color: muted }}>
                  Indo para o login em <strong style={{ color: bright }}>{redirecionarEm}s</strong>...
                </p>
                <Link to="/login" replace className="block w-full py-3 rounded-xl font-bold text-white" style={{ background: GRAD, fontFamily: ROUNDED_FONT }}>
                  Entrar agora
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {step !== 'done' && (
            <div className="mt-6 pt-4 text-center" style={{ borderTop: `1px solid ${border}` }}>
              <Link to="/login" className="text-xs inline-flex items-center gap-1 hover:underline" style={{ color: muted }}>
                <ArrowLeft className="w-3 h-3" /> Voltar ao login
              </Link>
              <p className="text-[11px] mt-2" style={{ color: muted }}>
                Esta é a senha do site. Seu cofre continua protegido pelo dispositivo e pela CCP.
              </p>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

function Erro({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg p-3 flex items-start gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {msg}
    </div>
  );
}

function BotaoPrincipal({ loading, texto, carregando }: { loading: boolean; texto: string; carregando: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] disabled:opacity-60"
      style={{ background: GRAD, fontFamily: ROUNDED_FONT, boxShadow: '0 0 22px rgba(141,81,255,0.35)' }}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? carregando : texto}
    </button>
  );
}
