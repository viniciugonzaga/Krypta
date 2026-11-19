# Krypta — Integração da API do cofre (Partes 1 a 9)

Este documento resume o que foi integrado da branch `feature/backend` (API zero-knowledge em
PostgreSQL/JavaScript) no projeto principal (React + Express/TypeScript + MySQL), como testar
e o que conferir antes de hospedar.

---

## 1. Visão geral

| Camada | Onde | O que faz |
|---|---|---|
| Site (React) | `src/` | Portal: conta, planos, perfil, **Meu Krypta** (`/device`) e resgate de herança (`/heranca`) |
| Lógica do app | `src/services/vaultFlows.ts`, `src/crypto/kryptaCrypto.ts` | Gera a CCP/CCH, deriva as provas (Argon2id + HKDF), monta o `vault.enc` |
| Dispositivo virtual | `src/services/virtualDevice.ts` | Faz o papel do ESP32 no navegador (chave Ed25519, cofre) — **só demonstração** |
| API (Express) | `server/src/` | Contas do site + cofre: pareamento, login do dispositivo, backup, contingência, herança, inatividade |
| Banco (MySQL) | XAMPP local / Hostinger | `users` (conta + cofre), `backups`, `chaves_revogadas`, `avisos_ttl`, `sessions`, `audit_logs` |

**Zero-knowledge:** o servidor nunca vê a CCP, a CCH, a senha mestre nem as chaves de cifra.
Ele guarda o backup cifrado (que não consegue abrir) e o **bcrypt(pepper(prova))** das chaves de
contingência.

---

## 2. Dois tipos de token

| Escopo | Como se obtém | Validade | Abre |
|---|---|---|---|
| `admin_web` | `POST /api/auth/login` (e-mail + senha) | 24 h + refresh 7 dias | Site, pareamento, Kill Switch, recuperação de hardware |
| `hardware` | `POST /api/auth/challenge` + `/api/auth/verify` (assinatura Ed25519) | 15 min | Backup, recuperação local, troca da CCP, herança |

Um não abre as rotas do outro. O token `hardware` fica preso à chave pública: se a chave mudar
(Kill Switch, resgate), ele morre na hora.

---

## 3. Estados do cofre (`users.estado_cofre`)

Separado do `users.status` (conta do site). Regras em `server/src/config/estados.ts`.

```
(cadastro) ─────────────► PENDENTE_PAREAMENTO
PENDENTE_PAREAMENTO ────► ATIVA                 POST /hardware/pair
ATIVA ──────────────────► RECUPERACAO_LOCAL     POST /vault/recovery/owner
RECUPERACAO_* ──────────► ATIVA                 POST /vault/recovery/complete
ATIVA / RECUPERACAO_* ──► REVOGADA              POST /vault/kill-switch
REVOGADA ───────────────► RECUPERACAO_HARDWARE  POST /vault/recovery/hardware
qualquer (≠ PENDENTE) ──► RECUPERACAO_HARDWARE  POST /vault/inheritance/claim
```

| Estado | Login do dispositivo | Enviar backup | Baixar backup |
|---|---|---|---|
| PENDENTE_PAREAMENTO | não | não | não |
| ATIVA | sim | sim | **não** (o ESP32 é a fonte da verdade) |
| RECUPERACAO_LOCAL | sim | sim | sim |
| RECUPERACAO_HARDWARE | sim | não | sim |
| REVOGADA | não | não | não |

---

## 4. Rotas (todas com prefixo `/api`)

Respostas: `{ "success": true, "data": ... }` ou `{ "success": false, "error": "...", "code": 400 }`.

| Método | Rota | Token | Parte |
|---|---|---|---|
| POST | `/hardware/pair` | admin_web | 3 |
| POST | `/auth/challenge` | público | 3 |
| POST | `/auth/verify` | público | 3 |
| GET | `/auth/session` | hardware | 3 |
| GET | `/vault/account` | admin_web ou hardware | 3 |
| PUT | `/vault/backup` | hardware | 4 |
| GET | `/vault/backup` | hardware | 4 |
| GET | `/vault/backup/metadata` | hardware | 4 |
| POST | `/vault/recovery/owner` | hardware | 5 |
| POST | `/vault/recovery/complete` | hardware | 5 |
| POST | `/vault/kill-switch` | admin_web | 5 |
| POST | `/vault/recovery/hardware` | admin_web | 5 |
| POST | `/vault/rotate-ccp` | hardware | 5 |
| POST | `/vault/inheritance/enable` | hardware | 6 |
| POST | `/vault/inheritance/disable` | hardware | 6 |
| POST | `/vault/inheritance/claim` | público | 6 |

O contrato original (`docs/contrato-api.md` da branch `feature/backend`) continua valendo para
os corpos das requisições e as regras. As diferenças são o prefixo `/api`, o formato da
resposta acima, `POST /accounts` → `POST /api/auth/register`, `POST /auth/admin-login` →
`POST /api/auth/login` e `GET /accounts/:id` → `GET /api/vault/account`.

---

## 5. Criptografia do cliente (contrato, seção 4)

Implementada em `src/crypto/kryptaCrypto.ts`:

