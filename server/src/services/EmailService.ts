// server/src/services/EmailService.ts
// ============================================================
// Envio de e-mails do Krypta. Dois jeitos (escolhidos pelo .env):
//
//  • BREVO_API_KEY preenchida → API HTTP da Brevo (porta 443).
//    Use na HOSPEDAGEM NO RENDER: o plano gratuito do Render bloqueia as
//    portas de SMTP (25, 465 e 587), então o SMTP do Gmail não sai de lá.
//  • Senão → SMTP (SMTP_HOST/PORT/USER/PASS), ex.: Gmail no seu PC.
//
// Sem nenhum dos dois, os e-mails aparecem só no terminal (desenvolvimento).
// ============================================================
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

const usaBrevo = () => !!env.BREVO_API_KEY;
const smtpConfigurado = () => usaBrevo() || (!!env.SMTP_USER && !!env.SMTP_PASS);

/** "Krypta <no-reply@x.com>" → { name, email } */
function remetente(): { name: string; email: string } {
  const m = env.MAIL_FROM.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || 'Krypta', email: m[2] } : { name: 'Krypta', email: env.MAIL_FROM.trim() };
}

interface Mensagem {
  from?: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Envia por Brevo (HTTP) ou SMTP. Lança erro se o provedor recusar. */
async function mandar(m: Mensagem): Promise<void> {
  if (!usaBrevo()) {
    await transporter.sendMail({ from: m.from ?? env.MAIL_FROM, to: m.to, subject: m.subject, html: m.html, replyTo: m.replyTo });
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: remetente(),
      to: [{ email: m.to }],
      subject: m.subject,
      htmlContent: m.html,
      ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => '');
    throw new Error(`Brevo recusou o e-mail (${res.status}): ${corpo.slice(0, 300)}`);
  }
}

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
  await mandar({ to: para, subject: assunto, html });
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

const escapar = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Endereço do suporte: SUPPORT_EMAIL ou o e-mail dentro do MAIL_FROM */
const emailSuporte = () => env.SUPPORT_EMAIL || (env.MAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.MAIL_FROM);

export const EmailService = {
  /** Formulário de Contato do site → caixa do suporte. Devolve true se saiu. */
  async sendContactMessage(m: { nome: string; email: string; assunto: string; mensagem: string }): Promise<boolean> {
    const para = emailSuporte();
    const html = layout(
      `Contato: ${escapar(m.assunto)}`,
      `
      <p><strong>De:</strong> ${escapar(m.nome)} &lt;${escapar(m.email)}&gt;</p>
      <p style="white-space:pre-wrap; background:#14062b; padding:12px; border-radius:8px;">${escapar(m.mensagem)}</p>
      `
    );
    if (!smtpConfigurado()) {
      console.warn(`⚠️  SMTP não configurado — mensagem de contato de ${m.email}:\n${m.mensagem}\n`);
      return false;
    }
    try {
      await mandar({ to: para, replyTo: m.email, subject: `Krypta — Contato: ${m.assunto}`, html });
      return true;
    } catch (err: any) {
      console.error('❌ Falha ao enviar mensagem de contato:', err?.message ?? err);
      return false;
    }
  },


  /** Recuperação de senha do SITE (já existia) */
  async sendRecoveryCode(to: string, code: string, name: string) {
    if (!smtpConfigurado()) {
      console.warn('⚠️  SMTP não configurado — código de recuperação:', code);
      return;
    }

    await mandar({
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

  /** Código para confirmar o abandono do cofre (perdeu a CCP e o dispositivo) */
  async sendAbandonCode(to: string, code: string, name: string): Promise<boolean> {
    if (!smtpConfigurado()) {
      console.warn(`⚠️  SMTP não configurado — código para ABANDONAR O COFRE de ${to}: ${code}`);
      return false;
    }
    return enviar(
      to,
      'Krypta — Código para abandonar o cofre',
      layout(
        'Abandonar o cofre',
        `
        <p>Olá, <strong>${name}</strong>.</p>
        <p>Recebemos um pedido para <strong>abandonar o cofre</strong> da sua conta Krypta. Use o código abaixo (vale 15 minutos):</p>
        <div style="background:#1a0533;border:1px solid #6131C9;border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
          <span style="font-size:28px;letter-spacing:6px;font-weight:bold;color:#C6AEF8;">${code}</span>
        </div>
        <p style="color:#f87171;"><strong>Se NÃO foi você</strong>, troque sua senha agora: alguém está usando o seu login.
        Sem este código, nada acontece com o seu cofre.</p>
        `,
        true
      )
    );
  },

  /** Avisos de segurança do cofre (CCP nova, abandono, cofre aberto em outro aparelho) */
  notifyVaultEvent(to: string, name: string, titulo: string, texto: string): void {
    silencioso(
      to,
      `Krypta — ${titulo}`,
      layout(
        titulo,
        `
        <p>Olá, <strong>${name}</strong>.</p>
        <p>${texto}</p>
        <p style="color:#f87171;"><strong>Se NÃO foi você</strong>, entre no Krypta, troque sua senha e use o bloqueio remoto.</p>
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
