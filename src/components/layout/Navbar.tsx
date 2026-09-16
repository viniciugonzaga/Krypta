import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Briefcase, Mail, Info, User, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'blogs', label: 'Blogs', icon: BookOpen, path: '/blogs' },
  { id: 'services', label: 'Services', icon: Briefcase, path: '/services' },
  { id: 'contact', label: 'Contact', icon: Mail, path: '/contact' },
  { id: 'about', label: 'About', icon: Info, path: '/about' },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>(() => {
    const found = navItems.find((item) => item.path === location.pathname);
    return found ? found.id : 'home';
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // O item que está "destacado" — prioridade: hover > ativo
  const highlightedId = hoveredId || activeId;

  const handleSignOut = () => {
    signOut();
    setIsProfileOpen(false);
    navigate('/');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4">
      <nav
        className="relative"
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="flex items-center gap-3">
          {/* ====== MENU PRINCIPAL ====== */}
          <ul className="relative flex items-center gap-2 bg-krypta-black/70 backdrop-blur-2xl border border-krypta-purple/30 rounded-full px-3 py-2 shadow-[0_0_40px_rgba(141,81,255,0.3)]">
            {navItems.map((item) => {
              const isHighlighted = highlightedId === item.id;
              const Icon = item.icon;

              return (
                <li key={item.id} className="relative">
                  <Link
                    to={item.path}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onClick={() => setActiveId(item.id)}
                    className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors duration-300 ${
                      isHighlighted ? 'text-white' : 'text-krypta-white/50 hover:text-krypta-lilac'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={`transition-colors ${isHighlighted ? 'text-krypta-cyan' : ''}`}
                    />
                    <span className="relative z-10">{item.label}</span>

                    {/* PILULA ATIVA */}
                    {isHighlighted && (
                      <motion.div
                        layoutId="activePill"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-krypta-purple/40 via-krypta-magenta/30 to-krypta-purple/40 border border-krypta-purple/60"
                        style={{
                          boxShadow:
                            '0 0 20px rgba(141,81,255,0.6), inset 0 0 20px rgba(141,81,255,0.2)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}

                    {/* RAIO + BARRA que segue o mouse */}
                    {isHighlighted && (
                      <motion.div
                        layoutId="lightningBeam"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 pointer-events-none"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      >
                        {/* Halo externo difuso */}
                        <div className="relative w-full flex justify-center">
                          <div className="absolute w-32 h-2 bg-krypta-cyan/40 blur-md rounded-full" />
                          <div className="w-20 h-[3px] bg-gradient-to-r from-transparent via-krypta-cyan to-transparent rounded-full shadow-[0_0_15px_rgba(0,240,255,0.9)]" />
                        </div>

                        {/* Raio zigue-zague SVG com flicker animado */}
                        <motion.svg
                          width="24"
                          height="14"
                          viewBox="0 0 24 14"
                          className="absolute left-1/2 -translate-x-1/2 -top-1 drop-shadow-[0_0_10px_rgba(0,240,255,0.9)]"
                          animate={{ opacity: [0.7, 1, 0.85, 1, 0.7] }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <path
                            d="M12 0 L10 5 L14 5 L12 0 Z M12 5 L9 9 L13 9 L12 5 Z M12 9 L10 14 L14 14 L12 9 Z"
                            fill="#00f0ff"
                            opacity="0.85"
                          />
                          <circle cx="12" cy="0" r="1.5" fill="#00f0ff" />
                        </motion.svg>

                        {/* Chispas laterais */}
                        <motion.div
                          className="absolute w-1 h-1 bg-krypta-cyan rounded-full"
                          initial={{ x: -30, y: 0, opacity: 0 }}
                          animate={{ x: -40, y: -6, opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="w-1 h-1 bg-krypta-purple rounded-full absolute"
                          initial={{ x: 30, y: 0, opacity: 0 }}
                          animate={{ x: 40, y: -6, opacity: [0, 1, 0] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: 'easeOut',
                            delay: 0.3,
                          }}
                        />
                      </motion.div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* ====== ÁREA DE AUTENTICAÇÃO (canto direito) ====== */}
          <div className="relative">
            {!user ? (
              /* Não logado: botões Entrar / Criar Conta */
              <div className="flex items-center gap-2 bg-krypta-black/70 backdrop-blur-2xl border border-krypta-purple/30 rounded-full p-1.5 shadow-[0_0_40px_rgba(141,81,255,0.3)]">
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-full text-sm font-medium text-krypta-white/60 hover:text-white hover:bg-krypta-purple/10 transition-all"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r from-krypta-purple to-krypta-magenta hover:shadow-glow transition-all"
                >
                  Criar Conta
                </Link>
              </div>
            ) : (
              /* Logado: avatar + nome + dropdown */
              <div
                className="relative"
                onMouseEnter={() => setIsProfileOpen(true)}
                onMouseLeave={() => setIsProfileOpen(false)}
              >
                <button
                  className="flex items-center gap-3 bg-krypta-black/70 backdrop-blur-2xl border border-krypta-purple/30 rounded-full pl-2 pr-4 py-1.5 shadow-[0_0_40px_rgba(141,81,255,0.3)] hover:border-krypta-purple/60 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-krypta-purple via-krypta-magenta to-krypta-cyan flex items-center justify-center border border-krypta-purple/40">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white max-w-[120px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-krypta-lilac transition-transform duration-300 ${
                      isProfileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 bg-krypta-black/90 backdrop-blur-2xl border border-krypta-purple/40 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(141,81,255,0.4)]"
                    >
                      {/* Header com status */}
                      <div className="px-4 py-3 border-b border-krypta-purple/20 bg-gradient-to-br from-krypta-purple/10 to-transparent">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-green-400 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          SESSÃO ATIVA
                        </div>
                        <p className="text-xs text-krypta-white/60 truncate">{user.email}</p>
                      </div>

                      {/* Opções */}
                      <div className="p-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-krypta-white/80 hover:bg-krypta-purple/15 hover:text-white transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-krypta-purple/10 flex items-center justify-center border border-krypta-purple/20 group-hover:bg-krypta-purple/20 transition-colors">
                            <User className="w-4 h-4 text-krypta-purple" />
                          </div>
                          <div>
                            <p className="font-medium">Meu Perfil</p>
                            <p className="text-[10px] text-krypta-white/40">Dados e segurança</p>
                          </div>
                        </Link>

                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-krypta-white/80 hover:bg-krypta-purple/15 hover:text-white transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-krypta-cyan/10 flex items-center justify-center border border-krypta-cyan/20 group-hover:bg-krypta-cyan/20 transition-colors">
                            <Shield className="w-4 h-4 text-krypta-cyan" />
                          </div>
                          <div>
                            <p className="font-medium">Dashboard</p>
                            <p className="text-[10px] text-krypta-white/40">Painel do cofre</p>
                          </div>
                        </Link>

                        <div className="h-px bg-krypta-purple/20 my-1" />

                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
                            <LogOut className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Desconectar</p>
                            <p className="text-[10px] text-red-400/50">Encerrar sessão</p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Detalhes de circuito nos cantos */}
        <svg
          className="absolute -top-2 -left-2 w-6 h-6 text-krypta-purple/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 20 L4 8 L12 8" />
          <circle cx="4" cy="20" r="1.5" fill="currentColor" />
        </svg>
        <svg
          className="absolute -top-2 -right-2 w-6 h-6 text-krypta-purple/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M20 20 L20 8 L12 8" />
          <circle cx="20" cy="20" r="1.5" fill="currentColor" />
        </svg>
      </nav>
    </div>
  );
}