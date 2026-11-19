// server/src/controllers/OrderController.ts
// ============================================================
// PEDIDOS (token do site)
//
//  POST /api/orders
//    Plano:   { tipo: "PLANO", plano: "pro", periodo: "MENSAL"|"ANUAL",
//               metodo, parcelas, token_transacao, cartao_final? }
//    Produto: { tipo: "PRODUTO", produto: "krypta-device-v1", quantidade,
//               metodo, parcelas, token_transacao, cartao_final?,
//               endereco: { cep, endereco, numero } }
//
//    O PAGAMENTO é simulado no navegador (Krypta Pay). O servidor:
//      • recalcula o preço (nunca confia no valor que vem do navegador)
//      • grava o pedido
//      • plano  → muda a conta para Pro
//      • produto → cria as unidades com número de série (EM_TRANSPORTE)
//
//  GET /api/orders   → pedidos da conta, com os dispositivos de cada um
// ============================================================
import type { Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { OrderModel } from '../models/OrderModel.js';
import { DeviceModel } from '../models/DeviceModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { UserModel, normalizePlan } from '../models/UserModel.js';
import { PRECOS, type ProdutoId } from '../config/planos.js';
import { serializeUser } from './AuthController.js';
import type { AuthedRequest } from '../middlewares/auth.js';

const METODOS = ['card', 'pix', 'apple', 'google'] as const;

function lerPagamento(body: any) {
  const metodo = body?.metodo;
  if (!METODOS.includes(metodo)) throw new ApiError(400, 'Método de pagamento inválido.');
  const token = body?.token_transacao;
  if (typeof token !== 'string' || !/^tok_kp_[0-9a-f]{24}$/.test(token)) {
    throw new ApiError(400, 'Token da transação inválido.');
  }
  const cartaoFinal =
    metodo === 'card' && typeof body?.cartao_final === 'string' && /^\d{4}$/.test(body.cartao_final)
      ? (body.cartao_final as string)
      : null;
  const parcelas = Number.isInteger(body?.parcelas) && body.parcelas > 0 ? (body.parcelas as number) : 1;
  return { metodo: metodo as (typeof METODOS)[number], token, cartaoFinal, parcelas };
}

function serializarPedido(p: Awaited<ReturnType<typeof OrderModel.listarPorUsuario>>[number]) {
  return {
    id: p.id,
    codigo: p.codigo,
    tipo: p.tipo,
    item: p.item,
    descricao: p.descricao,
    quantidade: p.quantidade,
    valorUnitario: Number(p.valor_unitario),
    valorTotal: Number(p.valor_total),
    periodo: p.periodo,
    metodo: p.metodo,
    parcelas: p.parcelas,
    cartaoFinal: p.cartao_final,
    tokenTransacao: p.token_transacao,
    enderecoEntrega: p.endereco_entrega,
    status: p.status,
    criadoEm: p.criado_em,
  };
}

export const OrderController = {
  // ------------------------------------------------------------
  // POST /api/orders
  // ------------------------------------------------------------
  criar: asyncHandler<AuthedRequest>(async (req, res: Response) => {
    const user = req.user!;
    const tipo = req.body?.tipo;
    const pagamento = lerPagamento(req.body);

    // ============ PLANO ============
    if (tipo === 'PLANO') {
      if (req.body?.plano !== 'pro') throw new ApiError(400, 'Plano inválido.');
      if (normalizePlan(user.plan) === 'pro') throw new ApiError(409, 'Você já possui o Krypta Pro ativo.');
      const periodo = req.body?.periodo === 'ANUAL' ? 'ANUAL' : 'MENSAL';
      const valor = PRECOS.pro[periodo];

      const { pedido } = await OrderModel.criar({
        userId: user.id,
        tipo: 'PLANO',
        item: 'krypta-pro',
        descricao: `Krypta Pro — assinatura ${periodo === 'ANUAL' ? 'anual' : 'mensal'}`,
        quantidade: 1,
        valorUnitario: valor,
        periodo,
        metodo: pagamento.metodo,
        parcelas: 1,
        cartaoFinal: pagamento.cartaoFinal,
        tokenTransacao: pagamento.token,
        enderecoEntrega: null,
        novoPlano: 'pro',
      });

      await AuditModel.log({ userId: user.id, action: 'PLAN_CHANGED', detail: `Plano: Krypta Pro (${pedido.codigo})`, ip: req.ip });
      const atualizado = await UserModel.findById(user.id);
      res.status(201).json({ success: true, data: { pedido: serializarPedido(pedido), user: serializeUser(atualizado), dispositivos: [] } });
      return;
    }

    // ============ PRODUTO ============
    if (tipo === 'PRODUTO') {
      const produtoId = req.body?.produto as ProdutoId;
      const produto = PRECOS.produtos[produtoId];
      if (!produto) throw new ApiError(400, 'Produto inválido.');

      const quantidade = req.body?.quantidade;
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > produto.maxQuantidade) {
        throw new ApiError(400, `Quantidade inválida (1 a ${produto.maxQuantidade}).`);
      }
      const e = req.body?.endereco ?? {};
      const cep = String(e.cep ?? '').replace(/\D/g, '');
      if (cep.length !== 8 || String(e.endereco ?? '').trim().length < 4 || !String(e.numero ?? '').trim()) {
        throw new ApiError(400, 'Endereço de entrega incompleto.');
      }
      const endereco = `${String(e.endereco).trim().slice(0, 150)}, ${String(e.numero).trim().slice(0, 10)} — CEP ${cep.slice(0, 5)}-${cep.slice(5)}`;

      const { pedido, seriais } = await OrderModel.criar({
        userId: user.id,
        tipo: 'PRODUTO',
        item: produtoId,
        descricao: `${produto.nome} × ${quantidade}`,
        quantidade,
        valorUnitario: produto.preco,
        periodo: null,
        metodo: pagamento.metodo,
        parcelas: Math.min(pagamento.parcelas, produto.maxParcelas),
        cartaoFinal: pagamento.cartaoFinal,
        tokenTransacao: pagamento.token,
        enderecoEntrega: endereco,
      });

      await AuditModel.log({ userId: user.id, action: 'ORDER_DEVICE', detail: `${pedido.codigo}: ${seriais.join(', ')}`, ip: req.ip });
      res.status(201).json({
        success: true,
        data: { pedido: serializarPedido(pedido), user: serializeUser(user), dispositivos: seriais },
      });
      return;
    }

    throw new ApiError(400, 'tipo deve ser PLANO ou PRODUTO.');
  }),

  // ------------------------------------------------------------
  // GET /api/orders
  // ------------------------------------------------------------
  listar: asyncHandler<AuthedRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const [pedidos, dispositivos] = await Promise.all([OrderModel.listarPorUsuario(userId), DeviceModel.listarPorUsuario(userId)]);
    res.json({
      success: true,
      data: pedidos.map((p) => ({
        ...serializarPedido(p),
        dispositivos: dispositivos.filter((d) => d.pedido_id === p.id).map((d) => ({ serial: d.serial, status: d.status })),
      })),
    });
  }),
};
