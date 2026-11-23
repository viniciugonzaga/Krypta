# Arquivos públicos (`public/`)

Tudo aqui vai **como está** para a raiz do site no `npm run build` (pasta `dist/`).

| Arquivo | Para que serve |
|---|---|
| `manifest.webmanifest` | Torna o site instalável (PWA): nome, cores, ícones, abre em tela cheia |
| `sw.js` | Service worker: navegação *network-first*, cache das `/assets`, **nunca** guarda chamadas da API. O cache leva a versão do `package.json`, então o app instalado se atualiza sozinho |
| `pwa/` | Ícones do app (192, 512, *maskable*, Apple) |
| `icon_krypta.png` | Ícone/logo |
| `.htaccess` | Apache/LiteSpeed: força HTTPS, faz as rotas do React funcionarem ao recarregar, cabeçalhos de segurança e sem cache em `index.html`/`sw.js`. Usado no envio manual do `dist/`; no site importado do GitHub a Hostinger gera o próprio `.htaccess` a cada implantação |
| `downloads/` | (opcional, fora do Git) `Krypta-Setup.exe` para baixar do próprio site — `npm run desktop:copiar` |

O PWA só instala com **HTTPS** (ou `localhost`). Em produção: `https://krypta.website` → **Aplicações** → Instalar.
