// src/services/vaultFlows.ts
// ============================================================
// FLUXOS DO COFRE — a "lógica do app" que conversa com o dispositivo e
// com a API. As telas só chamam estas funções. Quando o app desktop
// (Tauri) e o PWA existirem, eles reaproveitam este mesmo arquivo,
// trocando só o dispositivo virtual pelo ESP32 de verdade.
//
// Ordem das obrigações do cliente (contrato, seções 4 e 6):
//   • a CCP/CCH é gerada aqui, mostrada uma vez e nunca enviada
//   • todo envelope novo é CONFERIDO localmente antes de ir ao servidor
//   • o version_counter sobe 1 a cada gravação (anti-rollback)
//   • "concluir recuperação" só depois de gravar no dispositivo (RN07)
// ============================================================
import { VaultAPI } from './api';
import { DeviceAPI, VirtualDevice, loginDispositivo, esquecerToken, type EstadoDispositivo } from './virtualDevice';
import {
  abrirCofre,
  aleatorio,
  bytesParaB64,
  b64ParaBytes,
  criarEnvelope,
  derivar,
  envelopeAbre,
  montarVaultEnc,
  lerCredenciais,
  resumirMudancas,
  type Credencial,
} from '../crypto/kryptaCrypto';

function exigirDispositivo(contaId: string): EstadoDispositivo {
  const d = VirtualDevice.carregar(contaId);
  if (!d) throw new Error('Este navegador não tem o dispositivo desta conta.');
  return d;
}

function exigirCofre(d: EstadoDispositivo): { chaveCofre: Uint8Array; envelopeCcp: NonNullable<EstadoDispositivo['envelopeCcp']> } {
  if (!d.chaveCofre || !d.envelopeCcp) throw new Error('O dispositivo ainda não tem um cofre inicializado.');
  return { chaveCofre: b64ParaBytes(d.chaveCofre), envelopeCcp: d.envelopeCcp };
}

/** Próxima versão: nunca menor que a do servidor */
async function proximaVersao(token: string, d: EstadoDispositivo): Promise<number> {
  try {
    const meta = await DeviceAPI.metadata(token);
    return Math.max(meta.version_counter, d.versionCounter) + 1;
  } catch (e) {
    if ((e as { code?: number }).code === 404) return d.versionCounter + 1;
    throw e;
  }
}

/** Gera o vault.enc a partir do que está no dispositivo */
async function payloadDoDispositivo(d: EstadoDispositivo, extra: Partial<EstadoDispositivo> = {}): Promise<string> {
  const atual = { ...d, ...extra };
  const { chaveCofre, envelopeCcp } = exigirCofre(atual);
  return montarVaultEnc({
    chaveCofre,
    credenciais: atual.credenciais,
    envelopeCcp,
    envelopeHerdeiro: atual.envelopeHerdeiro,
  });
}

// ============================================================
// PAREAMENTO
// ============================================================
/**
 * @param dispositivoSerial número de série de um dispositivo FÍSICO comprado
 *        (Krypta Pro). Sem ele, o pareamento é de SOFTWARE (Free e Pro).
 */
export async function parearDispositivo(
  contaId: string,
  ccp: string,
  dispositivoSerial: string | null = null,
  credenciaisIniciais: Credencial[] = []
) {
  // 1. Deriva a prova e a chave do envelope a partir da CCP
  const { prova, chaveEnvelope } = await derivar(ccp, contaId, 'ccp');

  // 2. "ESP32" gera o par de chaves
  const d = VirtualDevice.criar(contaId);

  // 3. Cria o cofre e o envelope da CCP, e CONFERE que abre
  const chaveCofre = aleatorio(32);
  const envelopeCcp = await criarEnvelope(chaveEnvelope, chaveCofre);
  if (!(await envelopeAbre(chaveEnvelope, envelopeCcp, chaveCofre))) {
    throw new Error('Falha ao conferir o envelope da CCP. Nada foi enviado.');
  }
  d.chaveCofre = bytesParaB64(chaveCofre);
  d.envelopeCcp = envelopeCcp;
  d.credenciais = credenciaisIniciais;

  // 4. Pareia (token do site) e só então guarda o dispositivo
  await VaultAPI.pair(d.publicKey, prova, dispositivoSerial);
  VirtualDevice.salvar(d);

  // 5. Primeiro backup (versão 1)
  const token = await loginDispositivo(d);
  const payload = await payloadDoDispositivo(d);
  const r = await DeviceAPI.enviarBackup(token, 1, payload);
  d.versionCounter = r.version_counter;
  VirtualDevice.salvar(d);
  return d;
}

