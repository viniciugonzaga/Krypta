import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { LAYOUT_TRANSITION, useAuthTheme } from '../components/auth/authShared';
import { LoginForm, LoginVisual } from './Login';
import { RegisterForm, RegisterVisual } from './Register';

const SLIDE = 90; // distância (px) da entrada/saída ao chegar ou sair das páginas de auth
const ENTER = { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

/**
 * Uma ÚNICA página para /login e /register.
 *
 * Como o componente continua montado ao trocar de rota, os dois painéis
 * (visual e formulário) trocam de lado com animação de layout, enquanto o
 * conteúdo de cada um faz crossfade. Login: visual à esquerda, form à direita.
 * Cadastro: form à esquerda, visual à direita.
 *
 * Ao vir de outra página (ex.: Welcome) ou ao sair para ela, cada painel
 * entra/sai deslizando pelo seu próprio lado.
 */
export function AuthPage() {
  const { pathname } = useLocation();
  const isLogin = !pathname.startsWith('/register');
  const { panelBg } = useAuthTheme();

  // -1 = visual à esquerda (login) | 1 = visual à direita (cadastro)
  const visualSide = isLogin ? -1 : 1;

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden transition-colors duration-500"
      style={{ backgroundColor: 'rgb(var(--krypta-bg))' }}
    >
      <Navbar />

      <main className="flex-1 flex w-full items-stretch">
        {/* ================= PAINEL VISUAL ================= */}
        <motion.div
          layout="position"
          transition={{ layout: LAYOUT_TRANSITION }}
          className="hidden lg:block relative lg:w-1/2 xl:w-[55%] overflow-hidden z-20"
          style={{ order: isLogin ? 1 : 2, background: panelBg }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, x: visualSide * SLIDE }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: visualSide * SLIDE }}
            transition={ENTER}
          >
            <AnimatePresence initial={false}>
              {isLogin ? (
                <motion.div
                  key="login-visual"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                >
                  <LoginVisual />
                </motion.div>
              ) : (
                <motion.div
                  key="register-visual"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                >
                  <RegisterVisual />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* ================= PAINEL DO FORMULÁRIO ================= */}
        <motion.div
          layout="position"
          transition={{ layout: LAYOUT_TRANSITION }}
          className="w-full lg:w-1/2 xl:w-[45%] flex flex-col px-4 sm:px-6 md:px-10 pt-28 pb-12 relative z-10 transition-colors duration-500"
          style={{ order: isLogin ? 2 : 1, background: panelBg }}
        >
          <motion.div
            className="flex-1 flex flex-col items-center"
            initial={{ opacity: 0, x: -visualSide * SLIDE }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -visualSide * SLIDE }}
            transition={ENTER}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLogin ? (
                <motion.div
                  key="login-form"
                  className="w-full max-w-[400px] my-auto"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoginForm />
                </motion.div>
              ) : (
                <motion.div
                  key="register-form"
                  className="w-full max-w-[440px] my-auto"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <RegisterForm />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}