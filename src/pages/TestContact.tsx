import { Mail } from 'lucide-react';
import { TestPage } from '../components/TestPage';

export function TestContact() {
  return (
    <TestPage
      title="CONTACT"
      description="Entre em contato com a equipe Krypta. Suporte técnico, dúvidas e parcerias."
      icon={Mail}
      accent="#c6aef6"
    />
  );
}