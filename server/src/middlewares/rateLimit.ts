// server/src/middlewares/rateLimit.ts
// ============================================================
// Limite de tentativas por IP (em memória, zera ao reiniciar).
// Responde 429 no mesmo formato de erro do resto da API.
// RATE_LIMIT_MULT (.env) multiplica os limites em desenvolvimento.
// ============================================================
import rateLimit from 'express-rate-limit';
import { env, isProduction } from '../config/env.js';

const multiplicador = isProduction ? 1 : Math.max(1, env.RATE_LIMIT_MULT);

const MSG = 'Muitas tentativas. Tente novamente mais tarde.';

function criar(windowMs: number, limite: number, mensagem = MSG) {
  return rateLimit({
    windowMs,
    limit: limite * multiplicador,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: mensagem, code: 429 },
  });
}

const MIN = 60 * 1000;

// ---- Portal (site) ----
export const limitarLoginPortal = criar(15 * MIN, 10);
export const limitarCadastro = criar(60 * MIN, 30);
// Formulário de contato: evita spam na caixa do suporte
export const limitarContato = criar(60 * MIN, 5, 'Você já enviou várias mensagens. Tente de novo mais tarde.');

// ---- Dispositivo ----
export const limitarAuthHardware = criar(1 * MIN, 30, 'Muitas requisições. Aguarde um instante.');
// Apresentação do ESP32 ao ligar (a cada 10 s enquanto espera o pareamento): limite próprio,
// para não gastar o limite do login do dispositivo
export const limitarAnuncio = criar(1 * MIN, 20, 'Muitas apresentações seguidas. Aguarde um instante.');
// Pareamento e conclusão de recuperação dividem o contador
export const limitarOperacaoConta = criar(15 * MIN, 30);

// ---- Contingência (Partes 5 e 6) ----
// recovery/owner, kill-switch e recovery/hardware dividem o contador
export const limitarContingencia = criar(15 * MIN, 20);
export const limitarRotacao = criar(15 * MIN, 20);
// Senha de acesso ao cofre: além do bloqueio após 5 erros na conta, limita por IP
export const limitarPinCofre = criar(15 * MIN, 20, 'Muitas tentativas de abrir o cofre. Aguarde alguns minutos.');
// Configurar a senha de acesso e mexer nos pontos de restauração (todos exigem a CCP)
export const limitarCofreRemoto = criar(15 * MIN, 40);
export const limitarHeranca = criar(15 * MIN, 20);
// Resgate do herdeiro é público: limite mais apertado
export const limitarResgate = criar(15 * MIN, 10);
