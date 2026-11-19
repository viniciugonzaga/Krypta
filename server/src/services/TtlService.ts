// server/src/services/TtlService.ts
// ============================================================
// REGRA DE INATIVIDADE (RN11)
//
//  • Prazo: 365 dias sem atividade do DISPOSITIVO.
//    Renovam o prazo: login pelo dispositivo e envio de backup.
//    Login no site e consultas NÃO renovam.
//  • Avisos por e-mail: 30 dias, 15 dias e 48 horas antes.
//  • A exclusão EXIGE o aviso de 48 h registrado há mais de 48 h.
//    E o aviso só é registrado quando o e-mail SAIU de verdade.
//    → Sem SMTP configurado, NENHUMA conta é excluída.
// ============================================================
import { TtlModel, type NivelAviso } from '../models/TtlModel.js';
import { EmailService } from './EmailService.js';

export const DIAS_PRAZO = 365;
const DIAS_JANELA_AVISO = 30;

// O primeiro que casa é o mais urgente
const NIVEIS: Array<{ nivel: NivelAviso; diasRestantes: number }> = [
  { nivel: 'H48', diasRestantes: 2 },
  { nivel: 'D15', diasRestantes: 15 },
  { nivel: 'D30', diasRestantes: 30 },
];

/** Quem envia o aviso. Devolve true SÓ se o e-mail saiu. (Injetável nos testes.) */
export type EnviarAviso = (aviso: {
  userId: string;
  email: string;
  name: string;
  nivel: NivelAviso;
  diasRestantes: number;
}) => Promise<boolean>;

export interface ResumoVarredura {
  avisosEnviados: number;
  avisosPendentes: number;
  excluidas: number;
  detalhes: string[];
}

const enviarPadrao: EnviarAviso = (a) => EmailService.sendInactivityNotice(a.email, a.name, a.nivel, a.diasRestantes);

export const TtlService = {
  async executarVarredura(opcoes: { enviarAviso?: EnviarAviso; agora?: Date } = {}): Promise<ResumoVarredura> {
    const enviarAviso = opcoes.enviarAviso ?? enviarPadrao;
    const resumo: ResumoVarredura = { avisosEnviados: 0, avisosPendentes: 0, excluidas: 0, detalhes: [] };

    const candidatas = await TtlModel.listarCandidatas({
      diasPrazo: DIAS_PRAZO,
      diasAviso: DIAS_JANELA_AVISO,
      agora: opcoes.agora,
    });

    for (const conta of candidatas) {
      const restantes = DIAS_PRAZO - conta.dias_inativos;

      // Só o nível mais urgente já vencido. Se já foi enviado, nada a fazer.
      const devido = NIVEIS.find((n) => restantes <= n.diasRestantes);
      if (!devido || conta.niveis_enviados.includes(devido.nivel)) continue;

      let enviado = false;
      try {
        enviado = await enviarAviso({
          userId: conta.id,
          email: conta.email,
          name: conta.name,
          nivel: devido.nivel,
          diasRestantes: Math.max(restantes, 0),
        });
      } catch (err) {
        console.error(`TTL: falha ao enviar aviso ${devido.nivel} para ${conta.email}:`, (err as Error).message);
      }

      // Aviso só conta como enviado se o e-mail saiu
      if (!enviado) {
        resumo.avisosPendentes++;
        resumo.detalhes.push(`${conta.email}: aviso ${devido.nivel} NÃO enviado (fica pendente)`);
        continue;
      }

      await TtlModel.registrarAviso({ userId: conta.id, nivel: devido.nivel, sincronismoRef: conta.sincronismo_ref });
      resumo.avisosEnviados++;
      resumo.detalhes.push(`${conta.email}: aviso ${devido.nivel} enviado (${Math.max(restantes, 0)} dia(s) restantes)`);
    }

    const excluidas = await TtlModel.excluirExpiradas({ diasPrazo: DIAS_PRAZO, agora: opcoes.agora });
    resumo.excluidas = excluidas.length;
    for (const c of excluidas) {
      console.log(`TTL: conta ${c.email} excluída por inatividade (RN11).`);
      resumo.detalhes.push(`${c.email}: EXCLUÍDA por inatividade`);
    }

    return resumo;
  },
};
