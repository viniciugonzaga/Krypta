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

Pré-requisitos: XAMPP com MySQL ligado, migrações `server/sql/001` a `007` aplicadas,
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

## 8. Hospedagem (feita na v1.2.1)

O site está em `https://krypta.website` (Hostinger Premium, montado do GitHub) e a API em
`https://krypta-api.onrender.com/api` (Render Free), usando o MySQL da Hostinger com acesso remoto.
Detalhes: [PRODUCAO.md](PRODUCAO.md) · passo a passo: [HOSPEDAGEM.md](HOSPEDAGEM.md).

- [x] Banco de produção novo, migrações 001 a 007, MySQL remoto só para esse banco
- [x] `NODE_ENV=production`, `TRUST_PROXY=1`, `DB_*` da Hostinger (no Render)
- [x] **Novos** `JWT_SECRET` e `PASSWORD_PEPPER` só para produção
- [x] `CORS_ORIGIN=https://krypta.website` (o app desktop é liberado pelo próprio servidor)
- [x] HTTPS no site e na API
- [ ] E-mail real: `BREVO_API_KEY` no Render (o Render Free bloqueia SMTP)
- [ ] Trocar o `GOOGLE_CLIENT_SECRET` antes de ligar o login social
- [ ] Remover ou esconder o dispositivo virtual em produção quando o app do ESP32 existir

---

## 9. Fases

Concluídas: telas mobile + PWA, app desktop (Tauri) com download direto, firmware ESP32 fase 1,
cofre em vários aparelhos (v1.1.0/v1.2.0) e hospedagem (v1.2.1).

Próximas:
1. **Firmware fase 2** — cofre dentro do ESP32 e app conversando com a placa por USB/Bluetooth
   (`virtualDevice.ts` vira uma ponte para o hardware).
2. **Login social** — Google/GitHub/Apple com as chaves de produção.
3. **Pagamento real** — hoje é simulado.

## 10. Limitações conhecidas (herdadas do contrato da API)

- Nonces e limites de tentativa ficam em memória: valem para uma instância e zeram ao reiniciar.
- O resgate de herança é imediato; o dono só é avisado depois.
- Quem vazar a CCH de uma conta com herança ativa pode revogar o dispositivo do dono.
- O Kill Switch exige a CCP inteira: quem perde o dispositivo **e** a CCP não consegue revogar sozinho.
- O dispositivo virtual guarda a chave privada no navegador: é só para demonstração.

## 11. Planos, compras e dispositivos (migração 003)

**Regras dos planos** — `server/src/config/planos.ts` (o servidor é quem bloqueia; o front só mostra):

| Recurso | Free | Pro |
|---|---|---|
| Cofre com dispositivo de software | ✔ | ✔ |
| Recuperação local e troca da CCP | ✔ | ✔ |
| Espaço do backup cifrado | 64 KB | 1 MB |
| Dispositivo físico (serial comprado) | ✘ | ✔ |
| Kill Switch | ✘ | ✔ |
| Herança digital | ✘ | ✔ |
| Alertas de acesso (`GET /api/vault/activity`) | ✘ | ✔ |

Recurso bloqueado → `403` com `details.motivo = 'PLANO'`. Backup acima do limite → `413`.
O Pro só é ativado por compra: `POST /api/plans/change` com `pro` responde `402`.

**Tabelas novas** (`server/sql/003_pedidos_dispositivos.sql`): `pedidos` e `dispositivos`;
`users` ganha `tipo_dispositivo` (`SOFTWARE`/`FISICO`) e `dispositivo_id`.

**Rotas novas**

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/orders` | compra simulada (plano Pro ou dispositivo); preço calculado no servidor |
| GET | `/api/orders` | pedidos do usuário com os seriais de cada um |
| GET | `/api/devices` | dispositivos comprados e o status de cada um |
| POST | `/api/devices/:serial/receive` | confirma o recebimento (`EM_TRANSPORTE → DISPONIVEL`) |
| GET | `/api/vault/activity` | últimos 25 eventos de segurança do cofre (Pro) |

`POST /api/hardware/pair` e `/api/contingency/recovery-hardware` aceitam `dispositivo_serial` opcional.

**Ciclo de um dispositivo físico:** `EM_TRANSPORTE` → (Recebi) → `DISPONIVEL` → (Parear) → `PAREADO`
→ (Kill Switch ou herança) → `REVOGADO`. Cada conta tem **um** cofre e **um** dispositivo pareado por vez.

**Telas novas:** `/como-funciona` (pública), `/compras` (logado). O kit do herdeiro traz o link
`/heranca#kit=<conta_id>:<CCH>`; o fragmento `#` não é enviado ao servidor.

**Teste:** `npm run sim -- planos <email> <senha>` (ou `testar-tudo`, que já inclui).

## 12. Revisão do front (conta, assinatura e navegação)

