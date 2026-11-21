// server/src/middlewares/cliente.ts
// ============================================================
// IDENTIFICA DE ONDE VEM CADA REQUISIÇÃO
//
//   web     → site no navegador do computador
//   mobile  → site no navegador do celular (ou em tela pequena no "modo Mobile")
//   pwa     → app instalado no celular pela tela inicial
//   desktop → app Krypta para Windows (Tauri)
//
// O front manda o cabeçalho X-Krypta-Cliente. Se não mandar (curl, versão
// antiga), o servidor deduz pelo navegador (User-Agent).
// Usado para: marcar as sessões (sessions.cliente), escrever "pelo celular"
// nos alertas de acesso e responder GET /api/client/context.
// ============================================================
import type { Request, Response, NextFunction } from 'express';

export type TipoCliente = 'web' | 'mobile' | 'pwa' | 'desktop';
export type TipoAparelho = 'celular' | 'tablet' | 'computador';

const VALIDOS: TipoCliente[] = ['web', 'mobile', 'pwa', 'desktop'];

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      cliente?: TipoCliente;
      aparelho?: TipoAparelho;
    }
  }
}

/** Celular, tablet ou computador, só pelo User-Agent */
export function aparelhoDoUserAgent(ua: string): TipoAparelho {
  const s = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone/.test(s)) return 'celular';
  return 'computador';
}

export function identificarCliente(req: Request, _res: Response, next: NextFunction) {
  const ua = String(req.headers['user-agent'] ?? '');
  const aparelho = aparelhoDoUserAgent(ua);
  const cabecalho = String(req.headers['x-krypta-cliente'] ?? '').toLowerCase() as TipoCliente;

  req.aparelho = aparelho;
  req.cliente = VALIDOS.includes(cabecalho) ? cabecalho : aparelho === 'computador' ? 'web' : 'mobile';
  next();
}

/** Texto curto para os alertas de acesso: "pelo celular", "pelo app do celular"... */
export function descreverCliente(cliente?: TipoCliente): string {
  switch (cliente) {
    case 'pwa':
      return 'pelo app do celular';
    case 'mobile':
      return 'pelo celular';
    case 'desktop':
      return 'pelo app para Windows';
    default:
      return 'pelo site';
  }
}
