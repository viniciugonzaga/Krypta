import { Info } from 'lucide-react';
import { TestPage } from '../components/TestPage';

export function TestAbout() {
  return (
    <TestPage
      title="ABOUT"
      description="Conheça a equipe por trás do Krypta e a visão do projeto: um futuro onde sua identidade digital é inviolável."
      icon={Info}
      accent="#3c3295"
    />
  );
}