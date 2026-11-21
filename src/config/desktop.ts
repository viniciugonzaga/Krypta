// src/config/desktop.ts
// ============================================================
// SITE × APP DESKTOP (Tauri)
//
// O app desktop roda EXATAMENTE este front, dentro de uma janela do
// Windows. Só três coisas mudam quando ele está no app:
//   1. links externos (redes sociais, e-mail) abrem no navegador do usuário;
//   2. o link do kit de herança usa o endereço público do site (VITE_SITE_URL);
//   3. a página "Baixar app" vira "Você já está no app".
// API, banco, conta, plano e cofre são os mesmos do site.
// ============================================================

declare global {
  /** Versão do package.json (injetada pelo Vite) */
  const __KRYPTA_VERSION__: string;
  interface Window {
    __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
  }
}

/** true dentro do app desktop (Tauri), false no navegador */
export const IS_DESKTOP: boolean = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

/** Endereço público do site, sem barra no fim. null = desconhecido (app desktop sem VITE_SITE_URL) */
export const SITE_URL: string | null = (() => {
  const env = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/+$/, '');
  return IS_DESKTOP || typeof window === 'undefined' ? null : window.location.origin;
})();

/** Versão do Krypta (site e app desktop usam a mesma) */
export const KRYPTA_VERSION: string = typeof __KRYPTA_VERSION__ === 'string' ? __KRYPTA_VERSION__ : '1.0.0';

// ============================================================
// DOWNLOAD DO APP (página "Aplicações")
//
// Motor: GitHub Releases. A cada versão, o GitHub Actions gera o instalador
// e publica também uma cópia com nome FIXO (Krypta-Setup.exe). O endereço
//   https://github.com/<repo>/releases/latest/download/Krypta-Setup.exe
// sempre baixa a versão mais nova, na hora, sem abrir página nenhuma.
// Para servir o .exe pela Hostinger, defina VITE_DESKTOP_DOWNLOAD_URL
// (ex.: /downloads/Krypta-Setup.exe).
// ============================================================
export const GITHUB_REPO = 'viniciugonzaga/Krypta';
export const NOME_INSTALADOR = 'Krypta-Setup.exe';

/** Link direto do instalador mais novo */
export const DESKTOP_DOWNLOAD_URL: string =
  (import.meta.env.VITE_DESKTOP_DOWNLOAD_URL as string | undefined)?.trim() ||
  `https://github.com/${GITHUB_REPO}/releases/latest/download/${NOME_INSTALADOR}`;

/** O endereço foi definido à mão no .env (ex.: Hostinger)? */
const DOWNLOAD_PERSONALIZADO = !!(import.meta.env.VITE_DESKTOP_DOWNLOAD_URL as string | undefined)?.trim();

export interface VersaoPublicada {
  versao: string;
  publicadaEm: string;
  tamanhoMB: number | null;
  url: string;
}

/**
 * Pergunta ao GitHub qual é a última versão publicada (número, data e tamanho).
 * null = ainda não há nenhuma versão publicada.
 * undefined = não deu para perguntar agora (sem internet, limite do GitHub):
 *             o botão continua funcionando com o link direto.
 */
export async function buscarUltimaVersao(): Promise<VersaoPublicada | null | undefined> {
  if (DOWNLOAD_PERSONALIZADO) return undefined;
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const rel = (await r.json()) as {
      tag_name: string;
      published_at: string;
      assets: Array<{ name: string; size: number; browser_download_url: string }>;
    };
    const asset =
      rel.assets.find((a) => a.name === NOME_INSTALADOR) ?? rel.assets.find((a) => /setup\.exe$/i.test(a.name));
    if (!asset) return null;
    return {
      versao: rel.tag_name.replace(/^v/, ''),
      publicadaEm: rel.published_at,
      tamanhoMB: Math.round((asset.size / 1024 / 1024) * 10) / 10,
      url: asset.name === NOME_INSTALADOR ? DESKTOP_DOWNLOAD_URL : asset.browser_download_url,
    };
  } catch {
    return undefined;
  }
}

export type Sistema = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'outro';

/** Em qual sistema o visitante está (para destacar o download certo) */
export function detectarSistema(): Sistema {
  if (typeof navigator === 'undefined') return 'outro';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && navigator.maxTouchPoints > 1)) return 'ios';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac os')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'outro';
}

/** Abre um endereço fora do app (no desktop: navegador padrão / app de e-mail) */
export async function abrirExterno(url: string): Promise<void> {
  if (IS_DESKTOP && window.__TAURI_INTERNALS__) {
    try {
      await window.__TAURI_INTERNALS__.invoke('plugin:opener|open_url', { url });
      return;
    } catch (err) {
      console.error('Não foi possível abrir o link externo:', err);
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * No app desktop, todo clique em link externo (http de outro endereço,
 * mailto:, tel: ou target="_blank") abre fora da janela do Krypta.
 * Links internos (/profile, /device...) continuam dentro do app.
 */
export function instalarLinksExternos(): void {
  if (!IS_DESKTOP) return;
  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (!href || href === '#' || href.startsWith('#')) {
        if (a.target === '_blank') e.preventDefault(); // link vazio de rede social: não abre nada
        return;
      }
      let destino: URL;
      try {
        destino = new URL(href, window.location.href);
      } catch {
        return;
      }
      const externo =
        ['mailto:', 'tel:'].includes(destino.protocol) ||
        destino.origin !== window.location.origin ||
        a.target === '_blank';
      if (!externo) return;
      e.preventDefault();
      abrirExterno(destino.href);
    },
    true
  );
}
