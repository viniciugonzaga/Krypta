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
export async function parearDispositivo(contaId: string, ccp: string, credenciaisIniciais: Credencial[] = []) {
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
  await VaultAPI.pair(d.publicKey, prova);
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
export async function salvarCofre(contaId: string, credenciais: Credencial[]) {
  const d = exigirDispositivo(contaId);
  const token = await loginDispositivo(d);
  const versao = await proximaVersao(token, d);

  // RN07: grava no dispositivo ANTES de enviar
  const novo: EstadoDispositivo = { ...d, credenciais, versionCounter: versao };
  VirtualDevice.salvar(novo);

  const r = await DeviceAPI.enviarBackup(token, versao, await payloadDoDispositivo(novo));
  return { ...novo, versionCounter: r.version_counter };
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
  const d = exigirDispositivo(contaId);
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
// HERANÇA
// ============================================================
export async function ativarHeranca(contaId: string, ccp: string, cch: string) {
  const d = exigirDispositivo(contaId);
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
  const d = exigirDispositivo(contaId);
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
export async function vincularNovoDispositivo(contaId: string, ccp: string) {
  const { prova, chaveEnvelope } = await derivar(ccp, contaId, 'ccp');
  const d = VirtualDevice.criar(contaId);

  await VaultAPI.recoveryHardware(d.publicKey, prova); // REVOGADA → RECUPERACAO_HARDWARE
  VirtualDevice.salvar(d);
  return concluirComBackup(contaId, chaveEnvelope);
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
