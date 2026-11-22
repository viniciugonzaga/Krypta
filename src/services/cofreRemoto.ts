// src/services/cofreRemoto.ts
// ============================================================
// v1.2.0 — COFRE EM QUALQUER APARELHO (Krypta Pro) + PONTOS DE RESTAURAÇÃO
//
// SENHA DE ACESSO AO COFRE
//   Criar (uma vez, em qualquer aparelho logado):  CCP + PIN novo
//     1. a CCP gera a prova → o servidor devolve o backup cifrado + salt + segredo dele
//     2. este aparelho abre o envelope da CCP → chave do cofre
//     3. PIN + segredo do servidor → chave do envelope do PIN
//     4. envelope do PIN = AES-GCM(chave do cofre) → vai ao servidor (cifrado)
//   Abrir (no dia a dia): só o PIN
//     o servidor confere a prova do PIN (5 erros = bloqueio) e entrega
//     envelope + segredo + backup cifrado + um token do cofre de 15 min.
//
// A SESSÃO ABERTA vive SÓ NA MEMÓRIA desta aba: recarregar a página, sair da
// conta, 15 minutos ou "Fechar o cofre" apagam a chave. Nada é gravado no aparelho.
// ============================================================
import { VaultAPI, type ResumoMudancas } from './api';
import {
  abrirCofre,
  abrirEnvelope,
  cifrar,
  derivar,
  derivarPin,
  lerCredenciais,
  resumirMudancas,
  trocarDados,
  type Cifrado,
  type Credencial,
} from '../crypto/kryptaCrypto';
import { VirtualDevice } from './virtualDevice';
import { sincronizarDispositivo, type MudancaCofre } from './vaultFlows';

export type TipoAcesso = 'PIN' | 'SENHA';

/** PIN = 6 números. SENHA = 8+ caracteres (mais forte; recomendada) */
export function validarSenhaAcesso(tipo: TipoAcesso, valor: string): string | null {
  if (tipo === 'PIN') return /^\d{6}$/.test(valor) ? null : 'O PIN tem exatamente 6 números.';
  if (valor.length < 8) return 'A senha de acesso precisa de pelo menos 8 caracteres.';
  return null;
}

// ============================================================
// SESSÃO (memória)
// ============================================================
interface Sessao {
  contaId: string;
  token: string;
  expiraEm: number;
  chaveCofre: Uint8Array;
  credenciais: Credencial[];
  versao: number;
  atualizadoEm: string;
}

let sessao: Sessao | null = null;
let timer: number | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

function encerrar() {
  if (sessao) sessao.chaveCofre.fill(0);
  sessao = null;
  if (timer) window.clearTimeout(timer);
  timer = null;
  avisar();
}

// Sair da conta apaga a sessão do cofre na hora
if (typeof window !== 'undefined') {
  window.addEventListener('krypta:session-expired', encerrar);
}

export interface SessaoPublica {
  credenciais: Credencial[];
  versao: number;
  atualizadoEm: string;
  expiraEm: number;
}

