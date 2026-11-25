# Hospedagem do Krypta — passo a passo

> Este é o roteiro para **refazer** a hospedagem do zero (ou montar outra cópia).
> Como está no ar hoje, endereços e operação: [PRODUCAO.md](PRODUCAO.md).

## 1. O que precisa ir para a internet

| Parte | O que é | Precisa de | Onde roda hoje |
|---|---|---|---|
| **Site** (`src/` → `dist/`) | Arquivos estáticos (HTML, JS, CSS) | HTTPS | Hostinger (site importado do GitHub) |
| **App do celular (PWA)** | O próprio site + `manifest` + `sw.js` | Só HTTPS | Junto do site |
| **API** (`server/`) | Programa Node.js + Express sempre ligado | **Node.js** | Render (Free) |
| **Banco** | MySQL / MariaDB | MySQL | Hostinger, com MySQL remoto |
| **E-mails** | Códigos e alertas | API HTTP (o Render grátis bloqueia SMTP) | Brevo (opcional) |
| **App Windows** (`.exe`) | Instalador | Lugar para baixar | GitHub Releases |
| **Krypta físico** | Firmware no ESP32 | Endereço da API | Na placa |

> Na Hostinger, apps Node.js (Express) só rodam nos planos **Business** e **Cloud**. No **Premium** a API vai para o Render.
> Com Business/Cloud dá para colocar a API também na Hostinger (Web App Node.js, pasta raiz `server`) e fechar o MySQL remoto.

## 2. Ordem

1. Código no GitHub, sem `.env`
2. Domínio + site na Hostinger
3. Banco na Hostinger
4. API no Render
5. Conferir o site
6. Brevo (e-mails) — pode ficar para depois
7. App Windows
8. Despertador da API

## 3. Código no GitHub
- Tudo na branch `main`. No GitHub Desktop, conferir que nenhum `.env` aparece em **Changes** antes do commit.
- Nomes de arquivos e pastas **exatamente** iguais aos imports (o Linux diferencia `Logos` de `logos`).

## 4. Domínio e site (Hostinger)
1. **Domínios** → registrar o domínio (hoje `krypta.website`) → confirmar o link de verificação que chega por e-mail.
2. **Sites → + Criar site → importar do GitHub** → repositório `Krypta` → domínio do Krypta.
3. Configuração:

| Campo | Valor |
|---|---|
| Configuração predefinida | `Vite` |
| Branch | `main` |
| Versão do Node | `22.x` |
| Diretório raiz | `./` |
| Compilação e saída | Padrão para Vite (`npm run build` → `dist`) |

4. Variáveis de ambiente — só estas três (apague as outras que a Hostinger listar a partir do `.env.example`):

| Chave | Valor |
|---|---|
| `VITE_API_URL` | `https://<serviço>.onrender.com/api` |
| `VITE_SITE_URL` | `https://<domínio do Krypta>` |
| `VITE_SOCIAL_LOGIN_ENABLED` | `false` |

5. **Implantar**. Depois: **Segurança → SSL** tem que estar **Ativo**.

## 5. Banco (Hostinger, no painel do site do Krypta)
1. **Bancos de dados → Gerenciamento**: banco `krypta`, usuário `krypta`, senha aleatória de 24 caracteres
   (`node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`). Anotar os nomes **com o prefixo** `u…_`.
2. **phpMyAdmin** → banco `u…_krypta` → aba **SQL** → rodar `server/sql/001_base.sql` até `008`, um por vez. Ficam 10 tabelas.
3. **MySQL remoto** → **Qualquer host** → só o banco `u…_krypta` → **Criar**. Anotar o servidor (`srv….hstgr.io`) como `DB_HOST`.
4. Não usar o botão **Conectar** do cartão "Banco de dados" do site: quem usa o banco é a API, não o site.

## 6. API (Render)
1. Na pasta `server`: `npm run gerar-segredo` duas vezes → `JWT_SECRET` e `PASSWORD_PEPPER` (novos, só para produção).
2. render.com → entrar com o GitHub → **+ New → Web Service** → repositório `Krypta`:

