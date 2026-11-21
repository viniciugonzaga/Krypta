// server/src/services/Recomendacao.ts
// ============================================================
// QUESTIONÁRIO DE BOAS-VINDAS → PLANO RECOMENDADO
//
// As 5 perguntas do primeiro acesso (app/modo Mobile e site):
//   1. usos         (várias)  como pretende usar o Krypta
//   2. nivel        (uma)     nível de segurança desejado
//   3. proteger     (várias)  o que quer proteger
//   4. dispositivos (várias)  onde vai usar
//   5. origem       (uma)     como conheceu
//
// A recomendação é calculada AQUI no servidor (o front só mostra), usando
// os recursos reais de cada plano (config/planos.ts).
// ============================================================
import { ApiError } from '../utils/ApiError.js';

export const OPCOES = {
  usos: ['pessoal', 'profissional', 'empresarial', 'privacidade', 'familia', 'heranca', 'parental', 'academica', 'idosos', 'outro'],
  nivel: ['basico', 'avancado', 'maximo', 'personalizado'],
  proteger: ['senhas', 'bancos', 'redes', 'profissionais', 'documentos', 'outro'],
  dispositivos: ['celular', 'notebook', 'desktop', 'tablet', 'multiplos'],
  origem: ['redes', 'indicacao', 'escola', 'trabalho', 'evento', 'outro'],
} as const;

export interface RespostasOnboarding {
  usos: string[];
  nivel: string | null;
  proteger: string[];
  dispositivos: string[];
  origem: string | null;
  outros: { usos?: string; proteger?: string; origem?: string };
  pulou: boolean;
}

export type RecursoSugerido = 'heranca' | 'killSwitch' | 'dispositivoFisico' | 'alertasAcesso' | 'armazenamento' | 'cofre';

export interface Recomendacao {
  plano: 'free' | 'pro';
  titulo: string;
  resumo: string;
  motivos: Array<{ recurso: RecursoSugerido; texto: string }>;
  dispositivoFisico: boolean;
}

const lista = (v: unknown, permitidos: readonly string[]): string[] =>
  Array.isArray(v) ? [...new Set(v.map(String).filter((x) => permitidos.includes(x)))] : [];
const uma = (v: unknown, permitidos: readonly string[]): string | null =>
  typeof v === 'string' && permitidos.includes(v) ? v : null;
const texto = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 200) : '');

/** Limpa e valida o que veio do front (só aceita as opções conhecidas) */
export function validarRespostas(body: any): RespostasOnboarding {
  const r: RespostasOnboarding = {
    usos: lista(body?.usos, OPCOES.usos),
    nivel: uma(body?.nivel, OPCOES.nivel),
    proteger: lista(body?.proteger, OPCOES.proteger),
    dispositivos: lista(body?.dispositivos, OPCOES.dispositivos),
    origem: uma(body?.origem, OPCOES.origem),
    outros: {
      usos: texto(body?.outros?.usos) || undefined,
      proteger: texto(body?.outros?.proteger) || undefined,
      origem: texto(body?.outros?.origem) || undefined,
    },
    pulou: body?.pulou === true,
  };
  const respondeuAlgo = r.usos.length || r.nivel || r.proteger.length || r.dispositivos.length || r.origem;
  if (!respondeuAlgo && !r.pulou) throw new ApiError(400, 'Responda pelo menos uma pergunta ou toque em "Pular".');
  return r;
}

/** Monta a recomendação a partir das respostas */
export function recomendar(r: RespostasOnboarding): Recomendacao {
  const motivos: Recomendacao['motivos'] = [];
  const tem = (arr: string[], ...v: string[]) => v.some((x) => arr.includes(x));

  if (tem(r.usos, 'heranca', 'familia', 'idosos', 'parental')) {
    motivos.push({
      recurso: 'heranca',
      texto: 'Herança digital: seu cofre chega a quem você escolher, com um kit que só essa pessoa consegue usar.',
    });
  }
  if (r.nivel === 'maximo' || r.nivel === 'avancado' || tem(r.usos, 'privacidade', 'empresarial')) {
    motivos.push({
      recurso: 'dispositivoFisico',
      texto: 'Chave física Krypta: a chave do cofre fica num dispositivo, fora do celular e do computador.',
    });
    motivos.push({
      recurso: 'killSwitch',
      texto: 'Kill Switch: perdeu o dispositivo? Bloqueie na hora e recupere o cofre num novo.',
    });
  }
  if (tem(r.proteger, 'bancos', 'documentos', 'profissionais') || tem(r.usos, 'profissional', 'empresarial')) {
    motivos.push({
      recurso: 'alertasAcesso',
      texto: 'Alertas de acesso: veja cada login e tentativa estranha no seu cofre.',
    });
  }
  if (tem(r.dispositivos, 'multiplos') || r.dispositivos.length >= 3 || r.proteger.length >= 4) {
    motivos.push({
      recurso: 'armazenamento',
      texto: 'Mais espaço (1 MB): cabe muito mais senhas e anotações no cofre.',
    });
  }

  if (motivos.length === 0) {
    return {
      plano: 'free',
      titulo: 'O Krypta Free resolve para você',
      resumo: 'Para guardar suas senhas do dia a dia com segurança, o plano gratuito já atende. Dá para fazer upgrade quando quiser.',
      motivos: [
        { recurso: 'cofre', texto: 'Cofre zero-knowledge: nem o Krypta consegue ver suas senhas.' },
        { recurso: 'cofre', texto: 'Chave de contingência (CCP) para recuperar o cofre se perder o aparelho.' },
      ],
      dispositivoFisico: false,
    };
  }

  // Sem repetir o mesmo recurso
  const vistos = new Set<string>();
  const unicos = motivos.filter((m) => (vistos.has(m.recurso) ? false : (vistos.add(m.recurso), true)));
  return {
    plano: 'pro',
    titulo: 'Recomendamos o Krypta Pro',
    resumo: 'Pelo que você contou, estes recursos do Pro fazem diferença no seu caso:',
    motivos: unicos,
    dispositivoFisico: unicos.some((m) => m.recurso === 'dispositivoFisico'),
  };
}
