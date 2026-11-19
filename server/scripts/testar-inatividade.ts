// server/scripts/testar-inatividade.ts
// ============================================================
// TESTE DA ROTINA DE INATIVIDADE (Parte 7) — sem esperar 365 dias.
//
// Ele "envelhece" uma conta no banco e roda a varredura na hora.
// Os e-mails são SIMULADOS (impressos aqui), então funciona sem SMTP.
//
// ⚠️ Use só com a conta de teste do simulador: o último passo EXCLUI a conta.
//
//   npm run ttl -- envelhecer <email> <dias>    finge que a conta está há N dias sem usar o dispositivo
//   npm run ttl -- rodar                        roda a varredura (e-mails simulados)
//   npm run ttl -- avancar-aviso <email> <horas>  finge que o aviso de 48 h foi enviado há N horas
//   npm run ttl -- status <email>               mostra prazo e avisos registrados
//   npm run ttl -- roteiro <email>              faz o roteiro COMPLETO (avisos → exclusão)
//
// Não precisa do servidor rodando: fala direto com o MySQL (usa o mesmo .env).
// ============================================================
import { pool, query, execute } from '../src/config/database.js';
import { TtlService, DIAS_PRAZO, type EnviarAviso } from '../src/services/TtlService.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const ok = (m: string) => console.log(`  ✅ ${m}`);
const info = (m: string) => console.log(`  ·  ${m}`);
function falha(m: string): never {
  console.error(`  ❌ ${m}`);
  process.exit(1);
}

// "Carteiro" de mentira: imprime o e-mail e diz que saiu
const emailSimulado: EnviarAviso = async (a) => {
  console.log(`  📧 [simulado] para ${a.email}: aviso ${a.nivel} (${a.diasRestantes} dia(s) restantes)`);
  return true;
};

async function conta(email: string) {
  const rows = await query<{ id: string; email: string; estado_cofre: string; ultimo_sincronismo: Date }>(
    'SELECT id, email, estado_cofre, ultimo_sincronismo FROM users WHERE email = ? LIMIT 1',
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

async function envelhecer(email?: string, dias?: string) {
  if (!email || !dias || Number.isNaN(Number(dias))) falha('Uso: npm run ttl -- envelhecer <email> <dias>');
  const c = await conta(email);
  if (!c) falha(`Conta ${email} não encontrada.`);
  if (c.estado_cofre === 'PENDENTE_PAREAMENTO') falha('Essa conta não tem dispositivo pareado: a regra de inatividade não se aplica a ela.');

  const quando = new Date(Date.now() - Number(dias) * DIA_MS);
  quando.setMilliseconds(0);
  await execute('UPDATE users SET ultimo_sincronismo = ? WHERE id = ?', [quando, c.id]);
  ok(`${email} agora está há ${dias} dia(s) sem usar o dispositivo (faltam ${DIAS_PRAZO - Number(dias)} para o prazo)`);
}

async function rodar() {
  const r = await TtlService.executarVarredura({ enviarAviso: emailSimulado });
  for (const d of r.detalhes) info(d);
  ok(`Varredura: ${r.avisosEnviados} aviso(s) enviado(s), ${r.avisosPendentes} pendente(s), ${r.excluidas} conta(s) excluída(s)`);
  return r;
}

async function avancarAviso(email?: string, horas?: string) {
  if (!email || !horas || Number.isNaN(Number(horas))) falha('Uso: npm run ttl -- avancar-aviso <email> <horas>');
  const c = await conta(email);
  if (!c) falha(`Conta ${email} não encontrada.`);
  const quando = new Date(Date.now() - Number(horas) * 60 * 60 * 1000);
  const r = await execute("UPDATE avisos_ttl SET enviado_em = ? WHERE user_id = ? AND nivel = 'H48'", [quando, c.id]);
  if (r.affectedRows === 0) falha('Essa conta ainda não recebeu o aviso de 48 h. Rode "envelhecer" e "rodar" antes.');
  ok(`Aviso de 48 h de ${email} agora consta como enviado há ${horas} hora(s)`);
}

async function status(email?: string) {
  if (!email) falha('Uso: npm run ttl -- status <email>');
  const c = await conta(email);
  if (!c) {
    info(`${email}: conta NÃO existe (pode ter sido excluída pela rotina).`);
    return;
  }
  const dias = Math.floor((Date.now() - new Date(c.ultimo_sincronismo).getTime()) / DIA_MS);
  const avisos = await query<{ nivel: string; enviado_em: Date }>(
    'SELECT nivel, enviado_em FROM avisos_ttl WHERE user_id = ? ORDER BY enviado_em',
    [c.id]
  );
  console.log(`\n  ${c.email} · cofre ${c.estado_cofre}`);
  console.log(`  Dias sem usar o dispositivo: ${dias} (prazo: ${DIAS_PRAZO})`);
  console.log(`  Avisos registrados: ${avisos.length ? avisos.map((a) => a.nivel).join(', ') : 'nenhum'}\n`);
}

async function roteiro(email?: string) {
  if (!email) falha('Uso: npm run ttl -- roteiro <email>');
  console.log('\n⏳ Parte 7 — Roteiro completo de inatividade\n');

  await envelhecer(email, '340');
  let r = await rodar();
  if (r.avisosEnviados < 1) falha('Esperava o aviso de 30 dias.');

  r = await rodar();
  if (r.avisosEnviados !== 0) falha('O mesmo aviso não pode ser enviado duas vezes.');
  ok('Rodar de novo não repete o aviso');

  await envelhecer(email, '352');
  r = await rodar();
  if (r.avisosEnviados < 1) falha('Esperava o aviso de 15 dias.');

  await envelhecer(email, '366');
  r = await rodar();
  if (r.avisosEnviados < 1) falha('Esperava o aviso de 48 horas.');
  if (r.excluidas !== 0) falha('Não pode excluir antes de passar 48 h do último aviso.');
  ok('Prazo vencido, mas a conta NÃO foi excluída: o aviso de 48 h acabou de sair');

  await avancarAviso(email, '49');
  r = await rodar();
  if (r.excluidas < 1) falha('Esperava a exclusão da conta.');
  ok('Conta excluída depois do aviso de 48 h (backup, sessões e avisos foram junto)');

  await status(email);
  console.log('  Parte 7 OK! 🎉');
  console.log('  Para continuar testando, recrie a conta e pareie de novo (veja o guia).\n');
}

// ------------------------------------------------------------
const [, , comando, ...args] = process.argv;
const comandos: Record<string, () => Promise<unknown>> = {
  envelhecer: () => envelhecer(args[0], args[1]),
  rodar,
  'avancar-aviso': () => avancarAviso(args[0], args[1]),
  status: () => status(args[0]),
  roteiro: () => roteiro(args[0]),
};

if (!comando || !comandos[comando]) {
  console.log('Uso: npm run ttl -- <envelhecer email dias | rodar | avancar-aviso email horas | status email | roteiro email>');
  process.exit(1);
}

comandos[comando]()
  .catch((e) => falha(String(e)))
  .finally(() => pool.end());
