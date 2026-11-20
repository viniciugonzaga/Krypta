// server/src/controllers/ContactController.ts
// ============================================================
// POST /api/contact — formulário "Contatos" do site
//   { nome, email, assunto?, mensagem }
// Envia para o e-mail do suporte (SUPPORT_EMAIL). Sem SMTP configurado,
// a mensagem aparece no terminal do servidor (desenvolvimento).
// ============================================================
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { AuditModel } from '../models/AuditModel.js';
import { EmailService } from '../services/EmailService.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const ContactController = {
  async enviar(req: Request, res: Response, next: NextFunction) {
    try {
      const nome = texto(req.body?.nome, 120);
      const email = texto(req.body?.email, 160).toLowerCase();
      const assunto = texto(req.body?.assunto, 120) || 'Dúvida pelo site';
      const mensagem = texto(req.body?.mensagem, 4000);

      if (nome.length < 3) throw new ApiError(400, 'Informe seu nome completo.');
      if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Informe um e-mail válido.');
      if (mensagem.length < 10) throw new ApiError(400, 'Explique sua dúvida com pelo menos 10 caracteres.');

      const enviado = await EmailService.sendContactMessage({ nome, email, assunto, mensagem });
      await AuditModel.log({ userId: null, action: 'CONTACT_MESSAGE', detail: `Contato de ${email}: ${assunto}` });

      res.status(201).json({ success: true, data: { enviado } });
    } catch (err) {
      next(err);
    }
  },
};
