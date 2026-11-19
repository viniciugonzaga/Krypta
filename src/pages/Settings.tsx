// src/pages/Settings.tsx
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Moon, Sun } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

import spriteRoboConfig from '../assets/sprites/sprite_robo_configuracao.png';

const ROUNDED_FONT = "'Quicksand', 'Poppins', sans-serif";
const STORAGE_KEY = 'krypta:settings';

interface SettingsState {
  language: 'pt' | 'en' | 'es';
  cody: boolean;
  notifications: boolean;
  inheritance: boolean;
  remoteLock: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  language: 'pt',
  cody: true,
  notifications: true,
  inheritance: true,
  remoteLock: false,
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/* ------------------------------------------------------------------ */
/* Peças reutilizáveis                                                 */
/* ------------------------------------------------------------------ */

function SettingRow({
  label,
  isDark,
  delay,
  children,
}: {
  label: string;
  isDark: boolean;
  delay: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <span
        className="text-[19px] md:text-[22px] leading-tight"
        style={{
          fontFamily: ROUNDED_FONT,
          fontWeight: 500,
          color: isDark ? '#FFFFFF' : '#1a1a1a',
        }}
      >
        {label}:
      </span>
      {children}
    </motion.div>
  );
}

function PillButton({
  children,
  onClick,
  isDark,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  isDark: boolean;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-[15px] transition-colors duration-300"
      style={{
        fontFamily: ROUNDED_FONT,
        fontWeight: 500,
        color: isDark ? '#8d51ff' : '#5100BD',
        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.85)' : 'rgba(81,0,189,0.55)'}`,
        boxShadow: isDark ? '0 0 12px rgba(141,81,255,0.18)' : '0 2px 8px rgba(81,0,189,0.1)',
      }}
    >
      {children}
    </motion.button>
  );
}

