import { Home } from 'lucide-react';
import { TestPage } from '../components/TestPage';

export function TestHome() {
  return (
    <TestPage
      title="HOME"
      description="Página inicial do sistema Krypta. Aqui ficará o dashboard principal com o resumo do cofre."
      icon={Home}
      accent="#8d51ff"
    />
  );
}