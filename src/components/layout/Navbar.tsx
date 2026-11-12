// src/components/layout/Navbar.tsx
import { useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
  useScroll,
  useSpring,
} from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Briefcase,
  Mail,
  Info,
  User,
  LogOut,
  Sparkles,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

import logoBranco from '../../assets/logos/Krypta_Nav_Branco.png';
import logoPreto from '../../assets/logos/Krypta_Nav_Preto.png';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: typeof Home;
}

const baseNavItems: NavItem[] = [
  { id: 'inicio', label: 'Início', path: '/', icon: Home },
  { id: 'servicos', label: 'Serviços', path: '/services', icon: Briefcase },
  { id: 'produtos', label: 'Produtos', path: '/blogs', icon: BookOpen },
  { id: 'contatos', label: 'Contatos', path: '/contact', icon: Mail },
];

const kryptaNavItem: NavItem = { id: 'krypta', label: 'Krypta', path: '#', icon: Info };

const profileMenu = [
  { id: 'perfil', label: 'Perfil', path: '/profile', icon: User },
  { id: 'planos', label: 'Planos', path: '/plans', icon: Sparkles },
  { id: 'config', label: 'Configurações', path: '/settings', icon: Settings },
  { id: 'ajuda', label: 'Ajuda', path: '/contact', icon: HelpCircle },
];

const PURPLE = '#8d51ff';
const SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 };

const isPathActive = (itemPath: string, current: string) =>
  itemPath === '/' ? current === '/' : current.startsWith(itemPath);

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { isDark, toggleTheme } = useTheme();

  const w = compact ? 70 : 80;
  const h = compact ? 26 : 30;
  const thumb = h - 8;
  const travel = w - 2 - thumb - 6;

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className="relative rounded-full border overflow-hidden shrink-0 transition-all duration-500 hover:brightness-125"
      style={{
        width: w,
        height: h,
        background: isDark
          ? 'linear-gradient(135deg, rgba(20,5,45,0.9) 0%, rgba(0,0,0,0.85) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,237,248,0.9) 100%)',
        borderColor: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(81,0,189,0.45)',
        boxShadow: isDark
          ? '0 0 14px rgba(141,81,255,0.35), inset 0 0 8px rgba(141,81,255,0.1)'
          : '0 2px 10px rgba(81,0,189,0.12)',
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 font-semibold tracking-wide transition-all duration-500"
        style={{
          fontSize: compact ? 10 : 11,
          left: isDark ? 12 : 'auto',
          right: isDark ? 'auto' : 12,
          color: isDark ? '#FFFFFF' : '#5100BD',
        }}
      >
        {isDark ? 'Dark' : 'Light'}
      </span>

      <motion.span
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: thumb,
          height: thumb,
          top: 3,
          left: 3,
          background: isDark
            ? 'linear-gradient(135deg, #6131C9 0%, #8d51ff 100%)'
            : 'linear-gradient(135deg, #8d51ff 0%, #c6aef6 100%)',
          boxShadow: '0 0 14px rgba(141,81,255,0.65)',
        }}
        animate={{ x: isDark ? travel : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.8 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'moon' : 'sun'}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            {isDark ? (
              <Moon size={compact ? 11 : 13} className="text-white" strokeWidth={2.5} />
            ) : (
              <Sun size={compact ? 11 : 13} className="text-white" strokeWidth={2.5} />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  );
}

interface NavLinkItemProps {
  item: NavItem;
  isActive: boolean;
  isHovered: boolean;
  isDark: boolean;
  onHover: () => void;
}

function NavLinkItem({ item, isActive, isHovered, isDark, onHover }: NavLinkItemProps) {
  const [burst, setBurst] = useState(0);

  const color = isActive
    ? isDark
      ? '#B58CFF'
      : '#5100BD'
    : isHovered
      ? isDark
        ? '#FFFFFF'
        : '#5100BD'
      : isDark
        ? 'rgba(255,255,255,0.88)'
        : 'rgba(26,26,26,0.85)';

  return (
    <li className="relative h-full flex items-center" onMouseEnter={onHover}>
      {isHovered && (
        <span className="absolute inset-0 flex items-center pointer-events-none">
          <motion.span
            layoutId="nav-hover-pill"
            transition={SPRING}
            className="block w-full h-10 rounded-lg"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(141,81,255,0.22) 0%, rgba(97,49,201,0.1) 100%)'
                : 'linear-gradient(135deg, rgba(81,0,189,0.1) 0%, rgba(141,81,255,0.05) 100%)',
              border: `1px solid ${isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.2)'}`,
              boxShadow: isDark
                ? '0 0 18px rgba(141,81,255,0.25), inset 0 0 10px rgba(141,81,255,0.08)'
                : '0 4px 14px rgba(81,0,189,0.08)',
            }}
          />
        </span>
      )}

      <Link
        to={item.path}
        onClick={() => setBurst((b) => b + 1)}
        className="relative z-10 block px-4 py-2.5 whitespace-nowrap"
      >
        <motion.span
          className="relative inline-block text-[15px] font-medium transition-colors duration-300"
          animate={{ y: isHovered ? -1 : 0 }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{
            color,
            textShadow: isActive && isDark ? '0 0 14px rgba(141,81,255,0.7)' : 'none',
          }}
        >
          {item.label}
        </motion.span>
      </Link>

      {burst > 0 && (
        <motion.span
          key={burst}
          initial={{ opacity: 0.6, scale: 0.7 }}
          animate={{ opacity: 0, scale: 1.35 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="absolute inset-x-0 top-1/2 h-10 -mt-5 rounded-lg pointer-events-none"
          style={{ border: `1.5px solid ${isDark ? 'rgba(181,140,255,0.8)' : 'rgba(81,0,189,0.6)'}` }}
        />
      )}

      {isActive && (
        <span className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
          <motion.span
            layoutId="nav-active-indicator"
            transition={SPRING}
            className="block h-[3px] w-3/5 rounded-t-full"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, transparent, #B58CFF, transparent)'
                : 'linear-gradient(90deg, transparent, #5100BD, transparent)',
              boxShadow: isDark ? '0 0 14px 2px rgba(141,81,255,0.8)' : '0 0 8px rgba(81,0,189,0.5)',
            }}
          />
        </span>
      )}
    </li>
  );
}