function MutedText({ children, isDark }: { children: ReactNode; isDark: boolean }) {
  return (
    <span
      className="text-[14px] md:text-[15px] leading-snug"
      style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.65)' }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Robô decorativo                                                     */
/* ------------------------------------------------------------------ */

function RobotMascot({ isDark }: { isDark: boolean }) {
  return (
    <div className="relative w-full aspect-square flex items-center justify-center">
      <motion.div
        className="absolute inset-[10%] rounded-full blur-[60px] pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(141,81,255,0.45) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(81,0,189,0.25) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.img
        src={spriteRoboConfig}
        alt="Robô de configurações Krypta"
        className="relative z-10 w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.8, delay: 0.3 },
          scale: { duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] },
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          filter: isDark
            ? 'drop-shadow(0 0 22px rgba(141,81,255,0.45))'
            : 'drop-shadow(0 10px 22px rgba(81,0,189,0.3))',
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [settings, setSettings] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage indisponível: ignora */
    }
  }, [settings]);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const planRaw = (user as any)?.plan;
  const paymentStatus = !planRaw || planRaw === 'free' ? 'Plano gratuito' : 'Mensalidade ativa';

  const handleRemoteLock = () => {
    if (!settings.remoteLock) {
      const ok = window.confirm(
        'Ativar o Bloqueio Remoto vai bloquear o seu Krypta. Use apenas em caso de roubo ou perda. Deseja continuar?'
      );
      if (!ok) return;
    }
    update('remoteLock', !settings.remoteLock);
  };

  const accent = isDark ? '#8d51ff' : '#5100BD';

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500"
      style={{
        backgroundColor: 'rgb(var(--krypta-bg))',
        color: 'rgb(var(--krypta-fg))',
      }}
    >
      <Navbar />

      {/* Brilhos de fundo */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[560px] h-[560px] rounded-full blur-[170px] pointer-events-none"
        style={{ background: 'rgb(var(--krypta-purple) / 0.2)' }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[480px] h-[480px] rounded-full blur-[180px] pointer-events-none"
        style={{ background: 'rgb(var(--krypta-purple) / 0.15)' }}
      />

      <main className="relative z-10 flex-1 pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Cabeçalho */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <h1
              className="text-4xl md:text-5xl leading-tight"
              style={{
                fontFamily: ROUNDED_FONT,
                fontWeight: 500,
                color: isDark ? '#FFFFFF' : '#1a1a1a',
              }}
            >
              Configurações do Sistema
            </h1>
            <p
              className="mt-1 text-[15px]"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.65)' }}
            >
              Veja todos os detalhes das configurações aqui
            </p>
            <div
              className="mt-2 h-px w-full"
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, rgba(141,81,255,0.85), rgba(141,81,255,0.15))'
                  : 'linear-gradient(90deg, rgba(81,0,189,0.7), rgba(81,0,189,0.1))',
              }}
            />
          </motion.header>

          {/* Card principal */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-xl overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(160deg, rgba(20,4,40,0.92) 0%, rgba(10,0,20,0.95) 100%)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(240,237,248,0.95) 100%)',
              border: `2px solid ${isDark ? 'rgba(97,49,201,0.95)' : 'rgba(81,0,189,0.4)'}`,
              boxShadow: isDark
                ? '0 0 36px rgba(97,49,201,0.35), inset 0 0 40px rgba(141,81,255,0.05)'
                : '0 8px 36px rgba(81,0,189,0.12)',
            }}
          >
            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-7 md:p-10">
              {/* Lista de configurações */}
              <div className="flex flex-col gap-7 md:gap-8">
                <SettingRow label="Aparência" isDark={isDark} delay={0.2}>
                  <PillButton
                    isDark={isDark}
                    onClick={toggleTheme}
                    ariaLabel={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                  >
                    <span className="text-[13px]">{isDark ? 'Dark' : 'Light'}</span>
                    {isDark ? <Moon size={13} /> : <Sun size={13} />}
                  </PillButton>
                </SettingRow>

                <SettingRow label="Idioma" isDark={isDark} delay={0.26}>
                  <div className="relative inline-block">
                    <select
                      value={settings.language}
                      onChange={(e) => update('language', e.target.value as SettingsState['language'])}
                      className="appearance-none cursor-pointer pl-3.5 pr-8 py-1 rounded-lg text-[15px] outline-none transition-colors duration-300"
                      style={{
                        fontFamily: ROUNDED_FONT,
                        fontWeight: 500,
                        color: accent,
                        background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.85)' : 'rgba(81,0,189,0.55)'}`,
                      }}
                    >
                      <option value="pt">Português</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: accent }}
                    />
                  </div>
                </SettingRow>

                <SettingRow label="Status de Pagamento" isDark={isDark} delay={0.32}>
                  <MutedText isDark={isDark}>{paymentStatus}</MutedText>
                </SettingRow>

                <SettingRow label="Assistente Cody" isDark={isDark} delay={0.38}>
                  <PillButton isDark={isDark} onClick={() => update('cody', !settings.cody)}>
                    {settings.cody ? 'Ativado' : 'Desativado'}
                  </PillButton>
                </SettingRow>

                <SettingRow label="Notificações" isDark={isDark} delay={0.44}>
                  <PillButton
                    isDark={isDark}
                    onClick={() => update('notifications', !settings.notifications)}
                  >
                    {settings.notifications ? 'Ativadas' : 'Desativadas'}
                  </PillButton>
                </SettingRow>

                <SettingRow label="Gerenciar senha mestre" isDark={isDark} delay={0.5}>
                  <button
                    type="button"
                    // TODO: ligar à rota/modal de troca de senha mestre quando existir
                    onClick={() => {}}
                    className="text-[14px] md:text-[15px] transition-colors duration-300 hover:underline"
                    style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.65)' }}
                  >
                    Alterar senha Mestre
                  </button>
                </SettingRow>

                <SettingRow label="Herança Digital" isDark={isDark} delay={0.56}>
                  <PillButton
                    isDark={isDark}
                    onClick={() => update('inheritance', !settings.inheritance)}
                  >
                    {settings.inheritance ? 'Ativada' : 'Desativada'}
                  </PillButton>
                  <MutedText isDark={isDark}>Configurar no aplicativo</MutedText>
                </SettingRow>

                <SettingRow label="Bloqueio Remoto" isDark={isDark} delay={0.62}>
                  <PillButton isDark={isDark} onClick={handleRemoteLock}>
                    {settings.remoteLock ? 'Ativado' : 'Desativado'}
                  </PillButton>
                  <span className="max-w-md">
                    <MutedText isDark={isDark}>
                      Apenas alterar em caso de roubo e desligar apenas caso o Krypta for encontrado*
                    </MutedText>
                  </span>
                </SettingRow>
              </div>

              {/* Robô */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="w-full max-w-[380px]">
                  <RobotMascot isDark={isDark} />
                </div>
              </div>

              {/* Robô no mobile/tablet */}
              <div className="flex lg:hidden justify-center">
                <div className="w-48 sm:w-56">
                  <RobotMascot isDark={isDark} />
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}