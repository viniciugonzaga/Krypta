// src/ajuda/motor.ts
// ============================================================
// CODY — o "cérebro" da conversa
//
// Sem IA externa: nada do que a pessoa escreve sai do aparelho.
//   1. normaliza (minúsculas, sem acento, gírias e abreviações)
//   2. se o Cody tinha feito uma pergunta, tenta entender a resposta
//      ("sim", "não", "o celular"...) antes de qualquer outra coisa
//   3. percebe o tom (irritado, com pressa) e responde com empatia
//   4. pontua os assuntos: frase exata > palavra > palavra parecida
//      (tolera erros de digitação), com bônus para a página atual
//   5. entende duas perguntas na mesma mensagem ("x e também y")
//   6. lembra do assunto anterior ("e se eu esquecer?", "outra!",
//      "não entendi") e não repete a mesma frase toda hora
//   7. sem certeza → "você quis dizer…?" com opções clicáveis
// ============================================================
import { ASSUNTOS, porId, proximoPasso, sugestoesDaPagina } from './base';
import type { PerfilAjuda } from './contexto';
import type { Assunto, Ctx, Humor, Opcao, Resposta } from './tipos';

export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// gírias, abreviações e erros comuns → forma que a base conhece
const SINONIMOS: [RegExp, string][] = [
  [/\bkit (do|de) herdeiro\b/g, 'codigo de heranca'],
  [/\b(contigencia|contingensia|contijencia)\b/g, 'contingencia'],
  [/\b(senha mestra|senha do app|senha do aplicativo)\b/g, 'pin'],
  [/\bbloqueio\b/g, 'trava'],
  [/\b(cel|smartphone|telefone|fone)\b/g, 'celular'],
  [/\b(note|notebook|laptop)\b/g, 'computador'],
  [/\b(vc|voce|vcs|voces|ce|tu)\b/g, 'voce'],
  [/\b(oq|o q|oque)\b/g, 'o que'],
  [/\bq\b/g, 'que'],
  [/\b(pq|porque|por que|pq q)\b/g, 'por que'],
  [/\b(tbm|tb|tmb)\b/g, 'tambem'],
  [/\b(n|ñ|nn|naum|nao)\b/g, 'nao'],
  [/\b(ss|sim sim|siim|simm)\b/g, 'sim'],
  [/\b(digitais|leitor de digital)\b/g, 'digital'],
  [/\b(sumiu|quebrou|estragou|caiu na agua)\b/g, 'perdi'],
  [/\b(assinatura|assinar|premium)\b/g, 'pro'],
  [/\b(gratuito|de graca|gratis)\b/g, 'gratis'],
  [/\b(senhas|logins|credenciais)\b/g, 'senha'],
  [/\b(ta|tah|esta|tá)\b/g, 'esta'],
  [/\b(msm|mesmo)\b/g, 'mesmo'],
  [/\b(obg|obgd|obrigadao)\b/g, 'obrigado'],
  [/\b(pfv|pfvr|plmds|pls)\b/g, 'por favor'],
  [/\b(cofri|cofrr)\b/g, 'cofre'],
  [/\b(kody|kodi|codi|kryp)\b/g, 'cody'],
];

function preparar(t: string): string {
  let s = ` ${normalizar(t)} `;
  for (const [re, por] of SINONIMOS) s = s.replace(re, por);
  return s.replace(/\s+/g, ' ').trim();
}

