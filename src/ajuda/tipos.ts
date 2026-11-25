// src/ajuda/tipos.ts
// ============================================================
// KODY — tipos da conversa
// ============================================================
import type { PerfilAjuda } from './contexto';

export type Humor = 'oi' | 'ok' | 'duvida' | 'pensando' | 'alerta' | 'feliz' | 'triste' | 'erro' | 'dormindo';

export interface Acao {
  rotulo: string;
  para: string;
}

/** Opção de resposta rápida. Quando o Kody faz uma pergunta, a próxima
 *  mensagem é comparada primeiro com estas opções (rótulo + termos). */
export interface Opcao {
  rotulo: string;
  termos?: string[];
  /** leva direto para uma tela */
  para?: string;
  /** continua a conversa */
  resposta?: (p: PerfilAjuda, ctx: Ctx) => Resposta;
}

export interface Resposta {
  /** várias strings = vários balões, como numa conversa de verdade */
  texto: string | string[];
  acoes?: Acao[];
  sugestoes?: string[];
  opcoes?: Opcao[];
  humor?: Humor;
  /** conteúdo sensível (ex.: senha gerada): não fica guardado no histórico */
  efemera?: boolean;
  /** o app navega sozinho para esta tela logo depois da resposta */
  irPara?: string;
}

export interface Ctx {
  /** nº da mensagem da pessoa nesta conversa */
  turno: number;
  /** a pessoa perguntou o mesmo assunto logo antes */
  repetido: boolean;
  /** a mensagem parece de alguém irritado/aflito */
  frustrado: boolean;
  /** hora local (0–23) */
  hora: number;
  /** escolhe uma variação de texto sem repetir sempre a mesma */
  um: <T>(lista: readonly T[]) => T;
  /** primeiro nome, às vezes (para não ficar repetitivo) */
  nome: string;
}

export interface Assunto {
  id: string;
  titulo: string;
  termos: [string, number][];
  paginas?: string[];
  resposta: (p: PerfilAjuda, ctx: Ctx) => Resposta;
}
