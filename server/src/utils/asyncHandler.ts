// server/src/utils/asyncHandler.ts
// Express 4 não captura erros de funções async sozinho (o Express 5,
// usado na API original, captura). Este wrapper manda qualquer erro
// para o errorHandler, sem precisar de try/catch em cada rota.
import type { NextFunction, Request, Response, RequestHandler } from 'express';

export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
