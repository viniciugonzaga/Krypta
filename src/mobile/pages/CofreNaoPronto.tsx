// src/mobile/pages/CofreNaoPronto.tsx
// Aviso quando o cofre não pode ser usado neste aparelho (não pareado,
// bloqueado, em recuperação ou com a chave em outro aparelho).
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock } from 'lucide-react';
import { GRAD, MBotao, MCard, type MCores } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { CriarTrava, DesbloquearCofre, useTrava } from '../TravaCofre';
import { isProPlan } from '../../utils/plan';

/** Quando o cofre ainda não está pronto neste aparelho */
export function CofreNaoPronto({ c, estado, aqui }: { c: MCores; estado?: string; aqui: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const contaId = user?.id ?? '';
  const { situacao } = useTrava(contaId);
  // v1.3.0: o cofre está neste aparelho, mas trancado (ou ainda sem PIN)
  if (estado === 'ATIVA' && aqui && situacao === 'trancado') return <div className="mb-4"><DesbloquearCofre contaId={contaId} /></div>;
  if (estado === 'ATIVA' && aqui && situacao === 'sem-trava') return <div className="mb-4"><CriarTrava contaId={contaId} isPro={isProPlan(user?.plan)} /></div>;
  const textos: Record<string, [string, string]> = {
    PENDENTE_PAREAMENTO: ['Seu cofre ainda não foi ativado', 'Pareie este aparelho (ou um dispositivo Krypta) e gere sua chave de contingência.'],
    REVOGADA: ['Dispositivo bloqueado', 'O Kill Switch foi acionado. Vincule este aparelho para recuperar o cofre.'],
    RECUPERACAO_LOCAL: ['Recuperação em andamento', 'Termine a recuperação para voltar a usar o cofre.'],
    RECUPERACAO_HARDWARE: ['Novo dispositivo em recuperação', 'Termine a recuperação para voltar a usar o cofre.'],
  };
  const [titulo, texto] =
    estado === 'ATIVA' && !aqui
      ? ['O cofre está em outro aparelho', 'A chave do cofre fica no dispositivo onde você pareou. No Krypta Pro, abra e edite aqui com a sua senha de acesso (PIN).']
      : textos[estado ?? 'PENDENTE_PAREAMENTO'] ?? textos.PENDENTE_PAREAMENTO;
  return (
    <MCard c={c} destaque className="mb-4">
      <div className="flex gap-3">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: GRAD }}>
          <Lock className="w-5 h-5" />
        </span>
        <div>
          <p className="font-semibold">{titulo}</p>
          <p className="text-[12.5px] mt-1" style={{ color: c.suave }}>{texto}</p>
        </div>
      </div>
      {estado === 'ATIVA' && !aqui && (
        <MBotao className="mt-4" onClick={() => navigate('/cofre/acesso')}>
          <Unlock className="w-4 h-4" /> Abrir com a senha de acesso
        </MBotao>
      )}
      {estado !== 'ATIVA' && (
        <MBotao className="mt-4" onClick={() => navigate(estado === 'REVOGADA' ? '/bloqueio' : '/cofre/completo')}>
          {estado === 'PENDENTE_PAREAMENTO' ? 'Ativar meu cofre' : estado === 'REVOGADA' ? 'Vincular este aparelho' : 'Continuar'}
        </MBotao>
      )}
    </MCard>
  );
}

