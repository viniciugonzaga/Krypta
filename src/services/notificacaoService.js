require('../config/env'); // garante o .env carregado, mesmo fora do servidor (ex.: testes)

// undefined = ainda não resolvido; null = envio desativado.
let transporte;
let remetente = null;
let permitidos = [];

const lista = (v) => (v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

function resolver() {
  if (transporte !== undefined) return;
  transporte = null;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_ONLY_TO, NODE_ENV } = process.env;

  if (!SMTP_HOST || !SMTP_FROM) {
    console.warn('Email desativado: defina SMTP_HOST e SMTP_FROM. Sem email, nenhuma conta é excluída por inatividade (RN11).');
    return;
  }
  permitidos = lista(SMTP_ONLY_TO);
  // Fora de produção só envia para endereços liberados: as suítes de teste criam
  // contas com emails falsos e não podem disparar mensagens reais.
  if (NODE_ENV !== 'production' && permitidos.length === 0) {
    console.warn('Email desativado fora de produção: defina SMTP_ONLY_TO com os endereços que podem receber mensagens.');
    return;
  }

  const nodemailer = require('nodemailer');
  const porta = Number.parseInt(SMTP_PORT, 10) || 587;
  transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: porta,
    secure: porta === 465,
    requireTLS: porta !== 465, // nunca manda credencial em texto claro
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  remetente = SMTP_FROM;
}

// Só para testes: injeta um transporte falso (ou null para simular "sem SMTP").
const _definirTransporte = (t, from = 'Krypta <nao-responder@krypta.test>', liberados = []) => {
  transporte = t;
  remetente = from;
  permitidos = liberados.map((s) => s.toLowerCase());
};

// true somente se o email saiu. Lança se o SMTP falhar.
async function enviar(para, assunto, texto) {
  resolver();
  if (!transporte) return false;
  if (permitidos.length > 0 && !permitidos.includes(String(para).toLowerCase())) return false;
  await transporte.sendMail({ from: remetente, to: para, subject: assunto, text: texto });
  return true;
}

// Usada pela rotina de TTL: se lançar ou devolver false, o aviso NÃO é registrado
// e, portanto, a conta não é excluída.
const enviarAvisoInatividade = ({ email, nivel, diasRestantes }) => {
  const prazo = nivel === 'H48' ? 'em até 48 horas' : `em cerca de ${diasRestantes} dias`;
  const assunto = nivel === 'H48'
    ? 'Krypta: sua conta será excluída em até 48 horas'
    : `Krypta: sua conta será excluída em ${diasRestantes} dias`;
  return enviar(
    email,
    assunto,
    `Sua conta Krypta está inativa e será excluída permanentemente ${prazo}, ` +
      'junto com o backup na nuvem e as chaves de contingência (política de inatividade de 365 dias).\n\n' +
      'Para manter a conta, conecte o seu dispositivo Krypta ao aplicativo e faça login: isso renova o prazo. ' +
      'Entrar apenas no portal não renova.\n\n' +
      'Se você não pretende mais usar o Krypta, nenhuma ação é necessária.'
  );
};

// Avisos de segurança: nunca lançam, para não derrubar a operação que os disparou.
const silencioso = async (email, assunto, texto) => {
  try {
    await enviar(email, assunto, texto);
  } catch (erro) {
    console.error('Notificação por email falhou:', erro.message);
  }
};

const notificarKillSwitch = (email) =>
  silencioso(
    email,
    'Krypta: o dispositivo da sua conta foi revogado',
    'O Kill Switch foi acionado na sua conta Krypta: o dispositivo vinculado foi revogado de forma ' +
      'permanente e a conta aguarda um novo dispositivo.\n\n' +
      'Se foi você, nenhuma ação é necessária.\n' +
      'Se NÃO foi você, a sua chave de contingência (CCP) pode ter sido exposta.'
  );

const notificarResgateHeranca = (email) =>
  silencioso(
    email,
    'Krypta: a chave de herança da sua conta foi usada',
    'A chave de herança da sua conta Krypta foi usada para um resgate. O seu dispositivo foi revogado ' +
      'e um novo dispositivo foi vinculado à conta, que está em recuperação.\n\n' +
      'Se você não autorizou este resgate, a sua chave de herança pode ter sido exposta. Para retomar a ' +
      'conta, use a sua chave de contingência (CCP) para acionar o Kill Switch e vincular um novo ' +
      'dispositivo seu.'
  );

module.exports = { enviarAvisoInatividade, notificarKillSwitch, notificarResgateHeranca, _definirTransporte };
