import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { usePageLoading } from './hooks/usePageLoading';
import { ModoProvider, useModo } from './mobile/ModoContext';
import { MobileRoutes } from './mobile/MobileRoutes';

function AppContent() {
  const isLoading = usePageLoading({ minDuration: 1100, maxDuration: 4500 });
  // Celular, app instalado (PWA) ou tela pequena → telas do modo Mobile
  const { modo } = useModo();

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="global-loader" />}
      </AnimatePresence>
      {modo === 'mobile' ? <MobileRoutes /> : <AppRoutes />}
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