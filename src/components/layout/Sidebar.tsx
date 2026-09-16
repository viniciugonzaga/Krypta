import { Link, useLocation } from 'react-router-dom';
import { Key, User, Settings, LogOut, Shield, Home, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const { signOut } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Key, label: 'Credenciais', path: '/vault' },
    { icon: User, label: 'Perfil', path: '/profile' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-krypta-black/95 via-krypta-deep/95 to-krypta-black/95 backdrop-blur-2xl border-r border-krypta-purple/20 p-6 flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-3 mb-12 group">
        <div className="relative">
          <div className="absolute inset-0 bg-krypta-purple blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <Shield className="w-10 h-10 text-krypta-purple relative z-10 drop-shadow-[0_0_10px_rgba(141,81,255,0.8)]" />
        </div>
        <h1 className="text-2xl font-display font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-krypta-lilac to-krypta-purple">
          KRYPTA
        </h1>
      </Link>

      {/* Status do Sistema */}
      <div className="mb-8 p-3 bg-krypta-purple/5 border border-krypta-purple/20 rounded-lg">
        <div className="flex items-center gap-2 text-xs mb-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          <span className="text-green-400 font-medium">SISTEMA ATIVO</span>
        </div>
        <p className="text-[10px] text-krypta-white/40 font-mono">v1.0.4 | Ed25519</p>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 overflow-hidden group ${
                isActive
                  ? 'bg-gradient-to-r from-krypta-purple/30 to-krypta-purple/10 text-white border border-krypta-purple/40 shadow-glow'
                  : 'text-krypta-white/50 hover:text-krypta-lilac hover:bg-krypta-purple/10 border border-transparent'
              }`}
            >
              {isActive && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-krypta-purple to-krypta-cyan rounded-r-full shadow-glow" />
                  <Zap className="absolute right-3 w-3 h-3 text-krypta-cyan animate-pulse" />
                </>
              )}
              <item.icon size={20} className={isActive ? 'text-krypta-cyan' : ''} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center gap-4 px-4 py-3 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 mt-auto border border-transparent hover:border-red-500/20 group"
      >
        <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-500" />
        <span className="font-medium">Desconectar</span>
      </button>
    </aside>
  );
}