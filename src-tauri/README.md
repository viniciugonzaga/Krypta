# Krypta para Windows (`src-tauri/`)

App desktop com **Tauri 2**: o mesmo front de `src/` dentro de uma janela do Windows (WebView2).
Não tem tela, lógica ou banco próprios; usa a mesma API do site.

| Arquivo | Papel |
|---|---|
| `tauri.conf.json` | Nome, janela, ícones, versão (lida do `package.json`), instalador NSIS |
| `src/main.rs`, `src/lib.rs` | Ponto de entrada em Rust (abre a janela, plugin para abrir links) |
| `capabilities/default.json` | Permissões mínimas da janela |
| `icons/`, `app-icon.png` | Ícones (`npm run desktop:icon` regera a partir do `app-icon.png`) |

## Comandos (na raiz)
| Comando | O que faz |
|---|---|
| `npm run desktop:dev` | API + app em modo desenvolvimento (precisa de Rust no PC) |
| `npm run desktop:build` | Gera o instalador local (precisa de Rust) |
| `npm run desktop:lancar` | Mostra como publicar a versão no GitHub |

## Publicar uma versão (sem Rust e sem Git no PC)
1. Suba a versão nova no `package.json` e faça commit/push (GitHub Desktop).
2. GitHub → **Actions → App desktop (Windows) → Run workflow**.
3. O workflow `.github/workflows/desktop-windows.yml` compila, cria a Release `vX.Y.Z` e publica o
   `Krypta-Setup.exe` com nome fixo — o botão **Baixar para Windows** do site sempre pega o mais novo.

O endereço da API vem das *Variables* do GitHub (`VITE_API_URL`, `VITE_SITE_URL`), escritas no `.env.desktop` durante o build.
Guia completo: [docs/DESKTOP.md](../docs/DESKTOP.md).
