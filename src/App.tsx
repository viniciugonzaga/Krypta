import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { usePageLoading } from './hooks/usePageLoading';

function AppContent() {
  const isLoading = usePageLoading({ minDuration: 1100, maxDuration: 4500 });

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="global-loader" />}
      </AnimatePresence>
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;