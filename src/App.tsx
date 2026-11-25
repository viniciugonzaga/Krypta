import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { usePageLoading } from './hooks/usePageLoading';
import { ModoProvider, useModo } from './mobile/ModoContext';
import { MobileRoutes } from './mobile/MobileRoutes';
import { CarregadorApp } from './mobile/carregamento';
import { CodyBot } from './ajuda/CodyBot';
import { AvisosApp } from './components/AvisosApp';

function AppContent() {
  // Celular, app instalado (PWA) ou tela pequena → telas do modo Mobile
  const { modo } = useModo();
  // Site/Windows: transição curta a cada troca de página.
  // Celular: sem loader a cada tela; ele só aparece em telas pesadas ou lentas (CarregadorApp).
  const isLoading = usePageLoading({ minDuration: 350, maxDuration: 1500, ativo: modo !== 'mobile' });

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="global-loader" />}
      </AnimatePresence>
      {modo === 'mobile' ? <MobileRoutes /> : <AppRoutes />}
      {modo === 'mobile' && <CarregadorApp />}
      <CodyBot />
      <AvisosApp />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ModoProvider>
            <AppContent />
          </ModoProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;