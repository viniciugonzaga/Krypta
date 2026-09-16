import { Sidebar } from '../components/layout/Sidebar';
import { Search, Plus, Key, Globe, CreditCard, Mail, MoreVertical, ShieldCheck, Star, Grid3x3, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function Vault() {
  const credentials = [
    { id: 1, service: 'Google', user: 'usuario@gmail.com', category: 'Pessoal', icon: Globe, strength: 'Forte', favorite: true },
    { id: 2, service: 'Banco Inter', user: 'usuario@email.com', category: 'Financeiro', icon: CreditCard, strength: 'Forte', favorite: true },
    { id: 3, service: 'GitHub', user: 'dev@krypta.com', category: 'Trabalho', icon: Key, strength: 'Média', favorite: false },
    { id: 4, service: 'Outlook', user: 'contato@empresa.com', category: 'Trabalho', icon: Mail, strength: 'Forte', favorite: false },
    { id: 5, service: 'Netflix', user: 'familia@email.com', category: 'Pessoal', icon: Globe, strength: 'Forte', favorite: false },
    { id: 6, service: 'Steam', user: 'gamer@krypta.com', category: 'Pessoal', icon: Key, strength: 'Média', favorite: false },
  ];

  return (
    <div className="min-h-screen bg-krypta-black flex">
      <Sidebar />
      
      <main className="flex-1 ml-72 p-10 relative">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-10 pointer-events-none" />
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs text-krypta-cyan/70 font-mono mb-2">
              <ShieldCheck className="w-3 h-3" /> CRIPTOGRAFADO
            </div>
            <h1 className="text-4xl font-display font-bold text-krypta-lilac mb-2">Cofre de Credenciais</h1>
            <p className="text-krypta-white/50">Gerencie suas senhas e acessos com segurança.</p>
          </div>
          <Button variant="primary" className="whitespace-nowrap">
            <Plus className="w-5 h-5" /> Nova Credencial
          </Button>
        </header>

        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 relative z-10">
          <div className="flex-1">
            <Input placeholder="Buscar credencial..." icon={Search} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="text-xs">Todas</Button>
            <Button variant="ghost" className="text-xs">Pessoal</Button>
            <Button variant="ghost" className="text-xs">Trabalho</Button>
            <Button variant="ghost" className="text-xs">Financeiro</Button>
            <Button variant="ghost" className="px-3">
              <Grid3x3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {credentials.map((cred) => (
            <Card key={cred.id} className="group hover:border-krypta-purple/60 transition-all cursor-pointer relative overflow-hidden">
              {cred.favorite && (
                <Star className="absolute top-4 right-4 w-4 h-4 text-yellow-400 fill-yellow-400" />
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-krypta-purple blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-krypta-purple/20 to-krypta-magenta/10 rounded-xl flex items-center justify-center border border-krypta-purple/30 group-hover:border-krypta-purple/60 transition-all">
                    <cred.icon className="w-7 h-7 text-krypta-purple" />
                  </div>
                </div>
                {!cred.favorite && (
                  <button className="text-krypta-white/30 hover:text-krypta-purple transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-1">{cred.service}</h3>
              <p className="text-sm text-krypta-white/50 mb-4">{cred.user}</p>
              
              <div className="flex justify-between items-center pt-4 border-t border-krypta-purple/20">
                <span className="text-xs text-krypta-lilac/70 bg-krypta-purple/10 px-3 py-1 rounded-full border border-krypta-purple/20">
                  {cred.category}
                </span>
                <span className={`text-xs flex items-center gap-1 font-medium ${cred.strength === 'Forte' ? 'text-green-400' : 'text-yellow-400'}`}>
                  <ShieldCheck className="w-3 h-3" /> {cred.strength}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}