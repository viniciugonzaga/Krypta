// server/src/services/VaultRules.ts
// ============================================================
// Regras reaproveitadas por Backup, Contingência e Herança.
// (Na API original elas estavam espalhadas pelos services.)
// ============================================================
import { ApiError } from '../utils/ApiError.js';
import { compararComPepper } from '../utils/pepper.js';
import { VaultModel, type ContaCofre, type ResultadoGravacao } from '../models/VaultModel.js';
import { regrasDe, type RegrasPlano } from '../config/planos.js';
import { DeviceModel } from '../models/DeviceModel.js';

type RecursoPro = Exclude<keyof RegrasPlano, 'armazenamentoBytes'>;

const NOME_RECURSO: Record<RecursoPro, string> = {
  dispositivoFisico: 'O dispositivo físico Krypta',
  killSwitch: 'O Kill Switch (bloqueio remoto)',
  heranca: 'A herança digital',
  alertasAcesso: 'Os alertas de acesso',
};

/**
 * Bloqueia recursos que o plano da conta não libera (regras em config/planos.ts).
 * Responde 403 com details.motivo = 'PLANO' para o front mostrar "Assine o Pro".
 */
export function exigirRecurso(plan: string | null | undefined, recurso: RecursoPro): void {
  if (!regrasDe(plan)[recurso]) {
    throw new ApiError(403, `${NOME_RECURSO[recurso]} é um recurso do Krypta Pro. Assine o Pro para usar.`, {
      motivo: 'PLANO',
      recurso,
    });
  }
}

/** Limite de armazenamento do backup cifrado por plano (Free 64 KB · Pro 1 MB) */
export function exigirEspaco(plan: string | null | undefined, payload: Buffer): void {
  const limite = regrasDe(plan).armazenamentoBytes;
  if (payload.length > limite) {
    throw new ApiError(
      413,
      `O cofre passou do limite do seu plano (${Math.round(limite / 1024)} KB). Assine o Krypta Pro para ter até 1 MB.`,
      { motivo: 'PLANO', recurso: 'armazenamento' }
    );
  }
}

/**
 * Confere a unidade física escolhida pelo usuário para parear:
 * precisa ser dele, já ter sido recebida (DISPONIVEL) e o plano precisa ser Pro.
 * Devolve o id da unidade, ou null quando o pareamento é por software.
 */
export async function resolverDispositivoFisico(
  userId: string,
  plan: string | null | undefined,
  serial: unknown
): Promise<string | null> {
  if (serial === undefined || serial === null || serial === '') return null;
  if (typeof serial !== 'string' || !/^KRY-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(serial)) {
    throw new ApiError(400, 'dispositivo_serial inválido (formato KRY-XXXX-XXXX-XXXX).');
  }
  exigirRecurso(plan, 'dispositivoFisico');
  const d = await DeviceModel.obterPorSerial(serial);
  if (!d || d.user_id !== userId) throw new ApiError(404, 'Dispositivo não encontrado nas suas compras.');
  if (d.status === 'EM_TRANSPORTE') throw new ApiError(409, 'Este dispositivo ainda não foi entregue. Confirme o recebimento em Minhas compras.');
  if (d.status !== 'DISPONIVEL') throw new ApiError(409, `Este dispositivo está ${d.status.toLowerCase()} e não pode ser pareado.`);
  return d.id;
}

/** Conta do cofre ou 404 */
export async function exigirConta(userId: string): Promise<ContaCofre> {
  const conta = await VaultModel.obterPorId(userId);
  if (!conta) throw new ApiError(404, 'Conta não encontrada.');
  return conta;
}

/**
 * Confere a prova da CCP contra o bcrypt(pepper) guardado.
 * O servidor nunca vê a CCP: só a prova derivada no cliente.
 * Devolve o hash conferido (usado para detectar troca concorrente).
 */
export async function conferirProvaDono(
  userId: string,
  prova: string,
  mensagemInvalida = 'Prova de contingência inválida.'
): Promise<string> {
  const hash = await VaultModel.obterHashContDono(userId);
  if (!hash) throw new ApiError(409, 'Conta sem chave de contingência cadastrada.');
  if (!(await compararComPepper(prova, hash))) throw new ApiError(401, mensagemInvalida);
  return hash;
}

/** Converte o resultado das gravações transacionais em resposta ou erro HTTP */
export function resultadoOuErro(
  r: ResultadoGravacao,
  mensagemEstado: (status: string) => string
): { version_counter: number; atualizado_em: Date } {
  switch (r.resultado) {
    case 'OK':
      return { version_counter: r.version_counter, atualizado_em: r.atualizado_em };
    case 'SEM_CONTA':
      throw new ApiError(404, 'Conta não encontrada.');
    case 'ESTADO':
      throw new ApiError(409, mensagemEstado(r.status));
    case 'HASH_MUDOU':
      throw new ApiError(409, 'Chave de contingência alterada durante a operação. Tente novamente.');
    case 'VERSAO':
      throw new ApiError(409, 'version_counter igual ou inferior ao armazenado (anti-rollback).');
  }
}