/** distância de edição (Levenshtein) com corte */
function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < menor) menor = cur[j];
    }
    if (menor > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** 1 = igual ou começa igual, 0.6 = parecida, 0 = não */
function palavraParecida(alvo: string, palavras: string[]): number {
  let melhor = 0;
  for (const p of palavras) {
    if (p === alvo || (alvo.length >= 4 && p.startsWith(alvo))) return 1;
    // plural / feminino simples
    if (alvo.length >= 4 && (p === `${alvo}s` || p === alvo.replace(/o$/, 'a'))) return 1;
    if (alvo.length >= 5 && p.length >= 4) {
      const max = alvo.length >= 8 ? 2 : 1;
      if (distancia(p, alvo, max) <= max) melhor = Math.max(melhor, 0.6);
    }
  }
  return melhor;
}

function pontuar(a: Assunto, texto: string, palavras: string[], pagina: string): number {
  let total = 0;
  for (const [termo, peso] of a.termos) {
    if (termo.includes(' ')) {
      if (` ${texto} `.includes(` ${termo} `) || texto.includes(termo)) total += peso * 1.5;
      else {
        const partes = termo.split(' ').filter((x) => x.length > 2);
        if (partes.length) {
          const f = partes.reduce((s, x) => s + palavraParecida(x, palavras), 0) / partes.length;
          if (f >= 0.8) total += peso * f;
        }
      }
    } else {
      const f = palavraParecida(termo, palavras);
      if (f) total += peso * f;
    }
  }
  if (total > 0 && a.paginas?.some((p) => pagina === p || (p !== '/' && pagina.startsWith(p)))) total += 1;
  return total;
}

function classificar(texto: string, pagina: string) {
  const palavras = texto.split(' ').filter(Boolean);
  return ASSUNTOS.map((a) => ({ a, n: pontuar(a, texto, palavras, pagina) }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n);
}

const FRUSTRADO = /\b(nao funciona|nao consigo|nao da|droga|merda|porra|aff|afe|raiva|socorro|urgente|pelo amor|ja tentei|nunca funciona|que saco|ridiculo|odeio|pqp|cansei)\b/;
const CONTINUACAO = /^(e (se|quando|como|onde|o que|no|na|pra|para|depois)|mas|e ai|e depois|como assim|explica melhor|nao entendi|nao entendo|hein|que)\b/;
const DE_NOVO = /^(outra|outro|mais uma|mais um|de novo|denovo|outra vez|mais)\b/;

// ------------------------------------------------------------
// conversa (memória curta)
// ------------------------------------------------------------
export interface Resultado extends Resposta {
  assunto: string | null;
  confianca: 'alta' | 'baixa' | 'nenhuma';
  baloes: string[];
}

export class Conversa {
  turno = 0;
  anterior: string | null = null;
  pendentes: Opcao[] | null = null;
  semEntender = 0;

  constructor(estado?: { turno?: number; anterior?: string | null }) {
    this.turno = estado?.turno ?? 0;
    this.anterior = estado?.anterior ?? null;
  }

  estado() {
    return { turno: this.turno, anterior: this.anterior };
  }

  /** última variação usada de cada lista de frases (para não repetir em seguida) */
  private usadas = new Map<string, number>();

  private ctx(p: PerfilAjuda, extra: Partial<Ctx> = {}): Ctx {
    const usadas = this.usadas;
    const um = <T,>(lista: readonly T[]): T => {
      if (lista.length <= 1) return lista[0];
      const chave = String(lista[0]).slice(0, 60);
      const ultima = usadas.get(chave);
      let i = Math.floor(Math.random() * lista.length);
      if (i === ultima) i = (i + 1 + Math.floor(Math.random() * (lista.length - 1))) % lista.length;
      usadas.set(chave, i);
      return lista[i];
    };
    return {
      turno: this.turno,
      repetido: false,
      frustrado: false,
      hora: new Date().getHours(),
      // usa o nome na 1ª resposta e de vez em quando, como uma pessoa faria
      nome: p.nome && (this.turno <= 1 || this.turno % 4 === 0) ? p.nome : '',
      um,
      ...extra,
    };
  }

  private fechar(r: Resposta, assunto: string | null, confianca: Resultado['confianca']): Resultado {
    this.pendentes = r.opcoes?.length ? r.opcoes : null;
    if (assunto) this.anterior = assunto;
    const baloes = (Array.isArray(r.texto) ? r.texto : [r.texto]).filter(Boolean);
    return { ...r, assunto, confianca, baloes };
  }

  /** Resposta para uma opção clicada (ou digitada) */
  private usarOpcao(o: Opcao, p: PerfilAjuda, ctx: Ctx): Resultado {
    if (o.resposta) return this.fechar(o.resposta(p, ctx), this.anterior, 'alta');
    return this.fechar({ texto: ctx.um(['Bora! Te levando lá. 🚀', 'Indo para lá! 🚀', 'Partiu! 🚀']), acoes: o.para ? [{ rotulo: o.rotulo, para: o.para }] : undefined, irPara: o.para, humor: 'feliz' }, this.anterior, 'alta');
  }

  private casarOpcao(texto: string, original: string): Opcao | null {
    if (!this.pendentes) return null;
    const norm = normalizar(original);
    const exata = this.pendentes.find((o) => normalizar(o.rotulo) === norm);
    if (exata) return exata;
    const palavras = texto.split(' ');
    let melhor: { o: Opcao; n: number } | null = null;
    for (const o of this.pendentes) {
      let n = 0;
      for (const t of o.termos ?? []) {
        if (t.includes(' ')) {
          if (texto.includes(t)) n = Math.max(n, 3);
        } else if (t.length <= 2) {
          // "s", "n", "ok": só se for a mensagem toda ou a primeira palavra
          if (palavras[0] === t && palavras.length <= 3) n = Math.max(n, 2);
        } else if (palavras.includes(t)) n = Math.max(n, palavras[0] === t ? 2.5 : 2);
      }
      if (n > 0 && (!melhor || n > melhor.n)) melhor = { o, n };
    }
    // mensagem longa que fala de outra coisa: deixa a conversa seguir
    if (melhor && (palavras.length <= 6 || melhor.n >= 3)) return melhor.o;
    return null;
  }

  responder(pergunta: string, p: PerfilAjuda): Resultado {
    this.turno++;
    const texto = preparar(pergunta);
    const frustrado = FRUSTRADO.test(texto) || /!{2,}/.test(pergunta) || (pergunta.length > 10 && pergunta === pergunta.toUpperCase() && /[A-Z]/.test(pergunta));
    const base = this.ctx(p, { frustrado });

    if (!texto) return this.fechar({ texto: 'Pode perguntar do seu jeito! Por exemplo: "como guardo uma senha?" 🙂', humor: 'oi' }, null, 'nenhuma');

    // 1. resposta a uma pergunta do Cody
    const op = this.casarOpcao(texto, pergunta);
    if (op) return this.usarOpcao(op, p, base);

    // 2. título exato (veio de uma sugestão)
    const exato = ASSUNTOS.find((a) => normalizar(a.titulo) === normalizar(pergunta));
    if (exato) return this.assunto(exato, p, base);

    // 3. "outra!", "mais uma" → repete o último assunto com outra variação
    if (DE_NOVO.test(texto) && this.anterior && ['piada', 'dica', 'gerar'].includes(this.anterior)) {
      return this.assunto(porId(this.anterior), p, { ...base, repetido: false });
    }

    // 4. continuação do assunto anterior
    const notas = classificar(texto, p.pagina);
    if (this.anterior && CONTINUACAO.test(texto)) {
      const ant = porId(this.anterior);
      if (/nao entend|explica melhor|como assim|hein/.test(texto) && ant) {
        const r = ant.resposta(p, base);
        const b = Array.isArray(r.texto) ? r.texto : [r.texto];
        return this.fechar(
          { texto: [base.um(['Vou explicar de outro jeito, mais direto:', 'Desculpa, vou simplificar:', 'Resumindo bem curtinho:']), b[b.length > 1 ? 1 : 0].replace(/\*\*/g, '**')], acoes: r.acoes, sugestoes: ['Falar com uma pessoa'], humor: 'pensando' },
          ant.id,
          'alta',
        );
      }
      if (/esquec/.test(texto) && ['pin', 'biometria', 'remoto', 'trancar'].includes(this.anterior)) return this.assunto(porId('esqueci-pin'), p, base);
      if (/(perd|esquec)/.test(texto) && this.anterior === 'esqueci-pin') return this.assunto(porId('perdi-ccp'), p, base);
      if (/(perd|esquec)/.test(texto) && ['ccp', 'pontos', 'checkup'].includes(this.anterior)) return this.assunto(porId('perdi-ccp'), p, base);
      if (/(roub|perd)/.test(texto) && ['fisico', 'parear', 'kill'].includes(this.anterior)) return this.assunto(porId('kill'), p, base);
      if (/(quanto|preco|custa)/.test(texto)) return this.assunto(porId('planos'), p, base);
      // continuação que não reconheci: ofereço os caminhos do assunto anterior
      if (!notas[0] || notas[0].n < 4) {
        const sug = ant?.resposta(p, base).sugestoes ?? [];
        if (sug.length) {
          return this.fechar(
            {
              texto: base.um([`Sobre **${ant.titulo.toLowerCase().replace(/\?$/, '')}**, você quer saber:`, 'Continuando o assunto, seria isto?']),
              opcoes: sug.map((t) => ({ rotulo: t, resposta: (pp: PerfilAjuda, cc: Ctx) => (ASSUNTOS.find((x) => x.titulo === t) ?? porId('proximo')).resposta(pp, cc) })),
              humor: 'duvida',
            },
            ant.id,
            'baixa',
          );
        }
      }
    }

    // 5. duas perguntas na mesma mensagem
    const partes = texto.split(/\b(?:e tambem|tambem|alem disso|e outra coisa|outra coisa)\b|\s+e\s+(?=(?:como|o que|onde|qual|quanto|posso|da pra|tem)\b)/).map((s) => s?.trim()).filter((s) => s && s.split(' ').length >= 2);
    if (partes.length >= 2) {
      const achados = partes
        .map((pt) => classificar(pt, p.pagina)[0])
        .filter((x): x is { a: Assunto; n: number } => !!x && x.n >= 3)
        .filter((x, i, arr) => arr.findIndex((y) => y.a.id === x.a.id) === i)
        .slice(0, 2);
      if (achados.length === 2) {
        const [r1, r2] = achados.map((x) => x.a.resposta(p, base));
        const b1 = Array.isArray(r1.texto) ? r1.texto : [r1.texto];
        const b2 = Array.isArray(r2.texto) ? r2.texto : [r2.texto];
        return this.fechar(
          {
            texto: [`Você perguntou duas coisas, vamos por partes. 😉`, `**1) ${achados[0].a.titulo}**\n${b1.join('\n\n')}`, `**2) ${achados[1].a.titulo}**\n${b2.join('\n\n')}`],
            acoes: [...(r1.acoes ?? []), ...(r2.acoes ?? [])].slice(0, 3),
            humor: 'ok',
          },
          achados[1].a.id,
          'alta',
        );
      }
    }

    const [primeiro, segundo] = notas;
    if (!primeiro || primeiro.n < 2.5) return this.naoEntendi(p, base, primeiro?.a, segundo?.a);

    this.semEntender = 0;
    const resultado = this.assunto(primeiro.a, p, { ...base, repetido: this.anterior === primeiro.a.id && !['piada', 'dica', 'gerar'].includes(primeiro.a.id) });
    // dois assuntos quase empatados → oferece o outro
    if (segundo && segundo.n >= primeiro.n * 0.8 && segundo.a.id !== primeiro.a.id && !resultado.opcoes) {
      resultado.sugestoes = Array.from(new Set([segundo.a.titulo, ...(resultado.sugestoes ?? [])])).slice(0, 3);
    }
    if (primeiro.n < 4) resultado.confianca = 'baixa';
    return resultado;
  }

  private assunto(a: Assunto, p: PerfilAjuda, ctx: Ctx): Resultado {
    this.semEntender = 0;
    const r = a.resposta(p, ctx);
    let texto = Array.isArray(r.texto) ? [...r.texto] : [r.texto];
    if (ctx.repetido) texto = [ctx.um(['Vou reforçar, porque é importante:', 'De novo, com calma:', 'Vamos lá mais uma vez:']), ...texto];
    else if (ctx.frustrado && !['grosseria', 'nao-abre', 'esqueci-pin', 'kill', 'lento'].includes(a.id)) texto = [ctx.um(['Entendo, isso é chato mesmo. Vamos resolver! 💪', 'Calma, tô aqui pra ajudar. 🤝']), ...texto];
    return this.fechar({ ...r, texto, sugestoes: ctx.repetido ? Array.from(new Set([...(r.sugestoes ?? []), 'Falar com uma pessoa'])).slice(0, 3) : r.sugestoes }, a.id, 'alta');
  }

  private naoEntendi(p: PerfilAjuda, ctx: Ctx, a1?: Assunto, a2?: Assunto): Resultado {
    this.semEntender++;
    if (this.semEntender >= 3) {
      return this.fechar(
        { texto: ['Acho que não estou conseguindo te ajudar nisso, desculpa. 😕', 'Uma pessoa da nossa equipe pode responder melhor. Quer falar com ela?'], opcoes: [{ rotulo: 'Falar com a equipe', termos: ['sim', 'quero', 'pode'], para: '/contact' }], sugestoes: ['O que você sabe fazer?'], humor: 'triste' },
        null,
        'nenhuma',
      );
    }
    const palpites = [a1, a2].filter((x): x is Assunto => !!x);
    if (palpites.length) {
      return this.fechar(
        {
          texto: ctx.um(['Hmm, não tenho certeza se entendi. 🤔 Você quis dizer:', 'Acho que entendi mais ou menos. Seria sobre:', 'Deixa eu ver se entendi… é sobre:']),
          opcoes: [...palpites.map((x) => ({ rotulo: x.titulo, resposta: (pp: PerfilAjuda, cc: Ctx) => x.resposta(pp, cc) })), { rotulo: 'Nenhum desses', termos: ['nenhum', 'nao', 'outra coisa'], resposta: (_pp: PerfilAjuda, cc: Ctx) => ({ texto: cc.um(['Sem problema! Me conta com outras palavras, ou escolhe um destes:', 'Ok! Tenta descrever de outro jeito, ou escolhe aqui:']), sugestoes: sugestoesDaPagina(p), humor: 'duvida' as Humor }) }],
          humor: 'duvida',
        },
        null,
        'baixa',
      );
    }
    return this.fechar(
      {
        texto: [ctx.um(['Essa eu não entendi. 🤔', 'Hmm, essa passou batido por mim. 🤔', 'Não consegui entender essa.']), 'Tenta com outras palavras, tipo "esqueci o PIN" ou "como guardo uma senha". Ou escolha uma opção:'],
        sugestoes: ['O que você sabe fazer?', ...sugestoesDaPagina(p).slice(0, 2)],
        humor: 'duvida',
      },
      null,
      'nenhuma',
    );
  }

  /** Mensagem de boas-vindas, olhando a situação da pessoa */
  saudacao(p: PerfilAjuda): Resultado {
    const h = new Date().getHours();
    const periodo = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const ola = `${periodo}${p.nome ? `, ${p.nome}` : ''}! Eu sou o **Cody**. 🤖`;
    const ctx = this.ctx(p, { nome: '' });
    if (!p.logado) return this.fechar({ texto: [ola, 'Posso te mostrar como o Krypta protege suas senhas, comparar os planos ou tirar qualquer dúvida.'], sugestoes: sugestoesDaPagina(p), humor: 'oi' }, null, 'alta');

    const alerta: Partial<Record<PerfilAjuda['situacao'], string>> = {
      'sem-cofre': 'Vi que você ainda **não ativou o cofre**. Quer que eu te guie? Leva uns 3 minutos.',
      'sem-trava': 'Vi que o cofre deste aparelho ainda **não tem trava** (senha ou PIN). Isso é importante, vamos criar?',
      bloqueado: 'Vi que o **Kill Switch** foi acionado na sua conta. Posso te ajudar a vincular um dispositivo novo.',
      recuperacao: 'Vi que há uma **recuperação em andamento**. Quer terminar agora?',
    };
    const aviso = alerta[p.situacao];
    if (aviso) {
      const passo = proximoPasso(p, ctx);
      const direto = passo.opcoes?.[0]?.para ?? passo.acoes?.[0]?.para;
      const guia: Opcao = direto ? { rotulo: 'Sim, me leva lá', termos: ['sim', 'quero', 'bora', 'vamos', 'pode', 'ok'], para: direto } : { rotulo: 'Sim, me guia', termos: ['sim', 'quero', 'bora', 'vamos', 'pode', 'ok'], resposta: () => passo };
      return this.fechar({ texto: [ola, aviso], opcoes: [guia, { rotulo: 'Tenho outra dúvida', termos: ['outra', 'duvida', 'nao'], resposta: (pp) => ({ texto: 'Claro! Pode perguntar.', sugestoes: sugestoesDaPagina(pp), humor: 'oi' }) }], humor: 'alerta' }, 'proximo', 'alta');
    }
    const extra =
      p.situacao === 'pronto' && (p.totalChaves ?? 0) === 0
        ? 'Seu cofre está pronto e vazio. Quer guardar a primeira senha?'
        : p.situacao === 'pronto'
          ? `Seu cofre está aberto${p.totalChaves ? ` com **${p.totalChaves}** chave${p.totalChaves === 1 ? '' : 's'}` : ''}. ${!p.biometria ? 'Dica rápida: ligar a biometria deixa tudo mais prático.' : 'Em que posso ajudar?'}`
          : p.situacao === 'trancado'
            ? 'Seu cofre está trancado neste aparelho, tudo protegido. 🔒 Em que posso ajudar?'
            : 'Em que posso ajudar?';
    return this.fechar({ texto: [ola, extra], sugestoes: sugestoesDaPagina(p), humor: 'oi' }, null, 'alta');
  }
}
