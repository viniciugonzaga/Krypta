import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowRight, Fingerprint, Lock, Shield, Wifi, Cpu, LayoutDashboard,
  Key, Settings as SettingsIcon, ChevronRight, AlertTriangle, Brain,
  Users, Sparkles, Zap, CheckCircle2, UserPlus,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Welcome() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-krypta-black">
      <Navbar />

      {/* Efeitos de fundo */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-krypta-violet rounded-full mix-blend-screen filter blur-[150px] opacity-25 animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-krypta-purple rounded-full mix-blend-screen filter blur-[150px] opacity-15 animate-pulse-slow" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-30 pointer-events-none" />

      <div className="h-32" />

      {/* ================= HERO ================= */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="mb-10 relative"
        >
          <div className="absolute inset-0 bg-krypta-purple blur-[80px] opacity-60 rounded-full animate-pulse" />
          <div className="absolute inset-0 bg-krypta-lilac blur-[100px] opacity-20 rounded-full" />
          <Shield className="w-40 h-40 text-krypta-purple relative z-10 mx-auto drop-shadow-[0_0_30px_rgba(97,49,201,1)]" strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-7xl md:text-9xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-krypta-lilac to-krypta-purple mb-6 tracking-tighter neon-text"
        >
          KRYPTA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-krypta-white/70 max-w-2xl mb-4 font-light"
        >
          Seu cofre digital portátil.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-sm md:text-base text-krypta-lilac/70 max-w-2xl mb-12 font-mono tracking-widest uppercase"
        >
          Segurança militar | Autenticação física | Zero-Knowledge
        </motion.p>
      </main>

      {/* ================= SEÇÃO: USUÁRIO ================= */}
      <section className="max-w-4xl mx-auto px-6 py-16 z-10 w-full">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7 }}>
          {!user ? (
            <div className="relative bg-gradient-to-br from-krypta-purple/15 via-krypta-black/60 to-krypta-violet/15 border border-krypta-purple/40 rounded-3xl p-10 backdrop-blur-2xl overflow-hidden shadow-[0_0_60px_rgba(97,49,201,0.35)]">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-krypta-purple/25 blur-[100px] rounded-full" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-krypta-violet/20 blur-[100px] rounded-full" />

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-br from-krypta-purple to-krypta-violet flex items-center justify-center shadow-glow">
                  <UserPlus className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-xs text-krypta-lilac/80 font-mono tracking-[0.3em] uppercase mb-2">
                    // Comece agora
                  </div>
                  <h3 className="text-3xl font-display font-bold text-white mb-2">Faça seu cadastro no Krypta</h3>
                  <p className="text-krypta-white/60 leading-relaxed">
                    Crie sua conta administrativa, adquira seu hardware e comece a proteger suas credenciais
                    com criptografia AES-256 e autenticação por fator de posse física.
                  </p>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <Link to="/register"><Button variant="primary" className="px-8 py-4">Criar Conta <ArrowRight size={18} /></Button></Link>
                  <Link to="/login"><Button variant="secondary" className="px-8 py-4">Já tenho conta</Button></Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-gradient-to-br from-krypta-purple/25 via-krypta-black/60 to-krypta-violet/20 border border-krypta-purple/50 rounded-3xl p-10 backdrop-blur-2xl overflow-hidden shadow-[0_0_80px_rgba(97,49,201,0.45)]">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-krypta-purple/35 blur-[100px] rounded-full animate-pulse" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-krypta-violet/25 blur-[100px] rounded-full" />

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-20 h-20 shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-krypta-purple to-krypta-lilac rounded-2xl blur-lg opacity-70" />
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-krypta-violet via-krypta-purple to-krypta-lilac flex items-center justify-center shadow-glow">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-xs text-krypta-lilac/80 font-mono tracking-[0.3em] uppercase mb-2 flex items-center justify-center md:justify-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-krypta-plasma animate-pulse shadow-[0_0_6px_rgba(139,135,210,1)]" />
                    Sessão ativa
                  </div>
                  <h3 className="text-3xl font-display font-bold text-white mb-2">
                    Seja bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-krypta-lilac to-krypta-plasma">{user.name.split(' ')[0]}</span>!
                  </h3>
                  <p className="text-krypta-white/60 leading-relaxed">
                    Seu cofre está pronto para uso. Gerencie suas credenciais, visualize backups e acesse o painel completo.
                  </p>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <Link to="/dashboard"><Button variant="primary" className="px-8 py-4">Ir ao Dashboard <ArrowRight size={18} /></Button></Link>
                  <Link to="/profile"><Button variant="secondary" className="px-8 py-4">Meu Perfil</Button></Link>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* ================= PROBLEMA ================= */}
      <section className="max-w-6xl mx-auto px-6 py-16 z-10 w-full">
        <div className="text-center mb-12">
          <div className="text-xs text-krypta-lilac/80 font-mono tracking-[0.4em] uppercase mb-3">// O Problema</div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-krypta-lilac mb-4">
            Por que o <span className="text-transparent bg-clip-text bg-gradient-to-r from-krypta-purple to-krypta-lilac">Krypta</span> existe?
          </h2>
          <p className="text-krypta-white/60 max-w-2xl mx-auto">
            A digitalização dos serviços tornou a segurança de dados uma necessidade. Mas os métodos atuais falham em proteger os usuários.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: AlertTriangle, title: 'Ciberataques', desc: 'Vazamentos de dados e invasões remotas crescem exponencialmente no Brasil.' },
            { icon: Brain, title: 'Memória', desc: 'Usuários reutilizam senhas ou as anotam de forma insegura por não conseguirem memorizar.' },
            { icon: Users, title: 'Inclusão', desc: 'Idosos e pessoas com limitações cognitivas encontram barreiras em gerenciadores complexos.' },
            { icon: Lock, title: 'Roubo de Identidade', desc: 'Credenciais comprometidas resultam em fraudes financeiras e perda de privacidade.' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="relative bg-gradient-to-br from-krypta-dark/50 to-krypta-black/70 border border-krypta-purple/25 p-6 rounded-2xl backdrop-blur-xl hover:border-krypta-purple/70 transition-all group"
            >
              <div className="w-12 h-12 bg-krypta-purple/15 rounded-xl flex items-center justify-center mb-4 border border-krypta-purple/40 group-hover:scale-110 transition-all">
                <item.icon className="w-6 h-6 text-krypta-lilac" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-krypta-white/50 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= TRINDADE CRIPTOGRÁFICA ================= */}
      <section className="max-w-6xl mx-auto px-6 py-16 z-10 w-full">
        <div className="text-center mb-12">
          <div className="text-xs text-krypta-lilac/80 font-mono tracking-[0.4em] uppercase mb-3">// Como Funciona</div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-krypta-lilac mb-4">
            A Trindade <span className="text-transparent bg-clip-text bg-gradient-to-r from-krypta-purple to-krypta-lilac">Criptográfica</span>
          </h2>
          <p className="text-krypta-white/60 max-w-2xl mx-auto">Três pilares de segurança de nível militar sustentam cada operação do Krypta.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Lock, title: 'AES-256-GCM', subtitle: 'Criptografia Simétrica', desc: 'O padrão ouro mundial. Seus dados são cifrados com uma chave de 256 bits e validados com um selo de autenticidade (MAC) que detecta qualquer alteração.' },
            { icon: Fingerprint, title: 'Ed25519', subtitle: 'Identidade 1:1', desc: 'Cada hardware gera um par de chaves único. A chave privada nunca sai do chip, criando um vínculo inquebrável com sua conta.' },
            { icon: Zap, title: 'Argon2id', subtitle: 'Derivação de Chave', desc: 'Transforma sua senha mestra em uma chave robusta. Ataques de força bruta por GPU/ASIC se tornam economicamente inviáveis.' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="relative bg-gradient-to-br from-krypta-purple/12 via-krypta-black/70 to-krypta-violet/10 border border-krypta-purple/35 p-8 rounded-2xl backdrop-blur-xl hover:border-krypta-purple/70 transition-all group overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-krypta-purple/25 blur-3xl rounded-full group-hover:bg-krypta-purple/35 transition-all" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-krypta-purple/20 rounded-xl flex items-center justify-center mb-6 border border-krypta-purple/45 group-hover:scale-110 group-hover:bg-krypta-purple/30 transition-all">
                  <item.icon className="w-7 h-7 text-krypta-lilac" />
                </div>
                <div className="text-[10px] text-krypta-lilac/80 font-mono tracking-[0.2em] uppercase mb-2">{item.subtitle}</div>
                <h3 className="text-2xl font-display font-bold text-krypta-lilac mb-3">{item.title}</h3>
                <p className="text-sm text-krypta-white/60 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= PÚBLICO-ALVO ================= */}
      <section className="max-w-6xl mx-auto px-6 py-16 z-10 w-full">
        <div className="text-center mb-12">
          <div className="text-xs text-krypta-lilac/80 font-mono tracking-[0.4em] uppercase mb-3">// Para quem é</div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-krypta-lilac mb-4">
            Feito para <span className="text-transparent bg-clip-text bg-gradient-to-r from-krypta-purple to-krypta-lilac">todos</span>
          </h2>
          <p className="text-krypta-white/60 max-w-2xl mx-auto">Segurança de nível militar com usabilidade pensada para o cidadão comum.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Users, label: 'Usuários online' },
            { icon: Cpu, label: 'Empresas' },
            { icon: Brain, label: 'Estudantes' },
            { icon: Shield, label: 'Profissionais' },
            { icon: Users, label: 'Famílias' },
            { icon: Lock, label: 'Quem busca segurança' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="flex flex-col items-center gap-3 p-4 text-center group cursor-default"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-krypta-purple/25 to-krypta-violet/15 border border-krypta-purple/45 flex items-center justify-center group-hover:scale-110 group-hover:border-krypta-purple/80 group-hover:shadow-glow transition-all duration-300">
                <item.icon className="w-7 h-7 text-krypta-lilac" />
              </div>
              <span className="text-xs text-krypta-white/60 font-medium">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= ACESSO RÁPIDO ================= */}
      <section className="max-w-6xl mx-auto px-6 py-16 z-10 w-full">
        <div className="text-center mb-12">
          <div className="text-xs text-krypta-lilac/80 font-mono tracking-[0.4em] uppercase mb-3">// Acesso Rápido</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-krypta-lilac">
            Explore o <span className="text-transparent bg-clip-text bg-gradient-to-r from-krypta-purple to-krypta-lilac">Sistema</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { to: '/dashboard', icon: LayoutDashboard, title: 'Dashboard', desc: 'Painel principal com estatísticas, atividade recente e status do cofre em tempo real.', color: '#6131C9' },
            { to: '/vault', icon: Key, title: 'Cofre de Credenciais', desc: 'Gerencie senhas, acessos e chaves criptografadas com segurança militar.', color: '#8B87D2' },
            { to: '/settings', icon: SettingsIcon, title: 'Configurações', desc: 'Personalize aparência, notificações e parâmetros avançados de segurança.', color: '#51008D' },
          ].map((card, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: idx * 0.1 }}>
              <Link
                to={card.to}
                className="group relative block bg-gradient-to-br from-krypta-dark/70 via-krypta-black/50 to-krypta-deep/70 border border-krypta-purple/35 rounded-2xl p-8 backdrop-blur-xl hover:border-krypta-purple/75 transition-all duration-500 overflow-hidden hover:shadow-glow"
              >
                <div className="absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full opacity-15 group-hover:opacity-35 transition-all" style={{ backgroundColor: card.color }} />
                <div className="relative z-10">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center border mb-6 group-hover:scale-110 transition-all"
                    style={{ backgroundColor: `${card.color}20`, borderColor: `${card.color}50` }}
                  >
                    <card.icon className="w-7 h-7" style={{ color: card.color }} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-krypta-white/50 mb-6 leading-relaxed">{card.desc}</p>
                  <div className="flex items-center gap-2 text-sm text-krypta-lilac font-medium group-hover:gap-4 transition-all">
                    Acessar <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= DIFERENCIAIS ================= */}
      <section className="max-w-6xl mx-auto px-6 py-16 z-10 w-full">
        <div className="text-center mb-12">
          <div className="text-xs text-krypta-lilac/80 font-mono tracking-[0.4em] uppercase mb-3">// Diferenciais</div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-krypta-lilac mb-4">
            O que torna o <span className="text-transparent bg-clip-text bg-gradient-to-r from-krypta-purple to-krypta-lilac">Krypta</span> único
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {[
            'Autenticação em múltiplos fatores',
            'Comunicação NFC por proximidade',
            'Criptografia AES-256 das credenciais',
            'Dispositivo físico portátil',
            'Zero-Knowledge: nem nós vemos seus dados',
            'Fail-Close: bloqueio instantâneo ao desconectar',
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="flex items-center gap-3 p-4 bg-krypta-purple/8 border border-krypta-purple/25 rounded-xl hover:border-krypta-purple/55 hover:bg-krypta-purple/15 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-krypta-purple/20 border border-krypta-purple/35 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4 text-krypta-lilac" />
              </div>
              <span className="text-sm text-krypta-white/80 font-medium">{feature}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="relative z-10 border-t border-krypta-purple/20 mt-16 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-krypta-purple" />
            <div>
              <p className="text-lg font-display font-bold tracking-widest text-krypta-lilac">KRYPTA</p>
              <p className="text-[10px] text-krypta-white/40 font-mono tracking-wider">COFRE DIGITAL PORTÁTIL</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-krypta-white/50">
            <span>© 2026 Krypta — TCC Técnico em Desenvolvimento de Sistemas</span>
            <span className="hidden md:block w-px h-4 bg-krypta-purple/30" />
            <span className="font-mono">ETEC Zona Leste • São Paulo</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-krypta-lilac/80 font-mono">
            <div className="w-2 h-2 rounded-full bg-krypta-plasma animate-pulse shadow-[0_0_8px_rgba(139,135,210,1)]" />
            SISTEMA ATIVO
          </div>
        </div>
      </footer>
    </div>
  );
}