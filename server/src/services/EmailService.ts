import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // STARTTLS
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const EmailService = {
  async sendRecoveryCode(to: string, code: string, name: string) {
    // Se SMTP não está configurado, apenas loga (modo dev)
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      console.warn('⚠️  SMTP não configurado — código de recuperação:', code);
      return;
    }

    await transporter.sendMail({
      from: env.MAIL_FROM,
      to,
      subject: 'Krypta — Recuperação de senha',
      html: `
        <div style="font-family: Quicksand, Arial, sans-serif; background:#0a0214; color:#fff; padding:32px; border-radius:12px;">
          <h1 style="color:#B4A0C8; letter-spacing:0.2em; margin:0 0 8px;">KRYPTA</h1>
          <p>Olá, <strong>${name}</strong>.</p>
          <p>Você solicitou a recuperação da sua senha. Use o código abaixo:</p>
          <div style="background:#1a0533;border:1px solid #6131C9;border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
            <span style="font-size:28px;font-weight:bold;color:#8d51ff;letter-spacing:0.15em;">${code}</span>
          </div>
          <p style="color:#B4A0C8;font-size:12px;">Válido por 30 minutos. Se não foi você, ignore este e-mail.</p>
        </div>
      `,
    });
  },
};