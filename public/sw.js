// ============================================================
// KRYPTA — Service Worker do app de celular (PWA)
//
// Guarda só a "casca" do site (HTML, JS, CSS, ícones) para abrir rápido.
// NUNCA guarda respostas da API: conta, plano e cofre vêm sempre do
// servidor, igual ao site e ao app desktop.
// A versão vem do endereço de registro (/sw.js?v=1.0.0): versão nova = cache novo.
// ============================================================
const VERSAO = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `krypta-${VERSAO}`;
const CASCA = ['/', '/manifest.webmanifest', '/pwa/icon-192.png', '/pwa/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('krypta-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Outros endereços (API em outro domínio, GitHub, fontes) e a API no mesmo domínio: direto na rede
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/downloads/') || url.pathname === '/health') return;

  // Páginas: rede primeiro (sempre a versão mais nova); sem internet, abre a casca guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Arquivos do build (/assets/*-hash.js|css): nunca mudam de conteúdo → cache primeiro
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
      )
    );
    return;
  }

  // Resto (ícones, imagens da pasta public): mostra o guardado e atualiza por trás
  event.respondWith(
    caches.match(req).then((salvo) => {
      const rede = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => salvo);
      return salvo || rede;
    })
  );
});

// v1.3.0 — tocar numa notificação do Krypta abre (ou traz para a frente) o app nas notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertas) => {
      const janela = abertas.find((c) => 'focus' in c);
      if (janela) return janela.focus();
      return self.clients.openWindow('/notificacoes');
    }),
  );
});
