# Krypta Desktop (Windows) — Tauri 2

O app desktop é **o mesmo front do site** dentro de uma janela do Windows.
Ele não tem tela, lógica ou banco próprios:

```
          ┌──────────── mesmo código React (src/) ────────────┐
          │                                                   │
   [Site no navegador]                           [App Krypta.exe (Tauri)]
          │                                                   │
          └────────────► API Krypta (server/) ◄───────────────┘
                                 │
                           Banco MySQL (o mesmo)
```

- Mudou uma tela no `src/`? Ela muda no site **e** no app no próximo build.
- Assinou o Pro no app? O site mostra Pro na hora (é o mesmo banco).
- O dispositivo de software fica onde foi pareado (navegador **ou** app), como um dispositivo físico.

### Por que Tauri e não Pake?
O Pake só "embrulha" um endereço da internet: sem o site hospedado, ele não abre nada.
O Tauri empacota o próprio front dentro do `.exe` (abre na hora, mesmo antes da hospedagem)
e chama a API pelo endereço do `.env.desktop`. O instalador fica com uns 5 a 10 MB.

---

## Como o usuário baixa (menu "Aplicações")

Qualquer pessoa, logada ou não, abre **Aplicações** no menu e clica em **Baixar para Windows**:
o navegador baixa o `Krypta-Setup.exe` **na hora**, sem passar por outra página.

O motor é o **GitHub Releases**, que é grátis e serve o arquivo rápido:

```
você roda  npm run desktop:lancar
      │
      ▼
GitHub Actions compila o app no Windows da nuvem (~10 min)
      │
      ▼
Release vX.Y.Z com  Krypta-Setup.exe  (nome fixo)
      │
      ▼
botão do site → github.com/viniciugonzaga/Krypta/releases/latest/download/Krypta-Setup.exe
                (sempre a versão mais nova)
```

A página também pergunta ao GitHub o número da versão, a data e o tamanho do arquivo para mostrar ao lado do botão.
Enquanto nenhuma versão foi publicada, o botão aparece como **"Primeira versão em preparação"**, e não como um link quebrado.
Ela também reconhece o sistema do visitante: no Windows, o botão vem em destaque; no celular, aparece "em breve" (PWA).

### Lançar uma versão (2 comandos)

1. Mude `"version"` no `package.json` (ex.: `1.0.0` → `1.0.1`), faça o commit e o push.
2. Rode:
   ```
   npm run desktop:lancar
   ```
   Ele cria a tag `v1.0.1` e envia. O resto é automático.

### Sem GitHub (servindo o .exe pela Hostinger)

1. `npm run desktop:build` (gera o instalador no seu PC)
2. `npm run desktop:copiar` (copia para `public/downloads/Krypta-Setup.exe`)
3. No `.env` do site: `VITE_DESKTOP_DOWNLOAD_URL=/downloads/Krypta-Setup.exe`
4. `npm run build` e envie a pasta `dist/` para a Hostinger como sempre.

---

## O que foi adicionado

| Arquivo | Para quê |
|---|---|
| `src-tauri/` | O app desktop: configuração (`tauri.conf.json`), código Rust mínimo, ícones e permissões |
| `src/config/desktop.ts` | Detecta o app, abre links externos no navegador, endereço público do site |
| `src/pages/Aplicacoes.tsx` | Página **Aplicações** (menu principal): download direto do `.exe`, celular em breve |
| `scripts/lancar-versao.mjs` | `npm run desktop:lancar`: publica a versão no GitHub |
| `scripts/copiar-instalador.mjs` | `npm run desktop:copiar`: opção sem GitHub |
| `.env.desktop.example` | Endereço da API usado pelo app |
| `.github/workflows/desktop-windows.yml` | Gera o `.exe` no GitHub, sem precisar de Rust no PC |
| `server/src/config/env.ts` | Libera no CORS as origens do app (`http://tauri.localhost`, `tauri://localhost`) |

---

## Opção A — Gerar o .exe no seu PC

### 1. Instalar as ferramentas (uma vez só)

1. **Microsoft C++ Build Tools**
   Baixe em visualstudio.microsoft.com → "Build Tools for Visual Studio".
   No instalador, marque **"Desenvolvimento para desktop com C++"** e instale.
2. **Rust**
   Baixe em rustup.rs → `rustup-init.exe` → Enter para as opções padrão.
   Feche e abra o terminal e confira: `rustc --version`
3. **WebView2** já vem no Windows 10 e 11 (nada a fazer).
4. Na raiz do projeto Krypta:
   ```
   npm install
   ```
   (instala o `@tauri-apps/cli`, que já está no `package.json`)

### 2. Abrir o app em modo desenvolvimento

```
npm run desktop:dev
```
Isso liga a API (`server/`), o Vite e abre a janela do Krypta.
A primeira vez demora (o Rust compila tudo, 3 a 10 min). Depois é rápido.
Alterou uma tela? A janela atualiza sozinha, igual ao navegador.

### 3. Gerar o instalador

1. Copie `.env.desktop.example` para `.env.desktop` e confira o `VITE_API_URL`
   (para testar no seu PC: `http://localhost:3333/api`).
2. Rode:
   ```
   npm run desktop:build
   ```
3. O instalador sai em:
   ```
   src-tauri/target/release/bundle/nsis/Krypta_1.0.0_x64-setup.exe
   ```

> ⚠️ Com `localhost`, o `.exe` só funciona no computador onde o servidor está ligado.
> Depois da hospedagem, troque o `VITE_API_URL` pelo endereço público e gere de novo:
> aí qualquer pessoa que instalar usa o mesmo servidor e o mesmo banco.

---

## Opção B — Gerar o .exe no GitHub (sem instalar Rust)

1. Rode `npm install` uma vez no seu PC e faça commit do `package-lock.json` atualizado.
2. No GitHub do projeto: **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - `VITE_API_URL` = endereço público da API (depois da hospedagem)
   - `VITE_SITE_URL` = endereço do site (opcional, usado no link do kit de herança)
3. Crie a tag da versão:
   ```
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. Em **Actions** aparece "App desktop (Windows)". Em uns 10 minutos o `.exe` aparece em **Releases**.
5. O botão **Baixar para Windows** (menu Aplicações) já baixa essa versão.
   Nas próximas vezes, use só `npm run desktop:lancar` (ver acima).

---

## Nova versão

1. Mude `"version"` no `package.json` (ex.: `1.0.1`). O app, o instalador e a página de download usam esse número.
2. Gere de novo (Opção A ou nova tag `v1.0.1` na Opção B).

## Trocar o ícone

Substitua `src-tauri/app-icon.png` (1024×1024) e rode `npm run desktop:icon`.

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `link.exe not found` / `MSVC` no build | Instale o C++ Build Tools (passo 1.1) e abra um terminal novo |
| `failed to bind port 5173` no `desktop:dev` | Feche o `npm run dev` que já está aberto (o `desktop:dev` liga o Vite sozinho) |
| App abre mas diz que não conectou à API | Servidor desligado ou `VITE_API_URL` errado no `.env.desktop`. Gere de novo depois de corrigir |
| Erro de CORS no console do app (F12 só no `desktop:dev`) | Reinicie o servidor: as origens do app já estão liberadas no `env.ts` |
| Windows mostra "O Windows protegeu o computador" | Normal para app sem certificado de assinatura: "Mais informações" → "Executar assim mesmo". Para sumir, é preciso um certificado de assinatura de código (pago) |
| Link do kit de herança não aparece no arquivo gerado pelo app | Defina `VITE_SITE_URL` no `.env.desktop` (sem ele, o kit traz só o código para colar) |
