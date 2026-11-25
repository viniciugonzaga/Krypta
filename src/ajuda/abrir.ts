// src/ajuda/abrir.ts
// Abre o Cody de qualquer tela (cartões, dicas, botões), opcionalmente já com uma pergunta.
export const EVENTO_CODY = 'krypta:cody';

export function abrirCody(pergunta?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_CODY, { detail: pergunta ?? '' }));
}
