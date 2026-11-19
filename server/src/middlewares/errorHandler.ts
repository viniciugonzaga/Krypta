// server/src/middlewares/errorHandler.ts
// Handlers globais: nunca vazar stack trace nem HTML do Express para o cliente.
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

/** 404 para rotas inexistentes (registrar DEPOIS de todas as rotas) */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'Rota não encontrada.', code: 404 });
}

export function errorHandler(
  err: Error & { type?: string; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.code).json({
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // Erros do body-parser do Express
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: 'JSON malformado.', code: 400 });
    return;
  }
  if (err.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: 'Corpo da requisição grande demais.', code: 413 });
    return;
  }

  console.error('❌ Erro inesperado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor.',
    code: 500,
  });
}
