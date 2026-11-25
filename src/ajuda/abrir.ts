// src/ajuda/abrir.ts
// Abre o Kody de qualquer tela (cartões, dicas, botões), opcionalmente já com uma pergunta.
export const EVENTO_KODY = 'krypta:kody';

export function abrirKody(pergunta?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_KODY, { detail: pergunta ?? '' }));
}
