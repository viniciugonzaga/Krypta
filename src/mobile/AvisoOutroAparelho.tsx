// src/mobile/AvisoOutroAparelho.tsx
// ============================================================
// v1.5.0 — "Seu cofre está pareado em outro aparelho"
// Mostrado no app e no site/Windows quando a chave do cofre mora em outro
// aparelho. Explica, conforme o plano, COMO abrir aqui:
//   • senha de acesso ............ todos os planos
//   • PIN de 6 dígitos ........... Krypta Pro
//   • digital ou rosto ........... Krypta Pro, só no celular
// e leva direto para abrir ou criar o acesso.
// ============================================================
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Crown, Eye, Fingerprint, KeyRound, Lock, Smartphone, Unlock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { VaultAPI, type EstadoAcessoRemoto } from '../services/api';
import { BioAcesso } from '../services/cofreRemoto';
import { isProPlan } from '../utils/plan';
import { useModo } from './ModoContext';
import { GRAD, MBotao, MCard, useMCores } from './ui';

export function AvisoOutroAparelho({ className = '' }: { className?: string }) {
  const c = useMCores();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modo } = useModo();
  const mobile = modo === 'mobile';
  const pro = isProPlan(user?.plan);
  const [estado, setEstado] = useState<EstadoAcessoRemoto | null>(null);

  useEffect(() => {
    VaultAPI.remotoEstado()
      .then(setEstado)
      .catch(() => setEstado(null));
  }, []);

  const configurado = !!estado?.configurado && !estado.bloqueado;
  const bioAqui = !!user && BioAcesso.ligada(user.id);

  const Metodo = ({ icone, titulo, texto, ok, pro: soPro }: { icone: ReactNode; titulo: string; texto: string; ok?: boolean; pro?: boolean }) => {
    const travado = soPro && !pro;
    return (
      <li className="flex items-center gap-3 py-2.5" style={{ borderTop: `1px solid ${c.faixa}`, opacity: travado ? 0.7 : 1 }}>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.faixa, color: c.roxo }}>
          {icone}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-semibold">{titulo}</span>
          <span className="block text-[11.5px]" style={{ color: c.suave }}>{texto}</span>
        </span>
        {travado ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-bold text-white" style={{ background: GRAD }}>
            <Crown className="w-3 h-3" /> Pro
          </span>
        ) : ok ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
            <Check className="w-3 h-3" /> Ativo
          </span>
        ) : (
          <span className="text-[10.5px] font-semibold" style={{ color: c.suave }}>
            {soPro ? 'Pro' : 'Todos os planos'}
          </span>
        )}
      </li>
    );
  };

  return (
    <MCard c={c} destaque className={className}>
      <div className="flex items-start gap-3">
        <motion.span
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white"
          style={{ background: GRAD }}
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2 }}
        >
          <Smartphone className="w-6 h-6" />
          <Lock className="absolute -bottom-1 -right-1 w-5 h-5 p-0.5 rounded-full" style={{ background: c.isDark ? '#140726' : '#fff', color: c.roxo }} />
        </motion.span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[16px] leading-snug">Seu cofre está pareado em outro aparelho</p>
          <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: c.suave }}>
            A chave do cofre fica no aparelho onde você o ativou. Aqui você abre e edita com:
          </p>
        </div>
      </div>

      <ul className="mt-3">
        <Metodo
          icone={<KeyRound className="w-[18px] h-[18px]" />}
          titulo="Senha de acesso"
          texto="8+ caracteres. Funciona em qualquer aparelho logado."
          ok={configurado && estado?.tipo === 'SENHA'}
        />
        <Metodo icone={<span className="text-[13px] font-bold tracking-tighter">123</span>} titulo="PIN de 6 dígitos" texto="Mais rápido no dia a dia." ok={configurado && estado?.tipo === 'PIN'} pro />
        {mobile && <Metodo icone={<Fingerprint className="w-[18px] h-[18px]" />} titulo="Digital ou rosto" texto="Ligue depois de abrir com o PIN ou a senha." ok={bioAqui} pro />}
      </ul>

      {estado?.bloqueado && (
        <p className="text-[12px] mt-2 rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          A senha de acesso foi bloqueada por tentativas erradas. Crie outra com a chave de contingência.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 mt-4">
        <MBotao onClick={() => navigate('/cofre/acesso')}>
          <Unlock className="w-4 h-4" /> {configurado ? `Abrir com ${estado?.tipo === 'PIN' ? 'o PIN' : 'a senha'}${bioAqui ? ' ou a digital' : ''}` : 'Criar a senha de acesso'}
        </MBotao>
        <MBotao variante="secundario" onClick={() => navigate('/cofre/ver')}>
          <Eye className="w-4 h-4" /> Só ver, com a chave de contingência
        </MBotao>
      </div>
      {!configurado && (
        <p className="text-[11.5px] mt-3 text-center" style={{ color: c.suave }}>
          Criar o acesso pede a chave de contingência uma vez. Depois, só a senha{pro ? ' ou o PIN' : ''}.
        </p>
      )}
      {!pro && (
        <button type="button" onClick={() => navigate('/plans')} className="w-full text-[12px] font-semibold mt-3 underline underline-offset-4" style={{ color: c.roxo }}>
          PIN e biometria: conhecer o Krypta Pro
        </button>
      )}
    </MCard>
  );
}
