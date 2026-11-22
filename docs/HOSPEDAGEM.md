# Hospedagem do Krypta

> Guia passo a passo detalhado (com cada clique na Hostinger, no Render e na Brevo): veja o documento
> "Krypta — Hospedagem passo a passo". Este arquivo é o resumo técnico.

## 1. O que precisa ir para a internet

| Parte | O que é | Precisa de | Onde roda |
|---|---|---|---|
| **Front** (`src/` → `dist/`) | Arquivos estáticos (HTML, JS, CSS) | Qualquer hospedagem com HTTPS | Hostinger (qualquer plano) |
| **App do celular (PWA)** | O próprio front + `manifest` + `sw.js` | Nada além do front, só HTTPS | Junto do front |
| **API** (`server/`) | Programa Node.js + Express que fica ligado | **Node.js** | Hostinger Business/Cloud, Render, VPS... |
| **Banco** | MySQL / MariaDB | MySQL | Hostinger (todos os planos de hospedagem) |
| **App Windows** (`.exe`) | Instalador gerado pelo GitHub Actions | Um lugar para baixar | GitHub Releases (já configurado) |
| **Krypta físico** | Firmware no ESP32 | Só o endereço da API | Na placa |

O ponto que decide tudo é a **API**: ela é um programa Node.js que precisa ficar rodando.
Ela **não roda** em hospedagem de sites PHP/HTML comum.

> Na Hostinger, apps Node.js (Express) estão nos planos **Business** e **Cloud**.
> O plano **Premium** hospeda o front e o banco, mas **não** a API.

## 2. Os dois caminhos

| | **Caminho A — Premium + Render (grátis)** | **Caminho B — Hostinger Business (tudo num lugar)** |
|---|---|---|
| Custo extra | R$ 0 | Upgrade do plano no hPanel |
| Front + PWA | Hostinger Premium | Hostinger Business |
| Banco | Hostinger (acesso remoto liberado) | Hostinger (local, sem expor) |
| API | Render, plano Free | Hostinger Business (Node.js Web App) |
| Ponto fraco | A API "dorme" após 15 min sem uso: o 1º acesso leva até ~1 min. O banco fica aberto para a internet (com senha forte). A rotina de inatividade só roda com a API acordada. | Custa mais |
| Indicado para | Testes, demonstração, desenvolvimento | Apresentação final e uso real |

**Recomendação:** comece pelo **Caminho A** (não gasta nada e serve para testar tudo online).
Para a apresentação/produção, passe para o **Caminho B**. O código é o mesmo, só mudam os endereços no `.env`.

## 3. Endereços sugeridos
Use um subdomínio de um domínio que você já tem (ou compre um domínio só para o Krypta):

| Para | Exemplo |
|---|---|
| Site + PWA | `https://krypta.seudominio.com.br` |
| API | Caminho A: `https://krypta-api.onrender.com` · Caminho B: `https://api.krypta.seudominio.com.br` |

---

## 4. Caminho A — Hostinger Premium + Render

### 4.1 Banco de dados na Hostinger
1. hPanel → **Sites** → seu site → **Bancos de dados** → **Gerenciamento** → criar banco (ex.: `u123_krypta`), usuário e **senha forte** (20+ caracteres).
2. Abra o **phpMyAdmin** desse banco e rode, em ordem: `server/sql/001_base.sql`, `002`, `003`, `004`, `005`, `006`, `007`.
   - Quer levar seus dados do XAMPP? Exporte o banco local (phpMyAdmin → Exportar) e importe aqui no lugar do 001–007.
     Nesse caso use **o mesmo `PASSWORD_PEPPER`** do seu `.env` local, senão as CCPs antigas não conferem.
3. hPanel → **Bancos de dados** → **MySQL remoto**: escolha o banco e marque **Qualquer host** (o Render não tem IP fixo).
   Anote o **host/IP do MySQL** que aparece no topo dessa página → será o `DB_HOST`.

> Segurança do caminho A: o banco aceita conexões de fora. Por isso a senha do usuário do banco precisa ser forte,
> e esse usuário deve ter acesso **só** ao banco do Krypta. No Caminho B isso deixa de ser necessário.

### 4.2 API no Render
1. Entre em https://render.com com a conta do GitHub → **New** → **Web Service** → escolha o repositório `Krypta`.
2. Preencha:
   | Campo | Valor |
   |---|---|
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install --include=dev && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | Free |
   | Health Check Path | `/health` |
3. Em **Environment**, crie as variáveis (copie do seu `server/.env` e ajuste):
   ```
   NODE_ENV=production
   DB_HOST=<host do MySQL remoto da Hostinger>
   DB_PORT=3306
   DB_USER=<usuário do banco>
   DB_PASSWORD=<senha do banco>
   DB_NAME=<nome do banco>
   JWT_SECRET=<novo, gere com npm run gerar-segredo>
   PASSWORD_PEPPER=<o seu; guarde cópia fora do projeto>
   CORS_ORIGIN=https://krypta.seudominio.com.br
   TRUST_PROXY=1
   NODE_VERSION=22
   BREVO_API_KEY=<chave da Brevo, xkeysib-...>
   MAIL_FROM=Krypta <no-reply@seudominio.com.br>
   SUPPORT_EMAIL=<e-mail do suporte>
   ```
   Não crie `PORT`: o Render define sozinho.

   **E-mails:** o plano grátis do Render bloqueia as portas de SMTP (25, 465 e 587), então o Gmail/SMTP não
   funciona lá. A API usa a **API HTTP da Brevo** (300 e-mails/dia grátis) quando `BREVO_API_KEY` está preenchida.
   O remetente (`MAIL_FROM`) precisa ser de um domínio seu, autenticado na Brevo (registros DNS na Hostinger).