// ============================================================
// USO DIÁRIO: salvar o cofre (grava no dispositivo e depois envia o backup)
// ============================================================
/**
 * Uma alteração no cofre:
 *  • função (recomendado): recebe a lista MAIS NOVA (já sincronizada) e devolve a nova lista
 *  • lista pronta: se outro aparelho mudou o cofre nesse meio tempo, recusa (evita apagar a edição dele)
 */
export type MudancaCofre = Credencial[] | ((atuais: Credencial[]) => Credencial[]);

export class CofreMudouError extends Error {
  constructor() {
    super('O cofre foi alterado em outro aparelho. Atualizamos a lista: confira e salve de novo.');
    this.name = 'CofreMudouError';
  }
}

export async function salvarCofre(contaId: string, mudanca: MudancaCofre) {
  // v1.2.0: antes de gravar, puxa o que outro aparelho (senha de acesso) ou uma restauração mudou
  const { dispositivo: d, mudou } = await sincronizarDispositivo(contaId);
  if (mudou && Array.isArray(mudanca)) throw new CofreMudouError();
  const credenciais = typeof mudanca === 'function' ? mudanca(d.credenciais) : mudanca;

  const token = await loginDispositivo(d);
  const versao = await proximaVersao(token, d);

  // RN07: grava no dispositivo ANTES de enviar
  const novo: EstadoDispositivo = { ...d, credenciais, versionCounter: versao };
  VirtualDevice.salvar(novo);

  const resumo = resumirMudancas(d.credenciais, credenciais);
  const r = await DeviceAPI.enviarBackup(token, versao, await payloadDoDispositivo(novo), resumo);
  return { ...novo, versionCounter: r.version_counter };
}

/**
 * v1.2.0 — SINCRONIA: outro aparelho editou o cofre com a senha de acesso, ou um
 * ponto de restauração foi aplicado? O dispositivo pareado puxa a versão nova
 * (cifrada) e abre com a chave do cofre que ele já tem. Só funciona com o cofre ATIVO.
 */
export async function sincronizarDispositivo(contaId: string): Promise<{ dispositivo: EstadoDispositivo; mudou: boolean }> {
  const d = exigirDispositivo(contaId);
  const { chaveCofre } = exigirCofre(d);
  const token = await loginDispositivo(d);
  let r;
  try {
    r = await DeviceAPI.sincronizar(token, d.versionCounter);
  } catch (e) {
    // Estado que não é ATIVA (recuperação etc.): segue com o que está no aparelho
    if ((e as { code?: number }).code === 403) return { dispositivo: d, mudou: false };
    throw e;
  }
  if (!r.atualizado || !r.payload_cifrado) return { dispositivo: d, mudou: false };
  const credenciais = await lerCredenciais(chaveCofre, r.payload_cifrado);
  const novo: EstadoDispositivo = { ...d, credenciais, versionCounter: r.version_counter };
  VirtualDevice.salvar(novo);
  return { dispositivo: novo, mudou: true };
}

export async function testarLogin(contaId: string) {
  const d = exigirDispositivo(contaId);
  esquecerToken(contaId);
  await loginDispositivo(d);
}

