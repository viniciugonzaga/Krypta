// src/components/AvisosApp.tsx
// ============================================================
// v1.3.0 — liga a vigilância de avisos (services/avisos.ts) quando há
// conta aberta e mostra os avisos dentro do app (toasts no canto).
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModo } from '../mobile/ModoContext';
import { Avisos, vigiarAvisos, type Toast } from '../services/avisos';

/** Número de avisos não lidos (para o sino) */
export function useNaoLidas(): number {
  const [n, setN] = useState(Avisos.naoLidas());
  useEffect(() => Avisos.assinar(() => setN(Avisos.naoLidas())), []);
  return n;
}

export function AvisosApp() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { modo } = useModo();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const uid = user?.id;
  useEffect(() => (uid ? vigiarAvisos(uid) : undefined), [uid]);
  useEffect(
    () =>
      Avisos.aoToast((t) => {
        setToasts((l) => [...l.filter((x) => x.id !== t.id), t].slice(-3));
        setTimeout(() => setToasts((l) => l.filter((x) => x.id !== t.id)), 8000);
      }),
    [],
  );

  const mobile = modo === 'mobile';
  return (
    <div
      className="fixed z-[90] flex flex-col gap-2 pointer-events-none"
      style={mobile ? { top: 'calc(64px + env(safe-area-inset-top))', left: 12, right: 12 } : { top: 88, right: 20, width: 340 }}
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto rounded-2xl p-3.5 flex gap-3 shadow-2xl cursor-pointer"
            onClick={() => {
              setToasts((l) => l.filter((x) => x.id !== t.id));
              navigate(mobile ? '/notificacoes' : '/profile#seguranca');
            }}
            style={{
              background: isDark ? '#140726' : '#FFFFFF',
              border: `1.5px solid ${t.alerta ? 'rgba(248,113,113,0.6)' : isDark ? 'rgba(141,81,255,0.45)' : 'rgba(97,49,201,0.3)'}`,
              color: isDark ? '#FFFFFF' : '#1a1a1a',
            }}
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: t.alerta ? '#ef4444' : 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}>
              {t.alerta ? <ShieldAlert className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold">{t.titulo}</span>
              <span className="block text-[12.5px] leading-snug opacity-75">{t.texto}</span>
            </span>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={(e) => {
                e.stopPropagation();
                setToasts((l) => l.filter((x) => x.id !== t.id));
              }}
              className="self-start opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Estado do interruptor "Notificações neste aparelho" (Configurações) */
export function useNotificacoesAparelho() {
  const [ligado, setLigado] = useState(Avisos.ligado());
  const [permissao, setPermissao] = useState<'concedida' | 'negada' | 'pendente' | 'indisponivel'>('pendente');
  useEffect(() => {
    void Avisos.permissao().then(setPermissao);
  }, []);
  const mudar = async (v: boolean) => {
    setLigado(v);
    await Avisos.ligar(v);
    const p = await Avisos.permissao();
    setPermissao(p);
    if (v && p === 'concedida') void Avisos.testar();
  };
  const ativo = ligado && permissao === 'concedida';
  const texto =
    permissao === 'indisponivel'
      ? 'Este navegador não mostra notificações. Os avisos aparecem dentro do Krypta.'
      : permissao === 'negada'
        ? 'Bloqueadas no navegador/sistema. Libere nas permissões do site para receber.'
        : ativo
          ? 'Ligadas: avisos de acesso, herança e cofre chegam mesmo com o Krypta em segundo plano.'
          : 'Desligadas: os avisos aparecem só dentro do Krypta.';
  return { ligado: ativo, mudar, texto, podeLigar: permissao !== 'indisponivel' && permissao !== 'negada' };
}
