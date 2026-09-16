import { BookOpen } from 'lucide-react';
import { TestPage } from '../components/TestPage';

export function TestBlogs() {
  return (
    <TestPage
      title="BLOGS"
      description="Área de artigos, notícias e conteúdos sobre segurança digital, criptografia e privacidade."
      icon={BookOpen}
      accent="#00f0ff"
    />
  );
}