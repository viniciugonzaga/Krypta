// src/ajuda/motor.ts
// ============================================================
// KRYP — o "cérebro": entende a pergunta e escolhe a resposta
//
// Sem IA externa (nada sai do aparelho). Funciona assim:
//   1. normaliza o texto (minúsculas, sem acento, sem pontuação)
//   2. troca sinônimos e erros comuns ("senha do cofre" ≈ "pin")
//   3. pontua cada assunto: frase exata vale mais, palavra parecida
//      (até 1–2 letras erradas) vale menos, página atual dá bônus
//   4. considera o ASSUNTO ANTERIOR (ex.: "e se eu esquecer?")
//   5. sem confiança → pergunta "você quis dizer…?" com opções
// ============================================================
import { ASSUNTOS, proximoPasso, type Assunto, type Resposta } from './base';
import type { PerfilAjuda } from './contexto';

export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// variações → forma que a base conhece
const SINONIMOS: [RegExp, string][] = [
  [/\bkit (do|de) herdeiro\b/g, 'codigo de heranca'],
  [/\bchave de contigencia\b/g, 'chave de contingencia'],
  [/\bcontigencia\b/g, 'contingencia'],
  [/\bsenha mestra\b/g, 'pin'],
  [/\bsenha do app\b/g, 'pin'],
  [/\bbloqueio\b/g, 'trava'],
  [/\b(cel|smartphone|telefone)\b/g, 'celular'],
  [/\b(note|notebook|laptop)\b/g, 'computador'],
  [/\b(vc|voce|vcs|voces)\b/g, 'voce'],
  [/\b(q|oq|o q)\b/g, 'o que'],
  [/\b(pq|porque|por que)\b/g, 'por que'],
  [/\b(tbm|tb)\b/g, 'tambem'],
  [/\bn\b/g, 'nao'],
  [/\b(digitais|leitor de digital)\b/g, 'digital'],
  [/\b(perdi|sumiu|quebrou|estragou)\b/g, 'perdi'],
  [/\b(assinatura|assinar|premium)\b/g, 'pro'],
  [/\b(gratuito|de graca)\b/g, 'gratis'],
  [/\b(senhas|logins)\b/g, 'senha'],
];

function preparar(t: string): string {
  let s = ` ${normalizar(t)} `;
  for (const [re, por] of SINONIMOS) s = s.replace(re, por);
  return s.replace(/\s+/g, ' ').trim();
}

/** distância de edição (Levenshtein) com corte, para tolerar erros de digitação */
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

function palavraParecida(alvo: string, palavras: string[]): number {
  // 1 = igual / prefixo, 0.6 = parecida, 0 = não
  let melhor = 0;
  for (const p of palavras) {
    if (p === alvo || (alvo.length >= 4 && p.startsWith(alvo))) return 1;
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
      if (texto.includes(termo)) total += peso * 1.5;
      else {
        // frase com palavras parecidas, em qualquer ordem
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

export interface Resultado extends Resposta {
  assunto: string | null;
  confianca: 'alta' | 'baixa' | 'nenhuma';
}

const FOLLOWUP = /^(e (se|quando|como|onde|o que)|mas|e ai|e depois|como assim|explica melhor|nao entendi|e no|e na|e pra|e para)\b/;

export function responder(pergunta: string, perfil: PerfilAjuda, anterior: string | null): Resultado {
  const texto = preparar(pergunta);
  const palavras = texto.split(' ').filter(Boolean);
  if (!palavras.length) return { assunto: null, confianca: 'nenhuma', texto: 'Pode perguntar! Escreva do seu jeito, por exemplo: "como guardo uma senha?"' };

  // título exato (veio de um botão de sugestão)
  const exato = ASSUNTOS.find((a) => normalizar(a.titulo) === normalizar(pergunta));
  if (exato) return { assunto: exato.id, confianca: 'alta', ...exato.resposta(perfil) };

  const notas = ASSUNTOS.map((a) => ({ a, n: pontuar(a, texto, palavras, perfil.pagina) }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n);

  // pergunta de continuação ("e se eu esquecer?", "não entendi")
  if (anterior && FOLLOWUP.test(texto)) {
    const ant = ASSUNTOS.find((a) => a.id === anterior);
    if (/nao entendi|explica melhor|como assim/.test(texto) && ant) {
      const r = ant.resposta(perfil);
      return { assunto: ant.id, confianca: 'alta', texto: `Explicando de outro jeito: ${r.texto.split('\n')[0]}`, acoes: r.acoes, sugestoes: ['Falar com uma pessoa'] };
    }
    if (notas[0] && notas[0].n >= 3) return { assunto: notas[0].a.id, confianca: 'alta', ...notas[0].a.resposta(perfil) };
    if (/esquec/.test(texto) && ['pin', 'biometria', 'remoto'].includes(anterior)) {
      const a = ASSUNTOS.find((x) => x.id === 'esqueci-pin')!;
      return { assunto: a.id, confianca: 'alta', ...a.resposta(perfil) };
    }
    if (/(perd|esquec)/.test(texto) && ['ccp', 'pontos'].includes(anterior)) {
      const a = ASSUNTOS.find((x) => x.id === 'perdi-ccp')!;
      return { assunto: a.id, confianca: 'alta', ...a.resposta(perfil) };
    }
  }

  const [primeiro, segundo] = notas;
  if (!primeiro || primeiro.n < 2.5) {
    // nada claro → próximo passo + opções da página
    return {
      assunto: null,
      confianca: 'nenhuma',
      texto:
        'Não tenho certeza do que você quis dizer. 🤔 ' +
        (primeiro ? `Seria sobre **${primeiro.a.titulo.toLowerCase().replace(/\?$/, '')}**?` : 'Tente com outras palavras, ou escolha uma opção abaixo.'),
      sugestoes: primeiro ? [primeiro.a.titulo, ...(segundo ? [segundo.a.titulo] : []), 'Falar com uma pessoa'] : ['O que eu faço agora?', 'Como funciona o Krypta?', 'Falar com uma pessoa'],
    };
  }

  const r = primeiro.a.resposta(perfil);
  // dois assuntos quase empatados → responde o primeiro e oferece o outro
  const extra = segundo && segundo.n >= primeiro.n * 0.8 && segundo.a.id !== primeiro.a.id ? [segundo.a.titulo] : [];
  const sug = Array.from(new Set([...extra, ...(r.sugestoes ?? [])])).slice(0, 3);
  return { assunto: primeiro.a.id, confianca: primeiro.n >= 4 ? 'alta' : 'baixa', ...r, sugestoes: sug };
}

/** mensagem de boas-vindas personalizada */
export function saudacao(p: PerfilAjuda): Resultado {
  const ola = `Oi${p.nome ? `, ${p.nome}` : ''}! Eu sou o **Kryp**. 🤖`;
  if (!p.logado) return { assunto: 'krypta', confianca: 'alta', texto: `${ola} Posso explicar como o Krypta protege suas senhas ou tirar dúvidas sobre os planos.` };
  if (p.situacao === 'pronto' && (p.totalChaves ?? 0) > 0) {
    return { assunto: null, confianca: 'alta', texto: `${ola} Seu cofre está aberto${p.totalChaves ? ` com **${p.totalChaves}** chave${p.totalChaves === 1 ? '' : 's'}` : ''}. Em que posso ajudar?` };
  }
  const passo = proximoPasso(p);
  return { assunto: 'proximo', confianca: 'alta', texto: `${ola}\n\n${passo.texto}`, acoes: passo.acoes };
}