**Rotas novas no servidor**

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/plans/cancel` | cancela o Pro com a senha do site; pedidos de plano viram `CANCELADO` |
| POST | `/api/users/me/sessions/revoke` | encerra todas as sessões do site |
| PUT | `/api/users/me` com `{ avatar }` | **v1.4.0** — foto de perfil: `data:image/jpeg;base64,...` (o app manda 320×320), `kody:<1-12>:#RRGGBB` (avatar do Kody com cor de fundo) ou `null` (anônimo). `preset:...` da v1.3.0 ainda é aceito. Volta em `avatarUrl` |
| POST | `/api/contact` | formulário de Contato e newsletter → e-mail do suporte (`SUPPORT_EMAIL`) |

**Comportamentos**
- Rota protegida sem login → `/login` guarda a página (e o carrinho) e volta para ela depois.
- Sessão vencida de vez → tela "Sessão expirada" (`/error`, código 419).
- `/vault` (tela de exemplo) → redireciona para `/device` (o cofre real).
- `/suspended` usa a tela de erro do site (423 suspensa, 410 revogada) com "Sair da conta".
- Perfil: editar nome/e-mail, assinatura (cancelar), trocar senha, sair de tudo, atividade, excluir conta.
- Configurações: só itens reais (tema, idioma, atalhos com o estado real da herança e do Kill Switch).
- Excluir conta solta `users.dispositivo_id` antes do DELETE (ciclo de chaves com `dispositivos`).

**Onde o plano é conferido (servidor):** `exigirRecurso` em herança (ativar/trocar), Kill Switch,
alertas, pareamento com `dispositivo_serial`; `exigirEspaco` em todo envio de backup.
O Pro só entra por `POST /api/orders` (preço calculado no servidor). Pagamento ainda é simulado:
com um gateway real, o pedido só deve ser aprovado depois da confirmação do provedor (webhook).

## 13. Hardware real (ESP32) — fase 1 (migração 004)

| Método | Rota | Quem chama | O que faz |
|---|---|---|---|
| POST | `/api/hardware/announce` | ESP32 (público) | `{ serial, public_key, assinatura }` → `{ estado, codigo }` |

- `assinatura` = Ed25519 dos bytes de `krypta-announce-v1:<serial>`.
- `estado`: `AGUARDANDO_PAREAMENTO` · `PAREADO` · `REVOGADO`.
- `codigo` = SHA-256(chave pública) → 4 primeiros bytes (big-endian) % 1.000.000 → `"123 456"`.
- A rota só **registra** a chave em `dispositivos.chave_anunciada`; quem pareia é o dono no site,
  depois de conferir o código (protege contra alguém que saiba o número de série).
- `POST /api/hardware/pair` aceita `backup_inicial` (cofre vazio cifrado no navegador com o envelope da CCP).
- `GET /api/devices` agora traz `conectado`, `chaveAnunciada`, `codigoConfirmacao`, `hardwareReal`, `ultimoContato`.
- Firmware: `hardware/krypta-esp32/krypta-esp32.ino`. Teste sem a placa: `npm run sim -- esp32`.

## 14. v1.2.0 — Cofre em qualquer aparelho, relatórios e pontos de restauração (migração 007)

Detalhes e análise de segurança: `docs/COFRE-REMOTO.md`.

| Método | Rota | Token | Corpo / resposta |
|---|---|---|---|
| GET | `/api/vault/remoto` | site | estado: `disponivel, configurado, bloqueado, tipo, salt, tentativasRestantes` |
| POST | `/api/vault/remoto/preparar` | site | `{ prova_cont_dono }` → `{ salt, segredo, payload_cifrado, version_counter }` |
| POST | `/api/vault/remoto/ativar` | site | `{ prova_cont_dono, prova_pin, envelope, tipo: 'PIN'\|'SENHA' }` |
| POST | `/api/vault/remoto/abrir` | site | `{ prova_pin }` → `{ token_cofre, envelope, segredo, salt, payload_cifrado, version_counter }` |
| POST | `/api/vault/remoto/remover` | site | `{ password }` |
| GET | `/api/vault/remoto/backup` | site + `X-Krypta-Cofre` | backup cifrado mais novo |
| PUT | `/api/vault/remoto/backup` | site + `X-Krypta-Cofre` | `{ version_counter, payload_cifrado, resumo }` (409 = conflito) |
| GET | `/api/vault/backup/sync?desde=N` | dispositivo | `{ atualizado, version_counter, payload_cifrado? }` |
| PUT | `/api/vault/backup` | dispositivo | aceita também `resumo: { adicionadas, editadas, removidas }` |
| GET | `/api/vault/pontos` | site | `{ pontos[], limite, manuais }` |
| POST | `/api/vault/pontos` | site | `{ prova_cont_dono, nome }` |
| POST | `/api/vault/pontos/:id/restaurar` | site | `{ prova_cont_dono }` |
| POST | `/api/vault/pontos/:id/apagar` | site | `{ prova_cont_dono }` |

- Senha de acesso: só Pro (`acessoRemoto`), só com o cofre ATIVA. 5 erros → bloqueio (423).
- Pontos: Free 2, Pro 20 (+ até 3 automáticos "Antes de restaurar…").
- Novas ações no relatório (`/api/vault/activity`): `VAULT_EDITED`, `VAULT_REMOTE_*`, `VAULT_SNAPSHOT_*`.
- Abandonar o cofre agora apaga também `cofre_acesso_remoto` e `cofre_pontos`.
