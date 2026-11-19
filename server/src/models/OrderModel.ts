// server/src/models/OrderModel.ts
// ============================================================
// PEDIDOS — toda compra (plano ou produto) gravada no servidor.
// O pagamento continua SIMULADO (Krypta Pay), mas o pedido, o plano
// e os dispositivos comprados passam a existir de verdade na conta.
// ============================================================
import crypto from 'crypto';
import { query, withTransaction } from '../config/database.js';
import { DeviceModel } from './DeviceModel.js';

export interface Pedido {
  id: string;
  codigo: string;
  user_id: string;
  tipo: 'PLANO' | 'PRODUTO';
  item: string;
  descricao: string;
  quantidade: number;
  valor_unitario: string; // DECIMAL vem como texto do MySQL
  valor_total: string;
  periodo: 'MENSAL' | 'ANUAL' | null;
  metodo: 'card' | 'pix' | 'apple' | 'google';
  parcelas: number;
  cartao_final: string | null;
  token_transacao: string;
  endereco_entrega: string | null;
  status: 'APROVADO' | 'CANCELADO';
  criado_em: Date;
}

/** Ex.: KRY-2611-7F3A9C */
export function gerarCodigoPedido(): string {
  const agora = new Date();
  const yy = String(agora.getUTCFullYear()).slice(2);
  const mm = String(agora.getUTCMonth() + 1).padStart(2, '0');
  return `KRY-${yy}${mm}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export interface NovoPedido {
  userId: string;
  tipo: 'PLANO' | 'PRODUTO';
  item: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  periodo: 'MENSAL' | 'ANUAL' | null;
  metodo: Pedido['metodo'];
  parcelas: number;
  cartaoFinal: string | null;
  tokenTransacao: string;
  enderecoEntrega: string | null;
  /** Plano: muda o plano da conta na MESMA transação */
  novoPlano?: 'pro';
}

export const OrderModel = {
  /**
   * Grava o pedido e seus efeitos, TUDO OU NADA:
   *  • plano   → users.plan = 'pro'
   *  • produto → cria as unidades em "dispositivos"
   */
  async criar(p: NovoPedido): Promise<{ pedido: Pedido; seriais: string[] }> {
    const id = crypto.randomUUID();
    const codigo = gerarCodigoPedido();
    const total = Math.round(p.valorUnitario * p.quantidade * 100) / 100;

    const seriais = await withTransaction(async (tx) => {
      await tx.execute(
        `INSERT INTO pedidos
          (id, codigo, user_id, tipo, item, descricao, quantidade, valor_unitario, valor_total,
           periodo, metodo, parcelas, cartao_final, token_transacao, endereco_entrega, status, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APROVADO', ?)`,
        [
          id, codigo, p.userId, p.tipo, p.item, p.descricao, p.quantidade, p.valorUnitario, total,
          p.periodo, p.metodo, p.parcelas, p.cartaoFinal, p.tokenTransacao, p.enderecoEntrega, new Date(),
        ]
      );

      if (p.novoPlano) {
        await tx.execute('UPDATE users SET plan = ? WHERE id = ?', [p.novoPlano, p.userId]);
        return [];
      }
      return DeviceModel.criarParaPedidoTx(tx, { userId: p.userId, pedidoId: id, quantidade: p.quantidade });
    });

    const pedido = (await this.obterPorId(id))!;
    return { pedido, seriais };
  },

  async obterPorId(id: string): Promise<Pedido | null> {
    const rows = await query<Pedido>('SELECT * FROM pedidos WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async listarPorUsuario(userId: string): Promise<Pedido[]> {
    return query<Pedido>('SELECT * FROM pedidos WHERE user_id = ? ORDER BY criado_em DESC', [userId]);
  },
};
