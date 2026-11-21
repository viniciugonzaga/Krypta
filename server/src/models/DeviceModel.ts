// server/src/models/DeviceModel.ts
// ============================================================
// DISPOSITIVOS FÍSICOS COMPRADOS (1 linha por unidade)
//
//   EM_TRANSPORTE ──(confirmar recebimento)──► DISPONIVEL
//   DISPONIVEL    ──(parear no cofre)────────► PAREADO
//   PAREADO       ──(Kill Switch / herança)──► REVOGADO
//
// O número de série é o "nome" do dispositivo que o usuário escolhe
// na hora de parear: é assim que o cofre sabe de onde ele veio.
// ============================================================
import crypto from 'crypto';
import { execute, query, type Tx } from '../config/database.js';

export type StatusDispositivo = 'EM_TRANSPORTE' | 'DISPONIVEL' | 'PAREADO' | 'REVOGADO';

export interface Dispositivo {
  id: string;
  serial: string;
  user_id: string;
  pedido_id: string | null;
  modelo: string;
  status: StatusDispositivo;
  public_key: string | null;
  chave_anunciada: string | null;
  anunciado_em: Date | null;
  ultimo_contato: Date | null;
  entregue_em: Date | null;
  pareado_em: Date | null;
  revogado_em: Date | null;
  criado_em: Date;
}

/**
 * Código de confirmação de 6 dígitos de uma chave pública.
 * O ESP32 calcula o MESMO código e mostra na tela: SHA-256(32 bytes da chave),
 * primeiros 4 bytes como inteiro big-endian, módulo 1.000.000.
 */
export function codigoConfirmacao(publicKeyB64: string): string {
  const h = crypto.createHash('sha256').update(Buffer.from(publicKeyB64, 'base64')).digest();
  const n = h.readUInt32BE(0) % 1_000_000;
  const s = String(n).padStart(6, '0');
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

/** Ex.: KRY-7F3A-9C1B-04D2 */
export function gerarSerial(): string {
  const hex = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `KRY-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

export const DeviceModel = {
  async listarPorUsuario(userId: string): Promise<Dispositivo[]> {
    return query<Dispositivo>('SELECT * FROM dispositivos WHERE user_id = ? ORDER BY criado_em DESC', [userId]);
  },

  async obterPorSerial(serial: string): Promise<Dispositivo | null> {
    const rows = await query<Dispositivo>('SELECT * FROM dispositivos WHERE serial = ? LIMIT 1', [serial]);
    return rows[0] ?? null;
  },

  async obterPorId(id: string): Promise<Dispositivo | null> {
    const rows = await query<Dispositivo>('SELECT * FROM dispositivos WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  /** Cria as unidades de um pedido (dentro da transação do pedido) */
  async criarParaPedidoTx(tx: Tx, params: { userId: string; pedidoId: string; quantidade: number }): Promise<string[]> {
    const seriais: string[] = [];
    for (let i = 0; i < params.quantidade; i++) {
      const serial = gerarSerial();
      await tx.execute(
        `INSERT INTO dispositivos (id, serial, user_id, pedido_id, status, criado_em)
         VALUES (?, ?, ?, ?, 'EM_TRANSPORTE', ?)`,
        [crypto.randomUUID(), serial, params.userId, params.pedidoId, new Date()]
      );
      seriais.push(serial);
    }
    return seriais;
  },

  /** O ESP32 se apresentou com esta chave (a última apresentação vale) */
  async registrarAnuncio(id: string, publicKey: string): Promise<void> {
    const agora = new Date();
    await execute(
      'UPDATE dispositivos SET chave_anunciada = ?, anunciado_em = ?, ultimo_contato = ? WHERE id = ?',
      [publicKey, agora, agora, id]
    );
  },

  async registrarContato(id: string): Promise<void> {
    await execute('UPDATE dispositivos SET ultimo_contato = ? WHERE id = ?', [new Date(), id]);
  },

  /** Simula a entrega: EM_TRANSPORTE → DISPONIVEL */
  async confirmarRecebimento(userId: string, serial: string): Promise<boolean> {
    const r = await execute(
      `UPDATE dispositivos SET status = 'DISPONIVEL', entregue_em = ?
        WHERE serial = ? AND user_id = ? AND status = 'EM_TRANSPORTE'`,
      [new Date(), serial, userId]
    );
    return r.affectedRows > 0;
  },
};