4. **Create Web Service**. Quando ficar "Live", teste: `https://krypta-api.onrender.com/health` deve responder OK.

### 4.3 Front + PWA na Hostinger Premium
1. hPanel → no site do domínio → **Domínios → Subdomínios** → crie `krypta` (ou use um domínio próprio).
   Ative o **SSL** dele (hPanel → Segurança → SSL).
2. No seu PC, na raiz do projeto, crie `.env.production`:
   ```
   VITE_API_URL=https://krypta-api.onrender.com/api
   VITE_SITE_URL=https://krypta.seudominio.com.br
   ```
3. Rode `npm run build`. Sai a pasta `dist/` (já com o `.htaccess` que faz o HTTPS e as rotas funcionarem).
4. hPanel → **Gerenciador de arquivos** → pasta do subdomínio (ex.: `public_html/krypta`) → envie o **conteúdo** de `dist/`
   (dica: compacte em .zip, envie e use "Extrair"). Confira se o `.htaccess` foi junto (mostrar arquivos ocultos).
5. Abra `https://krypta.seudominio.com.br`, crie uma conta e teste. Recarregar em `/device` não pode dar 404.

**PWA:** não tem passo extra. Com HTTPS, a página **Aplicações** já oferece "Instalar no celular".
A cada novo `dist/` enviado, o app instalado se atualiza sozinho.

### 4.4 Atualizações
| Mudou | Faça |
|---|---|
| Front | `npm run build` → reenvie o `dist/` |
| API | commit + push no GitHub → o Render publica sozinho |
| Banco | rode a nova migração no phpMyAdmin |

---

## 5. Caminho B — Hostinger Business (tudo na Hostinger)
1. hPanel → **Upgrade** para Business (ou Cloud).
2. **Banco:** igual ao 4.1, mas **sem** MySQL remoto. O `DB_HOST` é o que o hPanel mostra (normalmente `localhost`).
3. **API:** hPanel → **Sites → Criar site → Web App (Node.js)** → **Importar repositório Git** → `Krypta`.
   - Framework: **Express** · Node **22** · pasta raiz: `server` · build: `npm run build` · início: `npm start` (arquivo `dist/app.js`).
   - Se o assistente não deixar escolher a pasta `server`, envie um `.zip` só com o conteúdo de `server/`.
   - Variáveis de ambiente: as mesmas do 4.2, com `DB_HOST=localhost` (ou o host do hPanel) e `TRUST_PROXY=1`.
   - Domínio: `api.krypta.seudominio.com.br`.
4. **Front:** igual ao 4.3, com `VITE_API_URL=https://api.krypta.seudominio.com.br/api`.
5. `CORS_ORIGIN` da API = endereço do front.

---

## 6. App Windows (.exe)
O `.exe` leva dentro o endereço da API. Depois que a API estiver online:
1. GitHub → repositório → **Settings → Secrets and variables → Actions → Variables**:
   - `VITE_API_URL` = endereço público da API **com `/api`** no final
   - `VITE_SITE_URL` = endereço do site
2. **Actions → App desktop (Windows) → Run workflow**.
3. Em ~10–15 min a Release nova tem o `Krypta-Setup.exe`; o botão "Baixar para Windows" já entrega ele.
4. Quem já instalou: baixa e instala por cima.

O app Windows chama a API a partir de `http://tauri.localhost`; essa origem já é liberada no CORS pelo próprio servidor.

## 7. Krypta físico (ESP32)
No Monitor Serial: `api https://<endereço-da-api>/api`. O firmware já aceita HTTPS
(hoje sem conferir o certificado; conferir o certificado raiz está na lista de produção em `hardware/README.md`).

## 8. Checklist final
- [ ] Banco criado e migrações 001–007 rodadas
- [ ] `PASSWORD_PEPPER` com cópia guardada fora do projeto e fora do GitHub
- [ ] `JWT_SECRET` novo em produção
- [ ] API responde em `/health`
- [ ] `CORS_ORIGIN` = endereço do front (sem barra no final)
- [ ] Front com SSL, `.htaccess` enviado, recarregar páginas internas funciona
- [ ] Cadastro, login, parear cofre, criar chave e e-mails funcionando online
- [ ] Variáveis `VITE_API_URL`/`VITE_SITE_URL` no GitHub e `.exe` gerado de novo
- [ ] `npm run sim -- testar-tudo` com `SIM_API=https://.../api` (opcional, testa a API online)
- [ ] Nenhum `.env` no repositório
