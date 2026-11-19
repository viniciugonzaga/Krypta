// server/src/models/TtlModel.ts
// ============================================================
// SQL da rotina de INATIVIDADE (RN11) — equivale ao ttlRepository.
//
// Quem entra na regra: só contas COM COFRE (já pareadas). Conta do site
// sem dispositivo (ex.: só Krypta Free pelo software) nunca é excluída
// por esta rotina, porque ela não tem como "sincronizar" com o ESP32.
//
// Datas: todas calculadas no Node e enviadas como parâmetro (o banco
// guarda em UTC por causa do timezone 'Z' da conexão). Não usamos NOW()
// do MySQL para não misturar o fuso do XAMPP com o do Node.
// ============================================================
import crypto from 'crypto';
import { execute, query } from '../config/database.js';

export type NivelAviso = 'D30' | 'D15' | 'H48';

export interface ContaCandidata {
  id: string;
  email: string;
  name: string;
  /** ultimo_sincronismo no momento da leitura (referência dos avisos) */
  sincronismo_ref: Date;
  dias_inativos: number;
  niveis_enviados: NivelAviso[];
}

const DIA_MS = 24 * 60 * 60 * 1000;

export const TtlModel = {
  /** Contas já dentro da janela de aviso (faltam <= diasAviso para o prazo) */
  async listarCandidatas(params: { diasPrazo: number; diasAviso: number; agora?: Date }): Promise<ContaCandidata[]> {
    const agora = params.agora ?? new Date();
    const limite = new Date(agora.getTime() - (params.diasPrazo - params.diasAviso) * DIA_MS);

    const rows = await query<{
      id: string;
      email: string;
      name: string;
      sincronismo_ref: Date;
      dias_inativos: number;
      niveis_enviados: string | null;
    }>(
      `SELECT u.id,
              u.email,
              u.name,
              u.ultimo_sincronismo AS sincronismo_ref,
              TIMESTAMPDIFF(DAY, u.ultimo_sincronismo, ?) AS dias_inativos,
              GROUP_CONCAT(a.nivel) AS niveis_enviados
         FROM users u
         LEFT JOIN avisos_ttl a
           ON a.user_id = u.id AND a.sincronismo_ref = u.ultimo_sincronismo
        WHERE u.estado_cofre <> 'PENDENTE_PAREAMENTO'
          AND u.ultimo_sincronismo < ?
        GROUP BY u.id, u.email, u.name, u.ultimo_sincronismo`,
      [agora, limite]
    );

    return rows.map((r) => ({
      ...r,
      dias_inativos: Number(r.dias_inativos),
      niveis_enviados: (r.niveis_enviados ? r.niveis_enviados.split(',') : []) as NivelAviso[],
    }));
  },

  /**
   * Registra o aviso SÓ se o sincronismo ainda for o mesmo da leitura.
   * Se o dono logou pelo dispositivo no meio do caminho, o prazo renovou
   * e este aviso não vale mais. INSERT IGNORE = não duplica.
   */
  async registrarAviso(params: { userId: string; nivel: NivelAviso; sincronismoRef: Date }): Promise<boolean> {
    const r = await execute(
      `INSERT IGNORE INTO avisos_ttl (id, user_id, nivel, sincronismo_ref, enviado_em)
       SELECT ?, id, ?, ultimo_sincronismo, ?
         FROM users
        WHERE id = ? AND ultimo_sincronismo = ?`,
      [crypto.randomUUID(), params.nivel, new Date(), params.userId, params.sincronismoRef]
    );
    return r.affectedRows > 0;
  },

  /**
   * Exclui as contas vencidas. Revalida TUDO no próprio DELETE:
   * prazo vencido E aviso H48 registrado há mais de 48 h para o MESMO
   * sincronismo. ON DELETE CASCADE apaga backups, sessões e avisos.
   * Os hashes de contingência moram na própria linha e saem junto.
   * Só a public_key revogada permanece (chaves_revogadas), para que
   * chaves banidas não voltem.
   */
  async excluirExpiradas(params: { diasPrazo: number; agora?: Date }): Promise<Array<{ id: string; email: string }>> {
    const agora = params.agora ?? new Date();
    const limitePrazo = new Date(agora.getTime() - params.diasPrazo * DIA_MS);
    const limiteAviso = new Date(agora.getTime() - 48 * 60 * 60 * 1000);

    const condicao = `
          estado_cofre <> 'PENDENTE_PAREAMENTO'
      AND ultimo_sincronismo < ?
      AND EXISTS (
            SELECT 1 FROM avisos_ttl a
             WHERE a.user_id = users.id
               AND a.nivel = 'H48'
               AND a.sincronismo_ref = users.ultimo_sincronismo
               AND a.enviado_em <= ?
          )`;

    const alvos = await query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE ${condicao}`,
      [limitePrazo, limiteAviso]
    );
    if (alvos.length === 0) return [];

    const marcadores = alvos.map(() => '?').join(', ');
    await execute(`DELETE FROM users WHERE id IN (${marcadores}) AND ${condicao}`, [
      ...alvos.map((a) => a.id),
      limitePrazo,
      limiteAviso,
    ]);

    // Confere quem realmente saiu (alguém pode ter renovado entre o SELECT e o DELETE)
    const restantes = await query<{ id: string }>(`SELECT id FROM users WHERE id IN (${marcadores})`, alvos.map((a) => a.id));
    const ficaram = new Set(restantes.map((r) => r.id));
    return alvos.filter((a) => !ficaram.has(a.id));
  },
};
