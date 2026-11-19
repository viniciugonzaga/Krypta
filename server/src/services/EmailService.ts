// server/src/services/EmailService.ts
import nodemailer from 'nodemailer';
import { env, isProduction, smtpOnlyTo } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // 465 = SSL direto · 587 = STARTTLS
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const smtpConfigurado = () => !!env.SMTP_USER && !!env.SMTP_PASS;

/** Fora de produção, com SMTP_ONLY_TO preenchido, só esses endereços recebem */
const destinatarioLiberado = (para: string) =>
  isProduction || smtpOnlyTo.length === 0 || smtpOnlyTo.includes(para.toLowerCase());

// ------------------------------------------------------------
// Layout padrão dos e-mails do Krypta
// ------------------------------------------------------------
function layout(titulo: string, corpoHtml: string, alerta = false): string {
  const cor = alerta ? '#f87171' : '#8d51ff';
  return `
    <div style="font-family: Quicksand, Arial, sans-serif; background:#0a0214; color:#fff; padding:32px; border-radius:12px; max-width:560px;">
      <h1 style="color:#B4A0C8; letter-spacing:0.2em; margin:0 0 4px;">KRYPTA</h1>
      <div style="height:2px; background:linear-gradient(90deg, ${cor}, transparent); margin:0 0 20px;"></div>
      <h2 style="color:${cor}; font-size:18px; margin:0 0 16px;">${titulo}</h2>
      ${corpoHtml}
      <p style="color:#B4A0C8; font-size:11px; margin-top:28px;">
        Este é um aviso automático de segurança do Krypta. Não responda este e-mail.
      </p>
    </div>
  `;
}

/** Devolve true SÓ se o e-mail saiu. Lança erro se o SMTP recusar. */
async function enviar(para: string, assunto: string, html: string): Promise<boolean> {
  if (!smtpConfigurado()) {
    console.warn(`⚠️  SMTP não configurado — e-mail NÃO enviado para ${para}: "${assunto}"`);
    return false;
  }
  if (!destinatarioLiberado(para)) {
    console.warn(`⚠️  ${para} fora do SMTP_ONLY_TO — e-mail NÃO enviado: "${assunto}"`);
    return false;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to: para, subject: assunto, html });
  return true;
}

/**
 * Avisos de segurança são "best-effort": se o e-mail falhar,
 * a operação (Kill Switch, resgate...) NÃO é desfeita nem atrasada.
 */
function silencioso(para: string, assunto: string, html: string): void {
  enviar(para, assunto, html).catch((err) => {
    console.error(`❌ Falha ao enviar aviso "${assunto}" para ${para}:`, err?.message ?? err);
  });
}

export const EmailService = {
  /** Recuperação de senha do SITE (já existia) */
  async sendRecoveryCode(to: string, code: string, name: string) {
    if (!smtpConfigurado()) {
      console.warn('⚠️  SMTP não configurado — código de recuperação:', code);
      return;
    }

    await transporter.sendMail({
      from: env.MAIL_FROM,
      to,
      subject: 'Krypta — Recuperação de senha',
      html: layout(
        'Recuperação de senha',
        `
        <p>Olá, <strong>${name}</strong>.</p>
        <p>Você solicitou a recuperação da sua senha. Use o código abaixo:</p>
        <div style="background:#1a0533;border:1px solid #6131C9;border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
          <span style="font-size:28px;font-weight:bold;color:#8d51ff;letter-spacing:0.15em;">${code}</span>
        </div>
        <p style="color:#B4A0C8;font-size:12px;">Válido por 30 minutos. Se não foi você, ignore este e-mail.</p>
        `
      ),
    });
  },

  /**
   * Aviso de inatividade (Parte 7). Devolve true SÓ se o e-mail saiu:
   * a rotina só registra o aviso (e, portanto, só exclui a conta depois)
   * quando o envio foi confirmado. Se lançar erro, o aviso fica pendente.
   */
  sendInactivityNotice(to: string, name: string, nivel: 'D30' | 'D15' | 'H48', diasRestantes: number): Promise<boolean> {
    const prazo = nivel === 'H48' ? 'em até 48 horas' : `em cerca de ${diasRestantes} dias`;
    const assunto =
      nivel === 'H48'
        ? 'Krypta — Sua conta será excluída em até 48 horas'
        : `Krypta — Sua conta será excluída em ${diasRestantes} dias`;
    return enviar(
      to,
      assunto,
      layout(
        nivel === 'H48' ? 'Último aviso de inatividade' : 'Aviso de inatividade',
        `
        <p>Olá, <strong>${name}</strong>.</p>
        <p>Sua conta Krypta está inativa e será <strong>excluída permanentemente ${prazo}</strong>,
        junto com o backup na nuvem e as chaves de contingência (política de inatividade de 365 dias).</p>
        <p><strong>Para manter a conta</strong>, conecte o seu dispositivo Krypta ao aplicativo e faça login:
        isso renova o prazo. Entrar apenas no site não renova.</p>
        <p style="color:#B4A0C8;">Se você não pretende mais usar o Krypta, nenhuma ação é necessária.</p>
        `,
        nivel === 'H48'
      )
    );
  },

  /** Kill Switch acionado (Parte 5) */
  notifyKillSwitch(to: string, name: string): void {
    silencioso(
      to,
      'Krypta — O dispositivo da sua conta foi revogado',
      layout(
        'Kill Switch acionado',
        `
        <p>Olá, <strong>${name}</strong>.</p>
        <p>O <strong>Kill Switch</strong> foi acionado na sua conta Krypta. O dispositivo vinculado
        foi <strong>revogado de forma permanente</strong> e a conta aguarda um novo dispositivo.</p>
        <p>Se foi você, nenhuma ação é necessária.</p>
        <p style="color:#f87171;"><strong>Se NÃO foi você</strong>, a sua chave de contingência (CCP)
        pode ter sido exposta. Entre no portal e troque sua senha imediatamente.</p>
        `,
        true
      )
    );
  },

  /** Herdeiro usou a chave de herança (Parte 6) */
  notifyInheritanceClaim(to: string, name: string): void {
    silencioso(
      to,
      'Krypta — A chave de herança da sua conta foi usada',
      layout(
        'Resgate de herança realizado',
        `
        <p>Olá, <strong>${name}</strong>.</p>
        <p>A <strong>chave de herança</strong> da sua conta Krypta foi usada para um resgate.
        O seu dispositivo foi revogado e o dispositivo do herdeiro foi vinculado à conta,
        que agora está em recuperação.</p>
        <p style="color:#f87171;"><strong>Se você não autorizou este resgate</strong>, a sua chave
        de herança pode ter sido exposta. Para retomar a conta, use a sua chave de contingência
        (CCP) para acionar o Kill Switch e vincular um novo dispositivo seu.</p>
        `,
        true
      )
    );
  },
};
