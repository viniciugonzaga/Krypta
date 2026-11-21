// src/config/pwa.ts
// ============================================================
// APP DE CELULAR (PWA)
//
// O Krypta vira um app instalável pelo próprio navegador (sem loja):
//   • Android (Chrome, Edge, Samsung): botão "Instalar" abre a janela do sistema.
//   • iPhone (Safari): a Apple não deixa abrir essa janela por código, então a
//     página mostra o caminho: Compartilhar → "Adicionar à Tela de Início".
//   • Computador (Chrome/Edge): também instala, útil em Mac e Linux.
// É o mesmo site, com a mesma conta, API e banco.
// Precisa de HTTPS (ou localhost) para o navegador oferecer a instalação.
// ============================================================
import { IS_DESKTOP, KRYPTA_VERSION } from './desktop';

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let eventoGuardado: EventoInstalacao | null = null;
let instalado = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

/** Está aberto como app instalado (tela cheia, sem barra do navegador)? */
export function rodandoComoApp(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches;
}

/** O navegador já ofereceu a instalação (Android/Chrome/Edge)? */
export const podeInstalar = () => !!eventoGuardado;
export const foiInstalado = () => instalado || rodandoComoApp();

/** Avisa a tela quando muda (apareceu a opção de instalar ou terminou a instalação) */
export function aoMudarPwa(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Abre a janela de instalação do sistema. true = o usuário aceitou */
export async function instalarPwa(): Promise<boolean> {
  if (!eventoGuardado) return false;
  const evento = eventoGuardado;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  eventoGuardado = null;
  if (outcome === 'accepted') instalado = true;
  avisar();
  return outcome === 'accepted';
}

/** Chamado uma vez no main.tsx */
export function iniciarPwa(): void {
  if (typeof window === 'undefined' || IS_DESKTOP) return;

  // O navegador dispara isso cedo, antes de a página Aplicações abrir: guardamos para depois
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoGuardado = e as EventoInstalacao;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    instalado = true;
    eventoGuardado = null;
    avisar();
  });

  // Service worker só no build de produção (no "npm run dev" ele atrapalharia o recarregamento)
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(KRYPTA_VERSION)}`).catch((err) => {
        console.warn('Service worker não registrado:', err);
      });
    });
  }
}
