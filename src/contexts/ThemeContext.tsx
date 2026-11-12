import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextData {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const STORAGE_KEY = '@Krypta:theme';
const TRANSITION_CLASS = 'theme-transitioning';
const TRANSITION_DURATION = 600;

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';

  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;

  // Detecta preferência do sistema
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function applyThemeToDOM(theme: Theme, withTransition: boolean = false) {
  const html = document.documentElement;

  if (withTransition) {
    html.classList.add(TRANSITION_CLASS);
    window.setTimeout(() => {
      html.classList.remove(TRANSITION_CLASS);
    }, TRANSITION_DURATION);
  }

  html.classList.remove('dark', 'light');
  html.classList.add(theme);
  html.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Aplica tema inicial (sem transição)
  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyThemeToDOM(initial, false);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState((current) => {
      if (current === newTheme) return current;

      // Aplica no DOM com transição
      applyThemeToDOM(newTheme, true);
      localStorage.setItem(STORAGE_KEY, newTheme);

      return newTheme;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);