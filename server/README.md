# Krypta — API (`server/`)

API REST do Krypta em **Node.js + Express + TypeScript**, banco **MySQL/MariaDB** (`mysql2`), validação com **zod**.
Atende o site, o PWA, o app Windows e o dispositivo ESP32.

> A API **nunca** vê o conteúdo do cofre: recebe backups cifrados e provas derivadas das chaves (veja
> [docs/ARQUITETURA.md](../docs/ARQUITETURA.md)).

## Comandos
| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Sobe a API em http://localhost:3333 com recarga automática (tsx watch) |
| `npm run build` | Compila TypeScript → `dist/` |
| `npm start` | Roda a versão compilada (`node dist/app.js`) — é o que a hospedagem usa |
| `npm run gerar-segredo` | Gera um segredo hex de 64 caracteres (para `JWT_SECRET` e `PASSWORD_PEPPER`) |
| `npm run sim -- <comando>` | Simulador de dispositivo e testes ponta a ponta ([scripts/README.md](scripts/README.md)) |
| `npm run ttl` | Testa a rotina de inatividade |
| `npm run seed` | Dados de exemplo |

## Configuração (`server/.env`)
Copie `.env.example` para `.env`. Principais variáveis:

| Variável | Para que serve |
|---|---|
| `PORT` | Porta (padrão 3333; o Render define sozinho) |
| `NODE_ENV` | `development` ou `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Banco MySQL |
| `JWT_SECRET` | Assina os tokens (20+ caracteres) |
| `PASSWORD_PEPPER` | Segredo das provas da CCP/CCH/PIN (64+ hex, **diferente** do JWT). **Guarde cópia fora do projeto.** |
| `CORS_ORIGIN` | Endereços do front, separados por vírgula (o app Windows já é liberado sozinho) |
| `TRUST_PROXY` | `0` local · `1` atrás de proxy (Hostinger, Render) |
| `SMTP_*`, `MAIL_FROM`, `SUPPORT_EMAIL` | E-mails por SMTP (uso no PC). Vazio = e-mails aparecem no terminal |
| `BREVO_API_KEY` | E-mails pela API HTTP da Brevo. Preenchida, substitui o SMTP (obrigatória no Render Free, que bloqueia SMTP) |
| `GOOGLE_CLIENT_ID` | Login social (opcional) |

Se faltar algo obrigatório, a API **não sobe** e mostra qual variável está errada (`src/config/env.ts`).

## Estrutura
```
server/
├── src/
│   ├── app.ts            Express: helmet, CORS, JSON, /health, rotas, erros, job de inatividade
│   ├── config/           env (validação), database (pool MySQL), estados do cofre, planos e preços
│   ├── routes/           Mapeia URL → middlewares → controller
│   ├── middlewares/      auth (site), vaultAuth (escopos), cliente (web/mobile/pwa/desktop), rateLimit, erros
│   ├── controllers/      Camada HTTP: valida entrada, chama regras/models, responde
│   ├── services/         Regras (VaultRules), e-mail, recomendação de plano, inatividade
│   ├── models/           Só SQL (sem regra de negócio); transações com trava por conta
│   ├── jobs/             ttlJob: avisos e exclusão por inatividade
│   └── utils/            tokens JWT, pepper, hash, validadores, nonces, segredo do acesso remoto
├── sql/                  Estrutura do banco e migrações ([sql/README.md](sql/README.md))
└── scripts/              Simulador de dispositivo e testes ([scripts/README.md](scripts/README.md))
```

## Rotas (prefixo `/api`)
| Grupo | Rotas principais | Token |
|---|---|---|
| `auth` | `register`, `login`, `refresh`, `logout`, `recover`, `reset-password`, `social`, `session`, `challenge`, `verify` | público / site / dispositivo |
| `users` | `me` (GET/PUT/DELETE), `me/change-password`, `me/audit`, `me/sessions`, `me/sessions/revoke` | site |
| `plans` | `GET /`, `change`, `cancel` | site |
| `orders` | `GET /`, `POST /` (assinatura Pro e dispositivo) | site |
| `devices` | dispositivos comprados, "Recebi" | site |
| `hardware` | `announce` (ESP32), `pair` | público / site |
| `vault` | `account`, `activity`, `backup` (+`metadata`, `sync`), `recovery/*`, `kill-switch`, `rotate-ccp`, `backup/ccp`, `ccp/reset`, `abandon/*`, `remoto/*`, `pontos/*`, `inheritance/*` | site / dispositivo / cofre |
| `onboarding` | questionário e recomendação | site |
| `client` | `context` (quem está chamando) | público |
| `contact` | formulário de contato | público |

Detalhes de cada rota, corpo e respostas: [docs/INTEGRACAO-API.md](../docs/INTEGRACAO-API.md).
Saúde: `GET /health` (fora do `/api`).

## Formato das respostas
```json
{ "success": true,  "data": { } }
{ "success": false, "error": "mensagem", "code": 403, "details": { "motivo": "PLANO" } }
```
`details.motivo = "PLANO"` faz o front mostrar "Assine o Pro".

## Segurança aplicada
- `helmet`, CORS por lista, limite de corpo 2 MB, limites de tentativa por IP (`middlewares/rateLimit.ts`).
- Senhas com bcrypt; bloqueio temporário após erros de login.
- Provas da CCP/CCH/PIN: `bcrypt(HMAC-SHA256(PASSWORD_PEPPER, prova))`.
- Tokens HS256 com algoritmo fixado; token do dispositivo preso à chave pública; token do cofre com chave própria.
- Toda operação do cofre trava a linha da conta (`SELECT ... FOR UPDATE`) e usa anti-rollback de versão.
- Auditoria em `audit_logs` (aparece no Perfil e nos alertas do cofre).

## Hospedagem
Precisa de **Node.js 20+** sempre ligado. Hoje roda no **Render** (Free, Node 22) em `https://krypta-api.onrender.com`,
com root `server`, build `npm install --include=dev && npm run build`, start `npm start` e health check `/health`.
Cada push na `main` publica a API de novo. Como está no ar: [docs/PRODUCAO.md](../docs/PRODUCAO.md) ·
passo a passo: [docs/HOSPEDAGEM.md](../docs/HOSPEDAGEM.md).
