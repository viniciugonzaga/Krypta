// src/utils/resumoConta.ts
// ============================================================
// v1.4.0 — "Resumo da sua conta": a MESMA regra no app e no site.
// Só entram itens que já fazem sentido para a pessoa: antes de ativar o
// cofre não aparece PIN, biometria nem herança (para não confundir).
// ============================================================
import type { SituacaoTrava } from '../services/virtualDevice';
import { isProPlan } from './plan';

export interface ItemResumo {
  ok: boolean;
  rotulo: string;
  valor: string;
  /** tela que resolve o item */
  para: string;
}

export function resumoConta(
  user: { estadoCofre?: string | null; dispositivoPareado?: boolean; tipoDispositivo?: string | null; herancaAtiva?: boolean; plan?: string | null },
  trava: { situacao: SituacaoTrava; info: { biometria: boolean } },
) {
  const pro = isProPlan(user.plan);
  const ativo = user.estadoCofre === 'ATIVA';
  const aqui = trava.situacao !== 'sem-dispositivo';
  const itens: ItemResumo[] = [
    { ok: ativo, rotulo: 'Cofre', valor: ativo ? 'Ativo' : 'Não ativado', para: '/device' },
    {
      ok: !!user.dispositivoPareado,
      rotulo: 'Dispositivo',
      valor: user.dispositivoPareado ? (user.tipoDispositivo === 'FISICO' ? 'Físico' : aqui ? 'Este aparelho' : 'Outro aparelho') : 'Nenhum',
      para: '/device',
    },
  ];
  if (ativo && aqui) itens.push({ ok: trava.situacao !== 'sem-trava', rotulo: 'PIN do cofre', valor: trava.situacao === 'sem-trava' ? 'Criar agora' : 'Configurado', para: trava.situacao === 'sem-trava' ? '/device' : '/cofre/acesso' });
  if (ativo && aqui && trava.situacao !== 'sem-trava') itens.push({ ok: trava.info.biometria, rotulo: 'Biometria', valor: trava.info.biometria ? 'Ligada' : 'Desligada', para: '/cofre/acesso' });
  if (ativo && pro) itens.push({ ok: !!user.herancaAtiva, rotulo: 'Herança', valor: user.herancaAtiva ? 'Ativa' : 'Desativada', para: '/device#heranca' });

  const pct = itens.filter((i) => i.ok).length / itens.length;
  const status = pct >= 0.99 ? 'Conta segura' : pct >= 0.6 ? 'Quase lá' : 'Proteja sua conta';
  return { itens, pct, status, ativo, aqui, pro };
}
