// server/src/controllers/DeviceController.ts
// ============================================================
// DISPOSITIVOS COMPRADOS (token do site)
//
//  GET  /api/devices                      → unidades da conta (com status)
//  POST /api/devices/:serial/receive      → "Recebi" (simula a entrega):
//                                           EM_TRANSPORTE → DISPONIVEL
// O pareamento continua em POST /api/hardware/pair (com dispositivo_serial).
// ============================================================
import type { Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { DeviceModel, codigoConfirmacao, type Dispositivo } from '../models/DeviceModel.js';
import { AuditModel } from '../models/AuditModel.js';
import type { AuthedRequest } from '../middlewares/auth.js';

function serializar(d: Dispositivo, pareadoNaConta: string | null) {
  return {
    serial: d.serial,
    modelo: d.modelo,
    status: d.status,
    emUsoNoCofre: d.id === pareadoNaConta,
    entregueEm: d.entregue_em,
    pareadoEm: d.pareado_em,
    revogadoEm: d.revogado_em,
    compradoEm: d.criado_em,
    // Hardware real: o ESP32 já ligou e se apresentou com a chave dele
    conectado: !!d.chave_anunciada,
    chaveAnunciada: d.chave_anunciada,
    codigoConfirmacao: d.chave_anunciada ? codigoConfirmacao(d.chave_anunciada) : null,
    hardwareReal: !!d.chave_anunciada && d.public_key === d.chave_anunciada,
    ultimoContato: d.ultimo_contato,
  };
}

export const DeviceController = {
  listar: asyncHandler<AuthedRequest>(async (req, res: Response) => {
    const user = req.user!;
    const lista = await DeviceModel.listarPorUsuario(user.id);
    res.json({ success: true, data: lista.map((d) => serializar(d, user.dispositivo_id)) });
  }),

  receber: asyncHandler<AuthedRequest>(async (req, res: Response) => {
    const user = req.user!;
    const serial = String(req.params.serial ?? '');
    const ok = await DeviceModel.confirmarRecebimento(user.id, serial);
    if (!ok) {
      const d = await DeviceModel.obterPorSerial(serial);
      if (!d || d.user_id !== user.id) throw new ApiError(404, 'Dispositivo não encontrado nas suas compras.');
      throw new ApiError(409, 'Este dispositivo já foi recebido.');
    }
    await AuditModel.log({ userId: user.id, action: 'DEVICE_RECEIVED', detail: `Dispositivo ${serial} recebido`, ip: req.ip });
    const d = await DeviceModel.obterPorSerial(serial);
    res.json({ success: true, data: serializar(d!, user.dispositivo_id) });
  }),
};
