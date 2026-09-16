import { Sidebar } from '../components/layout/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Key, Shield, Activity, HardDrive, TrendingUp, AlertCircle, ArrowUpRight, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Dashboard() {
  const { user } = useAuth();

  const stats = [
    { icon: Key, label: 'Credenciais', value: '24', change: '+3', color: 'purple' },
    { icon: Shield, label: 'Segurança', value: '100%', change: 'OK', color: 'green' },
    { icon: HardDrive, label: 'Backups', value: '12', change: 'Sincronizado', color: 'cyan' },
    { icon: Activity, label: 'Sessões', value: '1', change: 'Ativa', color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-krypta-black flex">
      <Sidebar />
      
      <main className="flex-1 ml-72 p-10 relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-10 pointer-events-none" />
        
        <header className="mb-10 relative z-10">
          <div className="flex items-center gap-2 text-xs text-krypta-cyan/70 font-mono mb-2">
            <Zap className="w-3 h-3" /> SISTEMA OPERACIONAL
          </div>
          <h1 className="text-4xl font-display font-bold text-krypta-lilac mb-2">
            Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-krypta-purple to-krypta-cyan">{user?.name || 'Usuário'}</span>
          </h1>
          <p className="text-krypta-white/50">Seu cofre está conectado e protegido.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
          {stats.map((stat, idx) => (
            <Card key={idx} className="group hover:shadow-glow transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-krypta-purple/10 rounded-xl flex items-center justify-center border border-krypta-purple/30 group-hover:bg-krypta-purple/20 transition-colors">
                  <stat.icon className="w-6 h-6 text-krypta-purple" />
                </div>
                <span className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                  {stat.change}
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs text-krypta-white/40 uppercase tracking-wider">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          <Card className="lg:col-span-2">
            <h3 className="text-xl font-bold text-krypta-lilac mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-krypta-purple" /> Atividade Recente
            </h3>
            <div className="space-y-3">
              {[
                { action: 'Login realizado', detail: 'Desktop - Chrome', time: '2 min atrás', status: 'success' },
                { action: 'Backup sincronizado', detail: 'Nuvem Krypta', time: '15 min atrás', status: 'success' },
                { action: 'Nova credencial adicionada', detail: 'GitHub', time: '1 hora atrás', status: 'info' },
                { action: 'Sessão expirada', detail: 'Mobile - App', time: '3 horas atrás', status: 'warning' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-krypta-black/30 border border-krypta-purple/10 rounded-lg hover:border-krypta-purple/30 transition-all">
                  <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-500' : item.status === 'info' ? 'bg-krypta-cyan' : 'bg-yellow-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{item.action}</p>
                    <p className="text-xs text-krypta-white/40">{item.detail}</p>
                  </div>
                  <span className="text-xs text-krypta-white/40 font-mono">{item.time}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card glow>
            <h3 className="text-xl font-bold text-krypta-lilac mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-krypta-purple" /> Status do Cofre
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-krypta-white/60">Hardware ESP32</span>
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-krypta-white/60">Criptografia</span>
                <span className="text-xs text-krypta-cyan font-mono">AES-256-GCM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-krypta-white/60">Última sync</span>
                <span className="text-xs text-krypta-lilac font-mono">Há 15 min</span>
              </div>
              <div className="pt-4 border-t border-krypta-purple/20">
                <Button variant="secondary" fullWidth className="text-sm">
                  Ver Detalhes <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}