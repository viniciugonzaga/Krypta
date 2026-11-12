import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

export function errorHandler(
  err: Error,
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

  console.error('❌ Erro inesperado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor.',
    code: 500,
  });
}