```
CCP/CCH  = 160 bits, Base32 Crockford, 8 blocos de 4 (mostrada uma vez, nunca enviada)
master   = Argon2id(segredo, salt = SHA-256("krypta-ccp-v1:" + conta_id), m = 64 MiB, t = 3, p = 1, 32 bytes)
prova    = HKDF-SHA256(master, "krypta-prova-v1")          → vai para a API
envelope = HKDF-SHA256(master, "krypta-envelope-ccp-v1")   → NUNCA sai do cliente
(herdeiro: "krypta-cch-v1", "krypta-prova-cch-v1", "krypta-envelope-cch-v1")
```

`vault.enc` (formato de demonstração `krypta-vault-demo-v1`):
`dados` = AES-GCM(chave do cofre, credenciais), `envelope_ccp` e `envelope_herdeiro` =
AES-GCM(chave do envelope, chave do cofre). O app definitivo do ESP32 acrescenta o Envelope
do Titular (senha mestre).

---

## 6. Inatividade (RN11)

- Prazo: **365 dias** sem login do dispositivo nem envio de backup. Login no site não renova.
- Só vale para contas **com cofre pareado** (contas sem dispositivo não são excluídas).
- A rotina roda 30 s depois de subir e a cada 6 h (`server/src/jobs/ttlJob.ts`).
- Avisos por e-mail em 30 dias, 15 dias e 48 horas antes.
- A exclusão exige o aviso de 48 h **confirmado** e enviado há mais de 48 h.
  **Sem SMTP configurado, nenhuma conta é excluída.**
- A exclusão apaga a conta, sessões, avisos e backup. A chave revogada continua banida.

---

## 7. Como testar

Pré-requisitos: XAMPP com MySQL ligado, migração `server/sql/002_cofre_hardware.sql` aplicada,
`server/.env` preenchido (veja `server/.env.example`).

```powershell
# Terminal 1 — servidor
cd server
npm run dev

# Terminal 2 — testes da API (dispositivo simulado)
cd server
npm run sim -- parear simulador@krypta.dev Krypta12345   # 1x por conta
npm run sim -- login
npm run sim -- testar-tudo simulador@krypta.dev Krypta12345

# Inatividade (NÃO precisa do servidor; EXCLUI a conta no fim)
npm run ttl -- roteiro simulador@krypta.dev
```

Para voltar a usar a conta de teste depois do roteiro de inatividade, cadastre-a de novo e pareie.

**No site:** `npm run dev` na raiz → entre → menu **Krypta** (ou Perfil → Meu Krypta).

1. Gerar a CCP → anotar → confirmar o último bloco → **Parear dispositivo virtual**
2. Adicionar credenciais no cofre (cada "Salvar" envia um backup cifrado novo)
3. Testar: login do dispositivo, "Esqueci a senha mestre", "Trocar a CCP"
4. Herança: gerar o kit → ativar → em outra janela anônima, abrir `/heranca` com o kit
5. Kill Switch → vincular dispositivo novo com a CCP

---

## 8. Antes de hospedar (checklist)

**Hostinger:** o site React vira arquivos estáticos (`npm run build` → `dist/`) e roda em
qualquer plano. A API Node.js exige o plano **Business** ou **Cloud** (o Premium não roda Node).

- [ ] Banco: criar o MySQL no hPanel, importar o dump local e aplicar a migração 002
- [ ] `server/.env` de produção: `NODE_ENV=production`, `TRUST_PROXY=1`, `DB_*` da Hostinger
- [ ] **Novos** `JWT_SECRET` e `PASSWORD_PEPPER` (`npm run gerar-segredo`) — guarde o pepper fora do servidor
- [ ] `CORS_ORIGIN=https://app.seudominio.com.br` (e `tauri://localhost` quando houver o app desktop)
- [ ] SMTP real (senha de app do Gmail ou SMTP da Hostinger)
- [ ] Front: `.env.production` com `VITE_API_URL=https://api.seudominio.com.br/api`, depois `npm run build`
- [ ] HTTPS ligado nos dois subdomínios (as provas da CCP são credenciais: nunca em HTTP)
- [ ] Trocar o `GOOGLE_CLIENT_SECRET` (ele foi exposto em conversa) antes de ligar o login social
- [ ] Remover ou esconder o dispositivo virtual em produção quando o app do ESP32 existir

---

## 9. Próximas fases

1. **Telas mobile + PWA** — layout adaptativo (detecção de tela pequena) e instalação no celular.
2. **App desktop (Tauri)** — mesmo front React empacotado em `.exe`, falando com o ESP32 pela USB
   no lugar do dispositivo virtual (`virtualDevice.ts` vira uma ponte para o hardware).
3. **Login social** — Google/GitHub/Apple com as chaves de produção.

## 10. Limitações conhecidas (herdadas do contrato da API)

- Nonces e limites de tentativa ficam em memória: valem para uma instância e zeram ao reiniciar.
- O resgate de herança é imediato; o dono só é avisado depois.
- Quem vazar a CCH de uma conta com herança ativa pode revogar o dispositivo do dono.
- O Kill Switch exige a CCP inteira: quem perde o dispositivo **e** a CCP não consegue revogar sozinho.
- O dispositivo virtual guarda a chave privada no navegador: é só para demonstração.