// ============================================================
// "ESQUECI A SENHA MESTRE" (recuperação local)
// ============================================================
export async function recuperacaoLocal(contaId: string, ccp: string) {
  const d = exigirDispositivo(contaId);
  const { prova, chaveEnvelope } = await derivar(ccp, contaId, 'ccp');
  const token = await loginDispositivo(d);

  await DeviceAPI.recoveryOwner(token, prova); // ATIVA → RECUPERACAO_LOCAL
  const backup = await DeviceAPI.baixarBackup(token);
  const aberto = await abrirCofre(backup.payload_cifrado, chaveEnvelope, 'ccp');

  // Aqui o app real cria o NOVO Envelope do Titular (nova senha mestre).
  // Na demonstração regravamos o cofre aberto com a CCP, versão + 1.
  const versao = Math.max(backup.version_counter, d.versionCounter) + 1;
  const novo: EstadoDispositivo = {
    ...d,
    chaveCofre: bytesParaB64(aberto.chaveCofre),
    credenciais: aberto.credenciais,
    versionCounter: versao,
  };
  VirtualDevice.salvar(novo);
  await DeviceAPI.enviarBackup(token, versao, await payloadDoDispositivo(novo));

  await DeviceAPI.recoveryComplete(token); // → ATIVA
  return novo;
}

// ============================================================
// TROCAR A CCP
// ============================================================
export async function trocarCcp(contaId: string, ccpAtual: string, ccpNova: string) {
  // v1.2.0: puxa antes o que outro aparelho editou (senão a gravação abaixo apagaria a edição dele)
  const { dispositivo: d } = await sincronizarDispositivo(contaId);
  const { chaveCofre } = exigirCofre(d);
  const atual = await derivar(ccpAtual, contaId, 'ccp');
  const nova = await derivar(ccpNova, contaId, 'ccp');

  const envelopeCcp = await criarEnvelope(nova.chaveEnvelope, chaveCofre);
  if (!(await envelopeAbre(nova.chaveEnvelope, envelopeCcp, chaveCofre))) {
    throw new Error('A nova CCP não abriu o novo envelope. Nada foi enviado.');
  }

  const token = await loginDispositivo(d);
  const versao = await proximaVersao(token, d);
  const novo: EstadoDispositivo = { ...d, envelopeCcp, versionCounter: versao };

  await DeviceAPI.rotateCcp(token, {
    prova_cont_dono_atual: atual.prova,
    prova_cont_dono_nova: nova.prova,
    version_counter: versao,
    payload_cifrado: await payloadDoDispositivo(novo),
  });
  // Só troca no dispositivo depois do OK do servidor
  VirtualDevice.salvar(novo);
  return novo;
}

// ============================================================
// "ESQUECI A CCP, MAS ESTOU COM O DISPOSITIVO"
// O dispositivo tem a chave do cofre: ele cria um envelope com a CCP nova.
// O servidor exige também a senha do site (dispositivo roubado sozinho não basta).
// ============================================================
export async function redefinirCcpComDispositivo(contaId: string, senhaSite: string, ccpNova: string) {
  // v1.2.0: puxa antes o que outro aparelho editou (senão a gravação abaixo apagaria a edição dele)
  const { dispositivo: d } = await sincronizarDispositivo(contaId);
  const { chaveCofre } = exigirCofre(d);
  const nova = await derivar(ccpNova, contaId, 'ccp');

  const envelopeCcp = await criarEnvelope(nova.chaveEnvelope, chaveCofre);
  if (!(await envelopeAbre(nova.chaveEnvelope, envelopeCcp, chaveCofre))) {
    throw new Error('A nova CCP não abriu o novo envelope. Nada foi enviado.');
  }

  const token = await loginDispositivo(d);
  const versao = await proximaVersao(token, d);
  const novo: EstadoDispositivo = { ...d, envelopeCcp, versionCounter: versao };

  await DeviceAPI.resetCcp(token, {
    password: senhaSite,
    prova_cont_dono_nova: nova.prova,
    version_counter: versao,
    payload_cifrado: await payloadDoDispositivo(novo),
  });
  VirtualDevice.salvar(novo);
  return novo;
}

// ============================================================
// VER O COFRE EM OUTRO APARELHO (Krypta Pro, só leitura)
// O servidor entrega o backup CIFRADO depois de conferir a prova da CCP;
// quem abre é este navegador. Nada é guardado aqui: fica só na memória.
// ============================================================
export async function abrirCofreComCcp(contaId: string, ccp: string) {
  const { prova, chaveEnvelope } = await derivar(ccp, contaId, 'ccp');
  const backup = await VaultAPI.abrirComCcp(prova);
  const aberto = await abrirCofre(backup.payload_cifrado, chaveEnvelope, 'ccp');
  return { credenciais: aberto.credenciais, versao: backup.version_counter, atualizadoEm: backup.atualizado_em };
}