function Avatar({ size = 44, isDark }: { size?: number; isDark: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size + 4, height: size + 4 }}>
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{
          background: isDark
            ? 'conic-gradient(from 0deg, #5100BD, #C6AEF6, #5100BD 40%, rgba(81,0,189,0.15) 60%, #5100BD)'
            : 'conic-gradient(from 0deg, #5100BD, #8d51ff, #5100BD 40%, rgba(81,0,189,0.15) 60%, #5100BD)',
          filter: isDark ? 'drop-shadow(0 0 8px rgba(141,81,255,0.7))' : 'none',
        }}
      />
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          inset: 2,
          background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
        }}
      >
        <User className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} fill="currentColor" strokeWidth={1.5} />
      </div>
      <span
        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2"
        style={{ borderColor: isDark ? '#0a0014' : '#FFFFFF' }}
      />
    </div>
  );
}

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: 'easeOut' as const, staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

const dropdownItemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
};

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isDark } = useTheme();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const spotColor = isDark ? 'rgba(141,81,255,0.2)' : 'rgba(81,0,189,0.08)';
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, ${spotColor}, transparent 70%)`;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const logoSrc = isDark ? logoBranco : logoPreto;
  
  const planRaw = (user as any)?.plan;
  const planLabel = planRaw
    ? planRaw === 'free'
      ? 'Gratuito'
      : planRaw.toUpperCase()
    : '';

  const textMain = isDark ? '#FFFFFF' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,26,0.6)';
  const accent = isDark ? PURPLE : '#5100BD';
  const borderSoft = isDark ? 'rgba(141,81,255,0.2)' : 'rgba(81,0,189,0.1)';

  // Adiciona o item Krypta dinamicamente se o usuário estiver logado
  const currentNavItems = user 
    ? [...baseNavItems, kryptaNavItem] 
    : baseNavItems;

  const handleSignOut = () => {
    signOut();
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  };

  return (
    <>
      <motion.div
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 110, damping: 18, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4"
      >
        <nav
          className="relative w-full max-w-7xl"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            mx.set(-400);
            my.set(-400);
          }}
        >
          <motion.div
            animate={{ height: isScrolled ? 60 : 68 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="relative flex items-center justify-between gap-6 px-6 rounded-xl backdrop-blur-2xl transition-[box-shadow,border-color,background] duration-500"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(14,3,32,0.92) 0%, rgba(0,0,0,0.88) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,247,251,0.92) 100%)',
              border: `2px solid ${
                isDark
                  ? isScrolled
                    ? 'rgba(120,64,240,1)'
                    : 'rgba(97,49,201,0.9)'
                  : 'rgba(81,0,189,0.35)'
              }`,
              boxShadow: isDark
                ? isScrolled
                  ? '0 0 50px rgba(97,49,201,0.55), 0 10px 40px rgba(0,0,0,0.5)'
                  : '0 0 30px rgba(97,49,201,0.3)'
                : isScrolled
                  ? '0 8px 40px rgba(81,0,189,0.18)'
                  : '0 4px 30px rgba(81,0,189,0.1)',
            }}
          >
            <div className="absolute inset-0 rounded-[10px] overflow-hidden pointer-events-none">
              <motion.div className="absolute inset-0" style={{ background: spotlight }} />

              <motion.div
                className="absolute top-0 bottom-0 w-1/4 -skew-x-12"
                style={{
                  background: `linear-gradient(90deg, transparent, ${
                    isDark ? 'rgba(255,255,255,0.07)' : 'rgba(141,81,255,0.1)'
                  }, transparent)`,
                }}
                initial={{ left: '-30%' }}
                animate={{ left: '130%' }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 7, ease: 'easeInOut' }}
              />

              <motion.div
                className="absolute left-0 right-0 bottom-0 h-[2px] origin-left"
                style={{
                  scaleX: progress,
                  background: 'linear-gradient(90deg, #5100BD, #8d51ff, #C6AEF8)',
                  boxShadow: '0 0 10px rgba(141,81,255,0.8)',
                }}
                animate={{ opacity: isScrolled ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <Link to="/" className="relative flex items-center shrink-0 z-10">
              <motion.img
                key={logoSrc}
                src={logoSrc}
                alt="Krypta"
                className="h-6 md:h-7 w-auto object-contain select-none"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.3 }}
                draggable={false}
                style={{
                  filter: isDark
                    ? 'drop-shadow(0 0 10px rgba(141,81,255,0.55))'
                    : 'drop-shadow(0 2px 4px rgba(81,0,189,0.15))',
                }}
              />
            </Link>

            <ul
              className="hidden lg:flex items-center gap-1 h-full flex-1 justify-center relative z-10"
              onMouseLeave={() => setHoveredId(null)}
            >
              {currentNavItems.map((item) => (
                <NavLinkItem
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  isActive={isPathActive(item.path, location.pathname)}
                  isHovered={hoveredId === item.id}
                  onHover={() => setHoveredId(item.id)}
                />
              ))}
            </ul>

            <div className="hidden lg:flex items-center gap-5 shrink-0 relative z-10">
              <ThemeToggle />

              <div
                className="w-px h-8"
                style={{
                  background: isDark
                    ? 'linear-gradient(180deg, transparent, rgba(255,255,255,0.75), transparent)'
                    : 'linear-gradient(180deg, transparent, rgba(81,0,189,0.4), transparent)',
                }}
              />

              {!user ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="px-3 py-2 text-[15px] font-medium transition-all whitespace-nowrap hover:opacity-80"
                    style={{ color: textMain }}
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    className="relative px-4 py-2 rounded-lg text-[15px] font-bold text-white overflow-hidden group whitespace-nowrap transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
                    style={{
                      background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)',
                      boxShadow: isDark ? '0 0 20px rgba(141,81,255,0.55)' : '0 4px 14px rgba(81,0,189,0.35)',
                    }}
                  >
                    <span className="relative z-10">Criar Conta</span>
                    <span className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/30 transition-all duration-700 group-hover:left-[150%]" />
                  </Link>
                </div>
              ) : (
                <div
                  className="relative"
                  onMouseEnter={() => setIsProfileOpen(true)}
                  onMouseLeave={() => setIsProfileOpen(false)}
                >
                  <button
                    onClick={() => setIsProfileOpen((v) => !v)}
                    className="group flex items-center gap-3"
                    aria-label="Menu do perfil"
                  >
                    <div className="flex flex-col items-end leading-tight">
                      <span
                        className="text-[15px] font-medium max-w-[140px] truncate transition-colors duration-300"
                        style={{ color: isProfileOpen ? accent : textMain }}
                      >
                        {user.name}
                      </span>
                      {planLabel && (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: textMuted }}>
                          {planLabel}
                        </span>
                      )}
                    </div>
                    <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                      <Avatar isDark={isDark} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="absolute right-0 top-full pt-3 z-50"
                      >
                        <div
                          className="relative w-52 rounded-xl p-1.5 backdrop-blur-2xl"
                          style={{
                            background: isDark
                              ? 'linear-gradient(160deg, rgba(10,0,20,0.98) 0%, rgba(22,6,48,0.97) 100%)'
                              : 'linear-gradient(160deg, rgba(255,255,255,0.99) 0%, rgba(248,247,251,0.98) 100%)',
                            border: `1.5px solid ${isDark ? 'rgba(97,49,201,0.9)' : 'rgba(81,0,189,0.3)'}`,
                            boxShadow: isDark ? '0 0 34px rgba(97,49,201,0.5)' : '0 10px 40px rgba(81,0,189,0.15)',
                          }}
                        >
                          <span
                            className="absolute -top-[6px] right-5 w-2.5 h-2.5 rotate-45"
                            style={{
                              background: isDark ? 'rgb(10,0,20)' : '#FFFFFF',
                              borderLeft: `1.5px solid ${isDark ? 'rgba(97,49,201,0.9)' : 'rgba(81,0,189,0.3)'}`,
                              borderTop: `1.5px solid ${isDark ? 'rgba(97,49,201,0.9)' : 'rgba(81,0,189,0.3)'}`,
                            }}
                          />

                          {profileMenu.map((item) => (
                            <motion.div key={item.id} variants={dropdownItemVariants}>
                              <Link
                                to={item.path}
                                className="group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 hover:bg-[rgba(141,81,255,0.14)] hover:pl-4"
                                style={{ color: textMain }}
                              >
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 rounded-full bg-[#8d51ff] transition-all duration-200 group-hover:h-4" />
                                <item.icon
                                  className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110"
                                  style={{ color: accent }}
                                />
                                <span>{item.label}</span>
                              </Link>
                            </motion.div>
                          ))}

                          <motion.div variants={dropdownItemVariants}>
                            <div className="h-px mx-2 my-1" style={{ background: borderSoft }} />
                            <button
                              onClick={handleSignOut}
                              className="group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 hover:bg-red-500/10 hover:pl-4"
                              style={{ color: textMain }}
                            >
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 rounded-full bg-red-400 transition-all duration-200 group-hover:h-4" />
                              <LogOut className="w-3.5 h-3.5 shrink-0 transition-colors group-hover:text-red-400" style={{ color: accent }} />
                              <span className="transition-colors group-hover:text-red-400">Sair</span>
                            </button>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="flex lg:hidden items-center gap-3 relative z-10">
              <ThemeToggle compact />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Abrir menu"
                className="relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 active:scale-95"
                style={{
                  background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.85)',
                  borderColor: isDark ? 'rgba(180,160,200,0.3)' : 'rgba(81,0,189,0.2)',
                  color: textMain,
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isMobileMenuOpen ? (
                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <X size={20} />
                    </motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Menu size={20} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </nav>
      </motion.div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(26,26,26,0.5)' }} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 bottom-0 w-[85%] max-w-[380px] border-l overflow-y-auto"
              style={{
                background: isDark ? 'linear-gradient(160deg, #0a0014 0%, #1a0533 100%)' : 'linear-gradient(160deg, #FFFFFF 0%, #F0EDF8 100%)',
                borderColor: isDark ? 'rgba(141,81,255,0.35)' : 'rgba(81,0,189,0.2)',
              }}
            >
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: borderSoft }}>
                <img src={logoSrc} alt="Krypta" className="h-7 w-auto object-contain" draggable={false} />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border active:scale-95 transition-transform"
                  style={{
                    background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.7)',
                    borderColor: isDark ? 'rgba(180,160,200,0.3)' : 'rgba(81,0,189,0.2)',
                    color: textMain,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {user && (
                <div className="p-5 border-b" style={{ borderColor: borderSoft }}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: isDark ? 'rgba(141,81,255,0.08)' : 'rgba(81,0,189,0.04)', borderColor: borderSoft }}
                  >
                    <Avatar size={40} isDark={isDark} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: textMain }}>{user.name}</p>
                      {planLabel && (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: textMuted }}>{planLabel}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <nav className="p-5 flex flex-col gap-2">
                {currentNavItems.map((item, idx) => {
                  const isActive = isPathActive(item.path, location.pathname);
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.05 + idx * 0.04 }}>
                      <Link
                        to={item.path}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden active:scale-[0.98]"
                        style={{
                          background: isActive ? (isDark ? 'rgba(141,81,255,0.2)' : 'rgba(81,0,189,0.08)') : 'transparent',
                          borderColor: isActive ? (isDark ? 'rgba(141,81,255,0.5)' : 'rgba(81,0,189,0.3)') : 'transparent',
                          color: isActive ? accent : isDark ? 'rgba(255,255,255,0.75)' : 'rgba(26,26,26,0.75)',
                        }}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                            style={{ background: accent, boxShadow: '0 0 10px rgba(141,81,255,0.8)' }}
                          />
                        )}
                        <item.icon size={20} className="relative z-10 transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-medium relative z-10">{item.label}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300" />
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <div className="h-px mx-5" style={{ background: borderSoft }} />

              <div className="p-5">
                {!user ? (
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/login"
                      className="w-full py-3.5 rounded-xl text-center font-bold border transition-all duration-300 whitespace-nowrap active:scale-[0.98]"
                      style={{
                        borderColor: isDark ? 'rgba(141,81,255,0.5)' : 'rgba(81,0,189,0.3)',
                        color: textMain,
                        background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      Entrar
                    </Link>
                    <Link
                      to="/register"
                      className="w-full py-3.5 rounded-xl text-center font-bold text-white transition-all duration-300 whitespace-nowrap active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)', boxShadow: '0 0 20px rgba(141,81,255,0.55)' }}
                    >
                      Criar Conta
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {profileMenu.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
                        style={{ color: textMain, background: isDark ? 'rgba(141,81,255,0.08)' : 'rgba(81,0,189,0.04)' }}
                      >
                        <item.icon className="w-5 h-5" style={{ color: accent }} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 bg-red-500/10 border border-red-500/20 transition-all hover:bg-red-500/20 active:scale-[0.98] mt-2"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Sair</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}