export const SessaoCofre = {
  /** Sessão aberta desta conta (sem expor a chave) */
  atual(contaId: string): SessaoPublica | null {
    if (!sessao || sessao.contaId !== contaId) return null;
    if (Date.now() >= sessao.expiraEm) {
      encerrar();
      return null;
    }
    return { credenciais: sessao.credenciais, versao: sessao.versao, atualizadoEm: sessao.atualizadoEm, expiraEm: sessao.expiraEm };
  },

  assinar(f: () => void): () => void {
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  },

  fechar: encerrar,

  /** Abre o cofre com o PIN/senha de acesso */
  async abrir(contaId: string, pin: string, saltB64: string): Promise<SessaoPublica> {
    const d = await derivarPin(pin, saltB64);
    let r;
    try {
      r = await VaultAPI.remotoAbrir(d.prova);
    } catch (e) {
      d.descartar();
      throw e;
    }
    const chaveEnvelope = await d.chaveCom(r.segredo);
    const chaveCofre = await abrirEnvelope(chaveEnvelope, JSON.parse(r.envelope) as Cifrado);
    if (!chaveCofre) throw new Error('Não foi possível abrir o cofre com esta senha de acesso. Crie outra com a CCP.');
    const credenciais = await lerCredenciais(chaveCofre, r.payload_cifrado);

    encerrar();
    sessao = {
      contaId,
      token: r.token_cofre,
      expiraEm: Date.now() + r.minutos * 60_000 - 15_000,
      chaveCofre,
      credenciais,
      versao: r.version_counter,
      atualizadoEm: r.atualizado_em,
    };
    timer = window.setTimeout(encerrar, sessao.expiraEm - Date.now());
    avisar();
    return SessaoCofre.atual(contaId)!;
  },

  /** Baixa a versão mais nova (outro aparelho pode ter mudado) */
  async recarregar(): Promise<SessaoPublica | null> {
    if (!sessao) return null;
    const s = sessao;
    const b = await VaultAPI.remotoBaixar(s.token);
    s.credenciais = await lerCredenciais(s.chaveCofre, b.payload_cifrado);
    s.versao = b.version_counter;
    s.atualizadoEm = b.atualizado_em;
    avisar();
    return SessaoCofre.atual(s.contaId);
  },

  /**
   * Grava uma alteração: baixa o backup MAIS NOVO, aplica a mudança, troca só os
   * DADOS (os envelopes da CCP/herdeiro ficam como estão) e envia com versão + 1.
   * Se outro aparelho gravar no meio, o servidor recusa (409) e tentamos de novo 1x.
   */
  async salvar(mudanca: MudancaCofre): Promise<SessaoPublica> {
    if (!sessao) throw new Error('O cofre fechou. Digite a senha de acesso de novo.');
    const s = sessao;
    for (let tentativa = 0; ; tentativa++) {
      const b = await VaultAPI.remotoBaixar(s.token);
      const atuais = await lerCredenciais(s.chaveCofre, b.payload_cifrado);
      if (Array.isArray(mudanca) && b.version_counter !== s.versao) {
        s.credenciais = atuais;
        s.versao = b.version_counter;
        avisar();
        throw new Error('O cofre foi alterado em outro aparelho. Atualizamos a lista: confira e salve de novo.');
      }
      const novas = typeof mudanca === 'function' ? mudanca(atuais) : mudanca;
      const resumo: ResumoMudancas = resumirMudancas(atuais, novas);
      const payload = await trocarDados(s.chaveCofre, b.payload_cifrado, novas);
      try {
        const r = await VaultAPI.remotoGravar(s.token, b.version_counter + 1, payload, resumo);
        s.credenciais = novas;
        s.versao = r.version_counter;
        s.atualizadoEm = r.atualizado_em;
        avisar();
        return SessaoCofre.atual(s.contaId)!;
      } catch (e) {
        const motivo = (e as { details?: { motivo?: string } }).details?.motivo;
        if (motivo === 'VERSAO' && tentativa === 0 && typeof mudanca === 'function') continue;
        if (motivo === 'COFRE_REMOTO') encerrar();
        throw e;
      }
    }
  },
};

// ============================================================
// CONFIGURAR / REMOVER A SENHA DE ACESSO
// ============================================================
export async function configurarAcesso(contaId: string, ccp: string, tipo: TipoAcesso, senhaAcesso: string): Promise<void> {
  const erro = validarSenhaAcesso(tipo, senhaAcesso);
  if (erro) throw new Error(erro);

  // 1. CCP → prova; o servidor confere e devolve o backup cifrado + salt + segredo
  const { prova, chaveEnvelope } = await derivar(ccp, contaId, 'ccp');
  const prep = await VaultAPI.remotoPreparar(prova);

  // 2. Este aparelho abre o envelope da CCP (o servidor não consegue)
  const { chaveCofre } = await abrirCofre(prep.payload_cifrado, chaveEnvelope, 'ccp');

  // 3. Envelope do PIN, CONFERIDO aqui antes de enviar
  const pin = await derivarPin(senhaAcesso, prep.salt);
  const chavePin = await pin.chaveCom(prep.segredo);
  const envelope = await cifrar(chavePin, chaveCofre);
  const confere = await abrirEnvelope(chavePin, envelope);
  if (!confere || confere.length !== chaveCofre.length || !confere.every((b, i) => b === chaveCofre[i])) {
    throw new Error('O envelope da senha de acesso não conferiu. Nada foi enviado.');
  }
  chaveCofre.fill(0);

  await VaultAPI.remotoAtivar({ prova_cont_dono: prova, prova_pin: pin.prova, envelope: JSON.stringify(envelope), tipo });
}

export async function removerAcesso(senhaConta: string): Promise<void> {
  await VaultAPI.remotoRemover(senhaConta);
  encerrar();
}

// ============================================================
// PONTOS DE RESTAURAÇÃO (todos exigem a CCP)
// ============================================================
async function provaCcp(contaId: string, ccp: string): Promise<string> {
  return (await derivar(ccp, contaId, 'ccp')).prova;
}

export async function criarPonto(contaId: string, ccp: string, nome: string) {
  return VaultAPI.criarPonto(await provaCcp(contaId, ccp), nome);
}

export async function restaurarPonto(contaId: string, id: string, ccp: string) {
  const r = await VaultAPI.restaurarPonto(id, await provaCcp(contaId, ccp));
  // Quem estiver com o cofre aberto pega a versão restaurada
  if (VirtualDevice.carregar(contaId)) await sincronizarDispositivo(contaId).catch(() => undefined);
  if (sessao?.contaId === contaId) await SessaoCofre.recarregar().catch(() => encerrar());
  return r;
}

export async function apagarPonto(contaId: string, id: string, ccp: string) {
  return VaultAPI.apagarPonto(id, await provaCcp(contaId, ccp));
}
