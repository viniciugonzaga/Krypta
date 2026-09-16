import { Briefcase } from 'lucide-react';
import { TestPage } from '../components/TestPage';

export function TestServices() {
  return (
    <TestPage
      title="SERVICES"
      description="Página de serviços oferecidos pela plataforma Krypta: backup em nuvem, herança digital e mais."
      icon={Briefcase}
      accent="#8445d6"
    />
  );
}