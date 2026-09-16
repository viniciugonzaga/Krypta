import { Sidebar } from '../components/layout/Sidebar';
import { AlertTriangle, HardDrive, Key, Mail, RefreshCw, Shield, User, Camera, Edit3, Award, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function Profile() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-krypta-black flex">
      <Sidebar />
      
      <main className="flex-1 ml-72 p-10 relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-10 pointer-events-none" />
        
        <header className="mb-10 relative z-10">
          <h1 className="text-4xl font-display font-bold text-krypta-lilac mb-2">Meu Perfil</h1>
          <p className="text-krypta-white/50">Gerencie suas informações pessoais e segurança do cofre.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          
          {/* Card do Usuário */}
          <Card className="lg:col-span-2" glow>
            <div className="flex items-start gap-6 mb-8 border-b border-krypta-purple/20 pb-6">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-krypta-purple via-krypta-magenta to-krypta-cyan flex items-center justify-center border-4 border-krypta-black shadow-glow">
                  <User className="w-14 h-14 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 w-9 h-9 bg-krypta-purple rounded-full flex items-center justify-center border-4 border-krypta-black hover:bg-krypta-magenta transition-colors group-hover:scale-110">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white">{user?.name || 'Usuário Krypta'}</h2>
                  <Award className="w-5 h-5 text-krypta-cyan" />
                </div>
                <p className="text-krypta-lilac/70 mb-3">{user?.email || 'usuario@krypta.com'}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/30">
                    <Shield className="w-3 h-3" /> Conta Verificada
                  </span>
                  <span className="inline-flex items-center gap-1 bg-krypta-cyan/10 text-krypta-cyan text-xs px-3 py-1 rounded-full border border-krypta-cyan/30">
                    <Key className="w-3 h-3" /> Hardware Ativo
                  </span>
                  <span className="inline-flex items-center gap-1 bg-krypta-purple/10 text-krypta-lilac text-xs px-3 py-1 rounded-full border border-krypta-purple/30">
                    <Calendar className="w-3 h-3" /> Desde 2026
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-krypta-white/40 flex items-center gap-2 uppercase tracking-wider"><Mail className="w-3.5 h-3.5" /> E-mail</label>
                <div className="bg-krypta-black/50 border border-krypta-purple/20 rounded-lg p-3 text-krypta-white/80 flex items-center justify-between">
                  <span className="text-sm">{user?.email || 'usuario@krypta.com'}</span>
                  <Edit3 className="w-4 h-4 text-krypta-purple/50" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-krypta-white/40 flex items-center gap-2 uppercase tracking-wider"><Key className="w-3.5 h-3.5" /> Senha do Portal</label>
                <div className="flex gap-2">
                  <div className="bg-krypta-black/50 border border-krypta-purple/20 rounded-lg p-3 text-krypta-white/80 flex-1">
                    <span className="text-sm font-mono">••••••••</span>
                  </div>
                  <Button variant="secondary" className="px-4 text-sm">Alterar</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Status Hardware */}
          <Card glow className="border-krypta-purple/40">
            <h3 className="text-xl font-bold text-krypta-lilac mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-krypta-purple" /> Status do Hardware
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-krypta-white/60 text-sm">Dispositivo ESP32</span>
                <span className="text-green-400 font-bold text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" /> Conectado
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-krypta-white/60 text-sm">Chave Ed25519</span>
                <span className="text-krypta-cyan font-mono text-xs">a1b2...f9e8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-krypta-white/60 text-sm">Firmware</span>
                <span className="text-krypta-lilac font-mono text-xs">v1.0.4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-krypta-white/60 text-sm">Bateria</span>
                <span className="text-green-400 font-mono text-xs">98%</span>
              </div>
              <div className="pt-4 border-t border-krypta-purple/20">
                <Button variant="secondary" fullWidth className="text-sm">
                  <RefreshCw className="w-4 h-4" /> Sincronizar Backup
                </Button>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="lg:col-span-3 border-red-500/40 bg-red-950/10">
            <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Zona de Perigo
            </h3>
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
              <div>
                <h4 className="font-bold text-white mb-1">Kill Switch (Bloqueio Remoto)</h4>
                <p className="text-sm text-krypta-white/50 max-w-xl">
                  Se o hardware for roubado ou perdido, ative o bloqueio remoto. Isso revogará permanentemente a chave pública deste dispositivo.
                </p>
              </div>
              <Button variant="danger" className="whitespace-nowrap">
                Ativar Kill Switch
              </Button>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}