// ============================================================
// ABANDONAR O COFRE (perdi a CCP e o dispositivo)
// v1.2.0: cada cofre tem as SUAS chaves. Nada do cofre antigo passa para o
// novo: este aparelho apaga o dispositivo antigo e o servidor apaga o backup,
// a senha de acesso e os pontos de restauração do cofre abandonado.
// ============================================================
export async function abandonarCofre(contaId: string, codigo: string) {
  const conta = await VaultAPI.confirmarAbandono(codigo);
  VirtualDevice.apagar(contaId); // a chave antiga foi banida
  esquecerToken(contaId);
  sessionStorage.removeItem('krypta:importar-no-cofre-novo'); // restos da v1.1.0
  return conta;
}

// ============================================================
// HERANÇA
// ============================================================
export async function ativarHeranca(contaId: string, ccp: string, cch: string) {
  // v1.2.0: puxa antes o que outro aparelho editou (senão a gravação abaixo apagaria a edição dele)
  const { dispositivo: d } = await sincronizarDispositivo(contaId);
  const { chaveCofre } = exigirCofre(d);
  const dono = await derivar(ccp, contaId, 'ccp');
  const herdeiro = await derivar(cch, contaId, 'cch');

  const envelopeHerdeiro = await criarEnvelope(herdeiro.chaveEnvelope, chaveCofre);
  if (!(await envelopeAbre(herdeiro.chaveEnvelope, envelopeHerdeiro, chaveCofre))) {
    throw new Error('A CCH não abriu o Envelope do Herdeiro. Nada foi enviado.');
  }

  const token = await loginDispositivo(d);
  const versao = await proximaVersao(token, d);
  const novo: EstadoDispositivo = { ...d, envelopeHerdeiro, versionCounter: versao };

  await DeviceAPI.inheritanceEnable(token, {
    prova_cont_dono_atual: dono.prova,
    prova_cont_herdeiro: herdeiro.prova,
    version_counter: versao,
    payload_cifrado: await payloadDoDispositivo(novo),
  });
  VirtualDevice.salvar(novo);
  return novo;
}

export async function desativarHeranca(contaId: string, ccp: string) {
  // v1.2.0: puxa antes o que outro aparelho editou (senão a gravação abaixo apagaria a edição dele)
  const { dispositivo: d } = await sincronizarDispositivo(contaId);
  const dono = await derivar(ccp, contaId, 'ccp');
  const token = await loginDispositivo(d);
  const versao = await proximaVersao(token, d);
  const novo: EstadoDispositivo = { ...d, envelopeHerdeiro: null, versionCounter: versao };

  await DeviceAPI.inheritanceDisable(token, {
    prova_cont_dono_atual: dono.prova,
    version_counter: versao,
    payload_cifrado: await payloadDoDispositivo(novo),
  });
  VirtualDevice.salvar(novo);
  return novo;
}

/**
 * Resgate pelo HERDEIRO (público). Cria o dispositivo do herdeiro,
 * resgata, baixa o backup, abre com a CCH e conclui a recuperação.
 */
export async function resgatarHeranca(contaId: string, cch: string) {
  const { prova, chaveEnvelope } = await derivar(cch, contaId, 'cch');
  const d = VirtualDevice.criar(contaId);

  await DeviceAPI.inheritanceClaim({ conta_id: contaId, prova_cont_herdeiro: prova, public_key: d.publicKey });
  VirtualDevice.salvar(d); // o dispositivo do herdeiro agora é o da conta

  const token = await loginDispositivo(d);
  const backup = await DeviceAPI.baixarBackup(token);
  const aberto = await abrirCofre(backup.payload_cifrado, chaveEnvelope, 'herdeiro');

  const novo: EstadoDispositivo = {
    ...d,
    chaveCofre: bytesParaB64(aberto.chaveCofre),
    envelopeCcp: aberto.vault.envelope_ccp,
    envelopeHerdeiro: null, // a CCH é de uso único
    credenciais: aberto.credenciais,
    versionCounter: backup.version_counter,
  };
  VirtualDevice.salvar(novo); // RN07: grava antes de concluir
  await DeviceAPI.recoveryComplete(token);
  return novo;
}

