// src/services/avisos.ts
// ============================================================
// v1.3.0 — NOTIFICAÇÕES DE VERDADE (app do Windows, site e celular)
//
// Antes, "Notificações no aplicativo" era só um texto: nada avisava.
// Agora, com a conta aberta, o Krypta confere os eventos da conta
// (GET /users/me/audit) a cada 60 s e quando a janela volta ao foco:
//   • app do Windows → notificação do sistema (plugin de notificação do Tauri)
//   • site / celular → Notification do navegador (se a pessoa permitir)
//   • janela em uso  → aviso dentro do app (toast) em vez da do sistema
// Também conta as não lidas (bolinha no sino do modo celular).
// Os eventos já são da própria conta: nada novo sai do servidor.
// ============================================================
import { UserAPI, type EventoConta } from './api';
import { IS_DESKTOP } from '../config/desktop';

const K_VISTO = (id: string) => `@Krypta:avisos:visto:${id}`;
const K_LIDO = (id: string) => `@Krypta:avisos:lido:${id}`;
const K_LIGADO = '@Krypta:avisos:ligado';
const INTERVALO = 60_000;

// eventos que merecem aviso (os outros só aparecem na lista)
const IMPORTANTES = [/LOGIN/, /REMOTE/, /KILL/, /REVOK/, /INHERIT/, /CCP/, /PASSWORD/, /SNAPSHOT_RESTORE/, /PLAN/, /HARDWARE/, /DEVICE/, /ABANDON/, /INATIV/];

export type Toast = { id: string; titulo: string; texto: string; alerta: boolean };
type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();
const ouvintesToast = new Set<(t: Toast) => void>();
let naoLidas = 0;

const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento */
  }
};

function avisar() {
  ouvintes.forEach((f) => f());
}

export const Avisos = {
  ligado(): boolean {
    return ler(K_LIGADO) !== '0';
  },
  naoLidas(): number {
    return naoLidas;
  },
  assinar(f: Ouvinte): () => void {
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  },
  aoToast(f: (t: Toast) => void): () => void {
    ouvintesToast.add(f);
    return () => ouvintesToast.delete(f);
  },
  /** Liga/desliga as notificações do sistema neste aparelho (pede permissão ao ligar) */
  async ligar(v: boolean): Promise<boolean> {
    gravar(K_LIGADO, v ? '1' : '0');
    let ok = true;
    if (v) ok = await pedirPermissao();
    avisar();
    return ok;
  },
  /** Marca tudo como lido (ao abrir a lista de notificações) */
  marcarLidas(contaId: string, eventos?: EventoConta[]) {
    const mais = eventos?.[0]?.timestamp ?? new Date().toISOString();
    gravar(K_LIDO(contaId), mais);
    naoLidas = 0;
    avisar();
  },
  async permissao(): Promise<'concedida' | 'negada' | 'pendente' | 'indisponivel'> {
    if (IS_DESKTOP) {
      try {
        const ok = await window.__TAURI_INTERNALS__!.invoke('plugin:notification|is_permission_granted');
        return ok ? 'concedida' : 'pendente';
      } catch {
        return 'indisponivel';
      }
    }
    if (typeof Notification === 'undefined') return 'indisponivel';
    return Notification.permission === 'granted' ? 'concedida' : Notification.permission === 'denied' ? 'negada' : 'pendente';
  },
  /** Mostra uma notificação de teste */
  async testar() {
    await mostrarSistema('Krypta', 'As notificações estão funcionando neste aparelho. ✅');
  },
};

async function pedirPermissao(): Promise<boolean> {
  if (IS_DESKTOP) {
    try {
      const inv = window.__TAURI_INTERNALS__!.invoke;
      if (await inv('plugin:notification|is_permission_granted')) return true;
      const r = await inv('plugin:notification|request_permission');
      return r === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

async function mostrarSistema(titulo: string, texto: string): Promise<boolean> {
  if (IS_DESKTOP) {
    try {
      await window.__TAURI_INTERNALS__!.invoke('plugin:notification|notify', { options: { title: titulo, body: texto } });
      return true;
    } catch {
      return false;
    }
  }
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    // no celular (PWA) a notificação precisa sair pelo service worker
    const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => undefined);
    if (reg?.showNotification) await reg.showNotification(titulo, { body: texto, icon: '/pwa/icon-192.png', tag: 'krypta' });
    else new Notification(titulo, { body: texto, icon: '/pwa/icon-192.png' });
    return true;
  } catch {
    return false;
  }
}

function tituloDe(ev: EventoConta): string {
  if (ev.status !== 'success') return 'Krypta — alerta de segurança';
  if (/LOGIN/.test(ev.action)) return 'Krypta — novo acesso à conta';
  if (/REMOTE/.test(ev.action)) return 'Krypta — cofre em outro aparelho';
  if (/INHERIT/.test(ev.action)) return 'Krypta — herança digital';
  return 'Krypta';
}

/** Começa a vigiar os eventos da conta. Devolve a função que para. */
export function vigiarAvisos(contaId: string): () => void {
  let parado = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rodando = false;

  const conferir = async () => {
    if (parado || rodando) return;
    rodando = true;
    clearTimeout(timer);
    try {
      const eventos = await UserAPI.audit();
      if (parado || !eventos.length) return;
      const visto = ler(K_VISTO(contaId));
      const lido = ler(K_LIDO(contaId));
      naoLidas = lido ? eventos.filter((e) => e.timestamp > lido).length : 0;
      if (!lido) gravar(K_LIDO(contaId), eventos[0].timestamp);
      avisar();

      // primeira vez neste aparelho: só marca, não dispara uma enxurrada de avisos antigos
      if (!visto) {
        gravar(K_VISTO(contaId), eventos[0].timestamp);
        return;
      }
      const novos = eventos.filter((e) => e.timestamp > visto && (e.status !== 'success' || IMPORTANTES.some((r) => r.test(e.action)))).slice(0, 3);
      gravar(K_VISTO(contaId), eventos[0].timestamp);
      for (const ev of novos.reverse()) {
        const titulo = tituloDe(ev);
        const texto = ev.detail ?? ev.action;
        const emUso = document.visibilityState === 'visible' && document.hasFocus();
        if (emUso || !Avisos.ligado() || !(await mostrarSistema(titulo, texto))) {
          ouvintesToast.forEach((f) => f({ id: ev.id, titulo, texto, alerta: ev.status !== 'success' }));
        }
      }
    } catch {
      /* sem internet / sessão expirada: tenta na próxima */
    } finally {
      rodando = false;
      if (!parado) timer = setTimeout(conferir, INTERVALO);
    }
  };

  const foco = () => void conferir();
  window.addEventListener('focus', foco);
  timer = setTimeout(conferir, 4000);
  return () => {
    parado = true;
    clearTimeout(timer);
    window.removeEventListener('focus', foco);
  };
}
