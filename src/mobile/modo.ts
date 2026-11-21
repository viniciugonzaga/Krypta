// src/mobile/modo.ts
// ============================================================
// MODO MOBILE × MODO WEB
//
// O Krypta troca sozinho para o MODO MOBILE quando:
//   • foi aberto pelo app instalado (PWA, ícone na tela inicial), ou
//   • está num celular, ou
//   • a janela é estreita (até 768 px), ex.: navegador do computador espremido.
// No modo Mobile aparecem as telas do app (Início, Cofre, +, Ajustes, Perfil),
// sem páginas de divulgação. O app Windows (Tauri) fica no modo Web.
//
// Em Ajustes a pessoa pode fixar "Mobile" ou "Web" (vale para este aparelho).
// O servidor também fica sabendo de onde vem cada requisição: o front manda o
// cabeçalho X-Krypta-Cliente (web | mobile | pwa | desktop).
// ============================================================
import { IS_DESKTOP } from '../config/desktop';

export type PreferenciaModo = 'auto' | 'mobile' | 'web';
export type Modo = 'mobile' | 'web';
export type Cliente = 'web' | 'mobile' | 'pwa' | 'desktop';

const CHAVE = 'krypta:modo';
export const LARGURA_MOBILE = 768;
export const EVENTO_MODO = 'krypta:modo-mudou';

export function lerPreferencia(): PreferenciaModo {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === 'mobile' || v === 'web' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function salvarPreferencia(p: PreferenciaModo): void {
  try {
    if (p === 'auto') localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, p);
  } catch {
    /* navegador sem armazenamento: vale só nesta aba */
  }
  window.dispatchEvent(new Event(EVENTO_MODO));
}

/** Aberto como app instalado (PWA)? */
export function abertoComoPwa(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

/** Celular ou tablet (pelo navegador e pelo toque) */
export function aparelhoMovel(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const uaMovel = /android|iphone|ipad|ipod|mobile|windows phone/.test(ua);
  const ipadModerno = ua.includes('macintosh') && navigator.maxTouchPoints > 1;
  return uaMovel || ipadModerno;
}

export function telaPequena(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.(`(max-width: ${LARGURA_MOBILE}px)`).matches ?? window.innerWidth <= LARGURA_MOBILE;
}

/** O modo que vale agora */
export function calcularModo(pref: PreferenciaModo = lerPreferencia()): Modo {
  if (pref !== 'auto') return pref;
  if (IS_DESKTOP) return 'web';
  return abertoComoPwa() || aparelhoMovel() || telaPequena() ? 'mobile' : 'web';
}

/** Por que o modo automático escolheu o que escolheu (aparece em Ajustes) */
export function motivoDoModo(): string {
  if (IS_DESKTOP) return 'app para Windows';
  if (abertoComoPwa()) return 'aberto pelo app instalado';
  if (aparelhoMovel()) return 'celular ou tablet';
  if (telaPequena()) return 'tela pequena';
  return 'computador';
}

/** O que vai no cabeçalho X-Krypta-Cliente de cada requisição */
export function clienteAtual(): Cliente {
  if (IS_DESKTOP) return 'desktop';
  if (abertoComoPwa()) return 'pwa';
  return calcularModo() === 'mobile' ? 'mobile' : 'web';
}
