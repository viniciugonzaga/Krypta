import { Sidebar } from '../components/layout/Sidebar';
import { Bell, Fingerprint, Lock, Monitor, Moon, Shield, Sun, Usb, Volume2, Globe, Database, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function Settings() {
  const Toggle = ({ enabled = true }: { enabled?: boolean }) => (
    <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${enabled ? 'bg-gradient-to-r from-krypta-purple to-krypta-magenta shadow-glow' : 'bg-krypta-white/10'}`}>
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-krypta-black flex">
      <Sidebar />
      
      <main className="flex-1 ml-72 p-10 relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-10 pointer-events-none" />
        
        <header className="mb-10 relative z-10">
          <h1 className="text-4xl font-display font-bold text-krypta-lilac mb-2">Configurações</h1>
          <p className="text-krypta-white/50">Personalize sua experiência e ajuste as configurações de segurança.</p>
        </header>

        <div className="max-w-4xl space-y-8 relative z-10">
          
          {/* Aparência */}
          <Card>
            <h3 className="text-xl font-bold text-krypta-lilac mb-6 flex items-center gap-2 border-b border-krypta-purple/20 pb-4">
              <Monitor className="w-5 h-5 text-krypta-purple" /> Aparência
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 hover:border-krypta-purple/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Moon className="w-5 h-5 text-krypta-purple" />
                  <div>
                    <p className="font-medium text-white">Tema Escuro (Padrão)</p>
                    <p className="text-xs text-krypta-white/50">O Krypta foi desenhado para ambientes escuros.</p>
                  </div>
                </div>
                <Toggle enabled={true} />
              </div>
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 opacity-50">
                <div className="flex items-center gap-4">
                  <Sun className="w-5 h-5 text-krypta-white/30" />
                  <div>
                    <p className="font-medium text-white/50">Tema Claro</p>
                    <p className="text-xs text-krypta-white/30">Disponível em breve.</p>
                  </div>
                </div>
                <Toggle enabled={false} />
              </div>
            </div>
          </Card>

          {/* Segurança */}
          <Card>
            <h3 className="text-xl font-bold text-krypta-lilac mb-6 flex items-center gap-2 border-b border-krypta-purple/20 pb-4">
              <Shield className="w-5 h-5 text-krypta-purple" /> Segurança e Hardware
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 hover:border-krypta-purple/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Usb className="w-5 h-5 text-krypta-purple" />
                  <div>
                    <p className="font-medium text-white">Conexão Automática</p>
                    <p className="text-xs text-krypta-white/50">Detectar hardware assim que for plugado.</p>
                  </div>
                </div>
                <Toggle enabled={true} />
              </div>
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 hover:border-krypta-purple/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Fingerprint className="w-5 h-5 text-krypta-purple" />
                  <div>
                    <p className="font-medium text-white">Biometria (Mobile)</p>
                    <p className="text-xs text-krypta-white/50">Usar digital como atalho de conveniência.</p>
                  </div>
                </div>
                <Toggle enabled={true} />
              </div>
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 hover:border-krypta-purple/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Lock className="w-5 h-5 text-krypta-purple" />
                  <div>
                    <p className="font-medium text-white">Bloqueio Automático (Fail-Close)</p>
                    <p className="text-xs text-krypta-white/50">Bloquear tela ao desconectar o hardware.</p>
                  </div>
                </div>
                <Toggle enabled={true} />
              </div>
            </div>
          </Card>

          {/* Notificações */}
          <Card>
            <h3 className="text-xl font-bold text-krypta-lilac mb-6 flex items-center gap-2 border-b border-krypta-purple/20 pb-4">
              <Bell className="w-5 h-5 text-krypta-purple" /> Notificações
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 hover:border-krypta-purple/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Bell className="w-5 h-5 text-krypta-purple" />
                  <div>
                    <p className="font-medium text-white">Alertas de Segurança</p>
                    <p className="text-xs text-krypta-white/50">Receber e-mails sobre acessos suspeitos.</p>
                  </div>
                </div>
                <Toggle enabled={true} />
              </div>
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 hover:border-krypta-purple/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Volume2 className="w-5 h-5 text-krypta-purple" />
                  <div>
                    <p className="font-medium text-white">Sons do Sistema</p>
                    <p className="text-xs text-krypta-white/50">Efeitos sonoros ao conectar o hardware.</p>
                  </div>
                </div>
                <Toggle enabled={false} />
              </div>
              <div className="flex items-center justify-between p-4 bg-krypta-black/30 rounded-lg border border-krypta-purple/10 hover:border-krypta-purple/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Globe className="w-5 h-5 text-krypta-purple" />
                  <div>
                    <p className="font-medium text-white">Sincronização em Nuvem</p>
                    <p className="text-xs text-krypta-white/50">Backup automático criptografado.</p>
                  </div>
                </div>
                <Toggle enabled={true} />
              </div>
            </div>
          </Card>

          {/* Zona de Perigo */}
          <Card className="border-red-500/40 bg-red-950/5">
            <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2 border-b border-red-500/20 pb-4">
              <Trash2 className="w-5 h-5" /> Zona de Perigo
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Excluir Conta Permanentemente</p>
                <p className="text-xs text-krypta-white/50">Remove todos os dados, backups e chaves vinculadas.</p>
              </div>
              <Button variant="danger" className="whitespace-nowrap">Excluir Conta</Button>
            </div>
          </Card>

          <div className="flex justify-end pt-4">
            <Button variant="primary" className="px-10">Salvar Alterações</Button>
          </div>

        </div>
      </main>
    </div>
  );
}