// ============================================================
// "PERDI O DISPOSITIVO"
// ============================================================
export async function acionarKillSwitch(contaId: string, ccp: string) {
  const { prova } = await derivar(ccp, contaId, 'ccp');
  const conta = await VaultAPI.killSwitch(prova);
  VirtualDevice.apagar(contaId); // o dispositivo antigo morreu
  return conta;
}

/** Vincula um dispositivo novo depois do Kill Switch e recupera o cofre */
export async function vincularNovoDispositivo(contaId: string, ccp: string, dispositivoSerial: string | null = null) {
  const { prova, chaveEnvelope } = await derivar(ccp, contaId, 'ccp');
  const d = VirtualDevice.criar(contaId);

  await VaultAPI.recoveryHardware(d.publicKey, prova, dispositivoSerial); // REVOGADA → RECUPERACAO_HARDWARE
  VirtualDevice.salvar(d);
  return concluirComBackup(contaId, chaveEnvelope);
}

// ============================================================
// HARDWARE REAL (ESP32): pareia o cofre com a chave que o dispositivo gerou
// ============================================================
/**
 * O ESP32 gera o par de chaves e se apresenta ao servidor (POST /hardware/announce).
 * Aqui o navegador só deriva a prova da CCP e pareia com a chave PÚBLICA do
 * dispositivo. A chave privada nunca sai do ESP32, então este navegador não
 * vira dispositivo: o login do cofre passa a ser feito pelo hardware.
 * (Guardar senhas pelo hardware e o primeiro backup vêm na próxima etapa do firmware.)
 */
export async function parearHardwareReal(contaId: string, ccp: string, serial: string, publicKey: string) {
  const { prova, chaveEnvelope } = await derivar(ccp, contaId, 'ccp');

  // Cofre vazio cifrado AQUI, com o envelope da CCP: já dá para recuperar com a CCP.
  // O objeto "d" é só um molde para montar o vault.enc; ele NÃO é salvo neste navegador.
  const molde = VirtualDevice.criar(contaId);
  const chaveCofre = aleatorio(32);
  const envelopeCcp = await criarEnvelope(chaveEnvelope, chaveCofre);
  if (!(await envelopeAbre(chaveEnvelope, envelopeCcp, chaveCofre))) {
    throw new Error('Falha ao conferir o envelope da CCP. Nada foi enviado.');
  }
  molde.chaveCofre = bytesParaB64(chaveCofre);
  molde.envelopeCcp = envelopeCcp;
  molde.credenciais = [];
  const backupInicial = await payloadDoDispositivo(molde);

  await VaultAPI.pair(publicKey, prova, serial, backupInicial);
}

/** Retoma uma recuperação aberta (ex.: a página foi fechada no meio) */
export async function retomarRecuperacao(contaId: string, ccp: string) {
  const { chaveEnvelope } = await derivar(ccp, contaId, 'ccp');
  return concluirComBackup(contaId, chaveEnvelope);
}

async function concluirComBackup(contaId: string, chaveEnvelope: CryptoKey) {
  const d = exigirDispositivo(contaId);
  const token = await loginDispositivo(d);
  const backup = await DeviceAPI.baixarBackup(token);
  const aberto = await abrirCofre(backup.payload_cifrado, chaveEnvelope, 'ccp');

  const novo: EstadoDispositivo = {
    ...d,
    chaveCofre: bytesParaB64(aberto.chaveCofre),
    envelopeCcp: aberto.vault.envelope_ccp,
    envelopeHerdeiro: aberto.vault.envelope_herdeiro ?? null,
    credenciais: aberto.credenciais,
    versionCounter: backup.version_counter,
  };
  VirtualDevice.salvar(novo); // RN07
  await DeviceAPI.recoveryComplete(token);
  return novo;
}