| Campo | Valor |
|---|---|
| Name | `krypta-api` |
| Language | Node |
| Branch | `main` |
| Region | Virginia (US East) |
| Root Directory | `server` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path | `/health` |

3. **Environment Variables → Add from .env**:
```
NODE_VERSION=22
NODE_ENV=production
DB_HOST=<srv….hstgr.io>
DB_PORT=3306
DB_USER=<u…_krypta>
DB_PASSWORD=<senha do banco>
DB_NAME=<u…_krypta>
JWT_SECRET=<gerado>
PASSWORD_PEPPER=<gerado; guardar cópia fora do projeto>
CORS_ORIGIN=https://<domínio do Krypta>
TRUST_PROXY=1
MAIL_FROM=Krypta <no-reply@<domínio do Krypta>>
SUPPORT_EMAIL=<seu e-mail>
```
   Não criar `PORT` (o Render define) nem variável vazia. `BREVO_API_KEY` entra só quando existir.
4. **Deploy Web Service**. Nos Logs: `Build successful` → `✅ Conectado ao MySQL` → `Your service is live`.
5. Conferir `https://<serviço>.onrender.com/health` → `"status":"OK"`.

## 7. Conferir o site
- O endereço do Render tem que ser igual ao `VITE_API_URL`. Se for diferente: corrigir na Hostinger → **Reimplantar**.
- Abrir o site, criar conta (o banco começa vazio), parear o cofre, salvar uma chave, apertar **F5** numa página interna.

## 8. E-mails (Brevo, opcional)
1. brevo.com → conta Free.
2. **Senders, Domains & Dedicated IPs → Domains → Add a domain** → domínio do Krypta → autenticação manual.
3. Copiar os registros (TXT `brevo-code`, DKIM, DMARC) para **Domínios → DNS** do domínio na Hostinger
   (no campo Nome, só a parte antes do domínio; `@` para o próprio domínio; um só `_dmarc`).
4. **Senders → Add a sender** `no-reply@<domínio>` · **SMTP & API → API Keys** → criar chave.
5. No Render: `BREVO_API_KEY=<xkeysib-…>` → **Save, rebuild, and deploy**.

Sem a Brevo, os códigos de "esqueci a senha" e "abandonar cofre" aparecem nos **Logs** do Render.

## 9. App Windows
1. GitHub → **Settings → Secrets and variables → Actions → Variables**: `VITE_API_URL` e `VITE_SITE_URL`.
2. Subir a versão no `package.json` → push → **Actions → App desktop (Windows) → Run workflow**.
3. ~15 min depois, o botão **Aplicações → Baixar para Windows** entrega o `.exe` novo.

## 10. Despertador da API
cron-job.org → **Create cronjob** → `https://<serviço>.onrender.com/health` → a cada 10 minutos.

## 11. Problemas comuns

| O que aparece | Causa | Como resolver |
|---|---|---|
| Hostinger: `UNRESOLVED_IMPORT` | Nome de arquivo/pasta com maiúscula diferente do import | Deixar o import igual ao nome real, letra por letra |
| Hostinger pede upgrade ao implantar | Plano sem suporte a apps do GitHub | Site PHP/HTML vazio + enviar o conteúdo de `dist/` pelo Gerenciador de arquivos (com o `.htaccess`) |
| Render: `❌ Variáveis de ambiente inválidas` | Faltou variável, pepper fora do formato ou igual ao JWT | A mensagem diz qual |
| Render: `❌ Falha ao conectar no MySQL` | MySQL remoto não liberado, `DB_HOST` errado, usuário/senha sem o prefixo | Refazer o passo 5.3 e conferir `DB_*` |
| Render: `tsc: not found` | Build sem `--include=dev` | Corrigir o Build Command |
| Site dá erro de rede / CORS | `CORS_ORIGIN` diferente do endereço do site | Exatamente `https://<domínio>`, sem barra no fim |
| F5 numa página interna dá 404 | Rotas do React sem fallback | Conferir o `.htaccess` (no envio manual) ou avisar o suporte da Hostinger |
| Primeiro acesso demora ~1 min | API dormindo | Despertador (passo 10) |
| App Windows não conecta | `.exe` gerado antes das variáveis | Passo 9 de novo e instalar por cima |
