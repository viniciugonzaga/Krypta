// server/src/services/VaultRules.ts
// ============================================================
// Regras reaproveitadas por Backup, Contingência e Herança.
// (Na API original elas estavam espalhadas pelos services.)
// ============================================================
import { ApiError } from '../utils/ApiError.js';
import { compararComPepper } from '../utils/pepper.js';
import { VaultModel, type ContaCofre, type ResultadoGravacao } from '../models/VaultModel.js';

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
