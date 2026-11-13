# Contrato da API Krypta (v0.1)

Base URL local: `http://localhost:3000`. O comportamento descrito aqui é o que os scripts `scripts/test-*.js` verificam. Se o código divergir deste documento, avisem: um dos dois está errado.

## 1. Convenções

- Corpo e respostas em JSON (`Content-Type: application/json` obrigatório nos POST/PUT). Todo erro tem o formato `{ "erro": "mensagem" }`.
- Autenticação: `Authorization: Bearer <jwt>` (HS256). Há dois escopos, e cada rota aceita só os que declara:
  - `hardware` (15 min): emitido por `/auth/verify`, depois que o ESP32 prova a posse da chave. Abre as rotas do cofre.
  - `admin_web` (30 min): emitido por `/auth/admin-login`, com email e senha do portal. Nunca abre as rotas do cofre.
- Dados binários trafegam em **base64 padrão** (com `+`, `/` e padding `=`).
- Todo token `hardware` fica preso à `public_key` com que foi emitido: a cada requisição o servidor confere que ela ainda é a chave vigente da conta (senão 401 `Sessão do dispositivo não é mais válida.`). Kill Switch, resgate de herança e recuperação de hardware invalidam na hora as sessões do dispositivo antigo. As rotas de dados leem também o status da conta no banco a cada requisição.
- Erros globais: 400 `JSON malformado.`, 413 corpo acima de 2 MB, 404 `Rota não encontrada.`, 500 `Erro interno no servidor.` (sem detalhes).
- CORS: só o portal web é navegador. Para o portal acessar a API, a origem do front precisa estar em `CORS_ORIGINS` no servidor; por padrão nenhuma origem é liberada. Desktop e Mobile não são afetados. Métodos liberados: GET, POST e PUT; headers: `Content-Type` e `Authorization`.
- CORS: só o portal web é navegador. Para o portal acessar a API, a origem do front precisa estar em `CORS_ORIGINS` no servidor; por padrão nenhuma origem é liberada. Desktop e Mobile não são afetados. Métodos liberados: GET, POST e PUT; headers: `Content-Type` e `Authorization`.
- Limites por IP, em memória (zeram ao reiniciar o servidor), respondem 429: `/auth/admin-login` 10 por 15 min; `/auth/challenge` e `/auth/verify` 30 por minuto; `/recovery/owner`, `/account/kill-switch` e `/recovery/hardware` 20 por 15 min (contador compartilhado); `/account/rotate-ccp` 20 por 15 min (contador próprio); `/inheritance/enable` e `/inheritance/disable` 20 por 15 min (contador próprio); `/inheritance/claim` 10 por 15 min; `POST /accounts` 30 por hora; `/hardware/pair` e `/recovery/complete` 30 por 15 min (contador compartilhado).

| Campo | Formato |
|---|---|
| `public_key` | Ed25519, 32 bytes, base64 (44 caracteres) |
| `nonce` | 32 bytes aleatórios, base64 |
| `assinatura` | Ed25519 detached, 64 bytes, base64 |
| `prova_cont_dono` | 32 bytes, base64 (44 caracteres). Ver seção 4 |
| `payload_cifrado` | 1 byte a 1 MB decodificado, base64 |
| `version_counter` | inteiro de 1 a 2147483647 |
| ids | UUID |

**Objeto conta** (devolvido por `GET /accounts/:id` e pelas rotas de pareamento e recuperação):

~~~json
{ "id": "uuid", "email": "...", "public_key": "base64 ou null", "status": "ATIVA",
  "ultimo_sincronismo": "2026-11-04T22:00:00.000Z", "criado_em": "..." }
~~~

`public_key` é `null` em `PENDENTE_PAREAMENTO` e em `REVOGADA`.

## 2. Estados da conta

| De | Ação | Para |
|---|---|---|
| (criação) | `POST /accounts` | `PENDENTE_PAREAMENTO` |
| `PENDENTE_PAREAMENTO` | `POST /hardware/pair` | `ATIVA` |
| `ATIVA` | `POST /recovery/owner` | `RECUPERACAO_LOCAL` |
| `RECUPERACAO_LOCAL`, `RECUPERACAO_HARDWARE` | `POST /recovery/complete` | `ATIVA` |
| `ATIVA`, `RECUPERACAO_LOCAL`, `RECUPERACAO_HARDWARE` | `POST /account/kill-switch` | `REVOGADA` |
| `REVOGADA` | `POST /recovery/hardware` | `RECUPERACAO_HARDWARE` |
| `ATIVA`, `RECUPERACAO_LOCAL`, `RECUPERACAO_HARDWARE`, `REVOGADA` | `POST /inheritance/claim` | `RECUPERACAO_HARDWARE` |

| Estado | Login por hardware | `PUT /backup` | `GET /backup` |
|---|---|---|---|
| `PENDENTE_PAREAMENTO` | não | não | não |
| `ATIVA` | sim | sim | **não** (o ESP32 é a fonte da verdade, RN04) |
| `RECUPERACAO_LOCAL` | sim | sim | sim |
| `RECUPERACAO_HARDWARE` | sim | não | sim |
| `REVOGADA` | não | não | não |

## 3. Endpoints

### GET /health
Público. 200 `{ "status": "ok", "message": "..." }`.

### POST /accounts
Cria a conta pelo portal, sem hardware. Público.

Body: `{ "email": "...", "senha_administrativa": "mínimo 8 caracteres" }`

201:

~~~json
{ "id": "uuid", "email": "...", "status": "PENDENTE_PAREAMENTO", "criado_em": "..." }
~~~

Erros: 400 email ou senha inválidos; 409 email já cadastrado.

### POST /auth/admin-login
Login do portal. Público. Body: `{ "email": "...", "senha_administrativa": "..." }`

200: `{ "token": "jwt" }` (escopo `admin_web`, 30 min).
Erros: 400 campo ausente; 401 `Credenciais inválidas.` (mesma mensagem para email inexistente e senha errada); 429.

### GET /accounts/:id
Token `admin_web` ou `hardware`. Uma conta só consulta a si mesma. 200: objeto conta.
Erros: 400 id não é UUID; 401 token ausente ou inválido; 403 escopo não permitido ou id de outra conta; 404 conta não existe.

### POST /hardware/pair
Primeiro pareamento. Token `admin_web`; a conta vem do token, nunca do body.

Body: `{ "public_key": "base64", "prova_cont_dono": "base64" }`

200: objeto conta com `status: "ATIVA"`.
Erros: 400 `public_key` ou prova malformadas (CCP em texto claro cai aqui); 401 token; 403 escopo; 404 conta; 409 conta não está `PENDENTE_PAREAMENTO`, chave já vinculada a outra conta (RN01) ou chave revogada.

### POST /auth/challenge
Público. Body: `{ "public_key": "base64" }`

200: `{ "nonce": "base64" }`. O nonce vale 60 s e é de uso único. Pedir outro challenge para a mesma chave invalida o anterior.
Erros: 400 `public_key` malformada; 404 chave desconhecida (inclui chaves revogadas); 429.

### POST /auth/verify
Público. Body: `{ "public_key": "base64", "assinatura": "base64" }`

200: `{ "token": "jwt" }` (escopo `hardware`, 15 min). Efeito colateral: renova o prazo de inatividade (seção 5).
Erros: 400 `public_key` ou assinatura malformadas; 401 nonce ausente, expirado ou já usado, ou assinatura inválida (uma tentativa falha também queima o nonce); 404 chave desconhecida; 429.

### GET /auth/session
Token `hardware`. 200: `{ "contaId": "uuid", "tipo": "hardware", "expira_em": "ISO" }`. Confere o token e que a `public_key` da sessão ainda é a vigente da conta; não olha o status.
Erros: 401; 403 escopo.

### PUT /backup
Token `hardware`. Estados: `ATIVA`, `RECUPERACAO_LOCAL`.

Body: `{ "version_counter": 12, "payload_cifrado": "base64" }`

200: `{ "version_counter": 12, "atualizado_em": "ISO" }`. Renova o prazo de inatividade.
Erros: 400 campo inválido; 401; 403 escopo ou estado da conta; 404 conta; 409 `version_counter` menor ou igual ao armazenado (anti-rollback); 413 corpo acima de 2 MB.

### GET /backup
Token `hardware`. Estados: `RECUPERACAO_LOCAL`, `RECUPERACAO_HARDWARE`.

200: `{ "payload_cifrado": "base64", "version_counter": 12, "atualizado_em": "ISO" }`
Erros: 401; 403 escopo ou estado (em `ATIVA` sempre 403); 404 sem backup.

### POST /recovery/owner
Esqueci a senha mestre. Token `hardware` (o dono precisa estar com o dispositivo). Body: `{ "prova_cont_dono": "base64" }`

200: objeto conta com `status: "RECUPERACAO_LOCAL"`. A `public_key` não muda.
Erros: 400 prova malformada; 401 token ausente ou prova incorreta; 403 escopo; 409 conta não está `ATIVA`; 429.

### POST /recovery/complete
Encerra uma recuperação. Token `hardware`, sem body. Chamar **depois** de gravar o resultado no ESP32 (RN07).

200: objeto conta com `status: "ATIVA"`.
Erros: 401; 403 escopo; 409 não há recuperação em andamento.

### POST /account/kill-switch
Perdi o hardware. Token `admin_web` (o dispositivo antigo pode estar perdido). Body: `{ "prova_cont_dono": "base64" }`

200: objeto conta com `status: "REVOGADA"` e `public_key: null`. A chave antiga fica banida para sempre, em qualquer conta.
Erros: 400 prova malformada; 401 token ausente ou prova incorreta; 403 escopo; 409 estado não permite revogar; 429.

### POST /recovery/hardware
Vincula um novo dispositivo a uma conta `REVOGADA`. Token `admin_web`. Body: `{ "public_key": "base64 do novo ESP32", "prova_cont_dono": "base64" }`

200: objeto conta com `status: "RECUPERACAO_HARDWARE"`.
Erros: 400 `public_key` ou prova malformadas; 401; 403 escopo; 409 conta não está `REVOGADA`, chave revogada ou chave vinculada a outra conta; 429.

### POST /account/rotate-ccp
Troca a CCP e envia, na mesma operação, o backup com o novo Envelope da CCP. Token `hardware`. Estado: `ATIVA`.

Body:

~~~json
{ "prova_cont_dono_atual": "base64", "prova_cont_dono_nova": "base64",
  "version_counter": 13, "payload_cifrado": "base64" }
~~~

200: `{ "version_counter": 13, "atualizado_em": "ISO" }`. Renova o prazo de inatividade.
Erros: 400 provas malformadas, provas iguais ou campo do backup inválido; 401 token ausente ou prova atual incorreta; 403 escopo; 404 conta; 409 conta não está `ATIVA`, `version_counter` menor ou igual ao armazenado, ou chave alterada durante a operação; 413; 429.

Tudo ou nada: se houver qualquer erro, nem a prova nem o backup mudam, e repetir a chamada é seguro.

Obrigações do cliente nesta rotação:
1. Gerar a nova CCP, exibi-la e só seguir depois que o usuário a anotar e confirmar (por exemplo, pedindo para redigitá-la).
2. Derivar a prova e a chave do envelope como na seção 4 e reconstruir o Envelope da CCP no `vault.enc`.
3. **Verificar localmente que a nova CCP abre o novo envelope antes de chamar.** O servidor não consegue conferir isso; um erro aqui tranca o usuário fora da recuperação.
4. Gravar no ESP32 (RN07) e só então chamar o endpoint, com `version_counter` + 1.
5. Descartar a CCP antiga somente depois do 200. Em qualquer falha, a prova antiga continua válida no servidor.

### POST /inheritance/enable
Ativa a herança (opt-in, RN10) ou troca a CCH, e a CCH anterior deixa de valer. Token `hardware`. Estado: `ATIVA`.

Body:

~~~json
{ "prova_cont_dono_atual": "base64", "prova_cont_herdeiro": "base64",
  "version_counter": 14, "payload_cifrado": "base64 do vault.enc com o Envelope do Herdeiro" }
~~~

200: `{ "version_counter": 14, "atualizado_em": "ISO" }`. Renova o prazo de inatividade.
Erros: 400 provas malformadas ou iguais entre si, ou campo do backup inválido; 401 token ausente, sessão do dispositivo inválida ou prova do dono incorreta; 403 escopo; 404 conta; 409 conta não está `ATIVA`, `version_counter` menor ou igual ao armazenado, ou chave alterada durante a operação; 413; 429.

Tudo ou nada: qualquer erro deixa a CCH e o backup como estavam.

### POST /inheritance/disable
O dono retira o consentimento. Token `hardware`. Estado: `ATIVA`.

Body: `{ "prova_cont_dono_atual": "base64", "version_counter": 15, "payload_cifrado": "base64 do vault.enc sem o Envelope do Herdeiro" }`

200 e erros: iguais ao `enable`.

### POST /inheritance/claim
Resgate pelo herdeiro. **Público** (o herdeiro não tem conta no portal); a prova da CCH é a autenticação.

Body: `{ "conta_id": "uuid", "prova_cont_herdeiro": "base64", "public_key": "base64 do dispositivo do herdeiro" }`

200: `{ "id": "uuid", "status": "RECUPERACAO_HARDWARE", "public_key": "base64" }` (sem email). Numa única operação: o dispositivo do dono é revogado (chave banida para sempre), o do herdeiro é vinculado e a CCH é consumida (uso único). Depois: login por hardware com o novo dispositivo → `GET /backup` → gravar no ESP32 → `POST /recovery/complete`.
Erros: 400 campo malformado; 401 `Credenciais de herança inválidas.` (mesma resposta para conta inexistente, herança desativada, CCH errada ou já usada); 409 estado da conta, chave igual à do dono, chave revogada ou já vinculada a outra conta; 429.

## 4. Obrigações do cliente (Zero-Knowledge)

O servidor não consegue verificar nada disto. Se o cliente errar, a segurança cai sem nenhum erro visível.

1. **CCP.** Gerada pelo app com pelo menos 128 bits de entropia, mostrada uma vez ao usuário e nunca enviada. O usuário nunca digita nem escolhe a CCP de cadastro.
2. **Prova da CCP, em dois passos (proposta, a congelar):**
   - `master = Argon2id(CCP, salt = SHA-256("krypta-ccp-v1:" + conta_id), m = 64 MiB, t = 3, p = 1, saída = 32 bytes)`
   - `prova_cont_dono = base64(HKDF-SHA256(master, info = "krypta-prova-v1", 32 bytes))`
3. **Separação obrigatória de chaves.** A chave que cifra o Envelope da CCP no `vault.enc` sai do **mesmo `master`**, mas com `info = "krypta-envelope-ccp-v1"`. A prova nunca pode ser usada como chave de cifra, nem o `master` enviado ao servidor. A prova chega ao servidor, e o servidor guarda o backup que contém o envelope: se as chaves coincidissem, ele abriria o cofre.
4. **Parâmetros congelados.** Desktop e Mobile derivam o mesmo valor. Mudar qualquer parâmetro exige nova versão do rótulo (`v2`) e nova CCP para todos os usuários. Medir no celular mais fraco antes de congelar.
5. **A prova é uma credencial estática.** Quem a capturar pode acionar recuperação e Kill Switch daquela conta. Nunca registrar o corpo dessas requisições em log, e usar sempre HTTPS fora do ambiente local.
6. **Assinatura do nonce.** A app decodifica o nonce de base64 e entrega os 32 bytes ao ESP32, que assina esses bytes. Assinar a string base64 falha com 401.
7. **`version_counter`.** Começa em 1 no pareamento. A cada Salvar: ler o valor do cabeçalho, somar 1, gravar no ESP32 e só depois chamar `PUT /backup` (RN07). Um 409 significa que o servidor já tem versão igual ou mais nova.

## 4.1 Obrigações do cliente na herança

1. **CCH.** Gerada pelo app com pelo menos 128 bits, independente da CCP, nunca escolhida nem digitada. O dono a entrega ao herdeiro como kit legível por máquina (QR code ou arquivo) contendo `conta_id` e a CCH.
2. **Derivações.** `master_h = Argon2id(CCH, salt = SHA-256("krypta-cch-v1:" + conta_id), mesmos parâmetros da seção 4)`; `prova_cont_herdeiro = base64(HKDF-SHA256(master_h, info = "krypta-prova-cch-v1", 32 bytes))`; chave do Envelope do Herdeiro = `HKDF-SHA256(master_h, info = "krypta-envelope-cch-v1")`. A prova nunca pode ser usada como chave de cifra: o servidor a recebe e guarda o backup que contém o envelope.
3. **Conferir antes de gravar.** Antes de chamar `/inheritance/enable`, abrir localmente o Envelope do Herdeiro novo com a CCH nova. O servidor não consegue conferir isso.
4. **Resgate.** O herdeiro precisa de um dispositivo Krypta novo, que gera o par Ed25519 e envia só a `public_key`.

## 5. Inatividade (RN11)

- O prazo é de 365 dias sem atividade. `POST /auth/verify` e `PUT /backup` bem-sucedidos renovam o prazo. Login no portal e consultas não renovam.
- A rotina roda a cada 6 horas e avisa por email em 30 dias, 15 dias e 48 horas antes. O envio usa o SMTP configurado no servidor (`SMTP_*`). **Sem SMTP configurado nenhuma conta é excluída**: a exclusão exige o aviso de 48 h registrado, e o aviso só é registrado depois que o envio é confirmado.
- A exclusão apaga a conta, os hashes de contingência e o backup. Só a `public_key` revogada permanece, para que chaves banidas não voltem.
- Contas `REVOGADA` também expiram em 365 dias.

## 6. Fluxos

**Onboarding:** `POST /accounts` → `POST /auth/admin-login` → o app gera o par Ed25519 no ESP32 e a CCP → `POST /hardware/pair`. A conta fica `ATIVA`.

**Uso diário:** `POST /auth/challenge` → ESP32 assina → `POST /auth/verify` → após cada Salvar, `PUT /backup`.

**Esqueci a senha mestre:** login por hardware → `POST /recovery/owner` → `GET /backup` → o app abre o Envelope da CCP localmente e cria um novo Envelope do Titular → grava no ESP32 → `PUT /backup` com versão + 1 → `POST /recovery/complete`.

**Perdi o hardware:** `POST /auth/admin-login` → `POST /account/kill-switch` → `POST /recovery/hardware` com a chave do novo ESP32 → login por hardware com o novo ESP32 → `GET /backup` → grava no novo ESP32 → `POST /recovery/complete` → `PUT /backup` volta a funcionar.

**Trocar a CCP (recomendado depois de recuperar hardware):** login por hardware → o app gera e exibe a nova CCP, e o usuário a anota → o app reconstrói o Envelope da CCP e confere localmente → grava no ESP32 → `POST /account/rotate-ccp` com a prova atual, a nova e o `vault.enc` com versão + 1 → só então invalida o papel antigo.

**Herança:** o dono, com o dispositivo, gera a CCH, monta o Envelope do Herdeiro e chama `POST /inheritance/enable` com o `vault.enc` novo → o dono entrega o kit ao herdeiro → o herdeiro, com um dispositivo novo, chama `POST /inheritance/claim` → login por hardware → `GET /backup` → abre o Envelope do Herdeiro localmente → grava no ESP32 → `POST /recovery/complete`.

## 7. Não implementado e limitações conhecidas

- Herança Digital sem cadastro nominal de herdeiros (RF11), sem prazo de espera: o resgate é imediato, e o dono é avisado por email (se houver SMTP configurado) só depois que ele acontece.
- Quem vazar a CCH de uma conta com herança ativa pode revogar a conta (ataque de disponibilidade) e baixar o backup, que continua cifrado. Depois do resgate o dispositivo do herdeiro opera a conta; ela só volta ao dono com Kill Switch e recuperação de hardware, usando a prova da CCP.
- O Módulo 7 prevê confirmação por email para ações sensíveis do portal. Hoje o Kill Switch e o resgate de herança só **avisam** o dono por email depois de executados; não pedem confirmação antes.
- Recuperar ou trocar a senha administrativa do portal.
- O Kill Switch exige a prova completa da CCP. O Módulo 7 fala em "trecho", mas o servidor só guarda o hash da prova inteira. Quem perde hardware e CCP não consegue revogar sozinho.
- `POST /accounts` revela quais emails existem (409).
- Uma recuperação aberta e nunca concluída não tem prazo para expirar.
- O servidor guarda só a versão mais recente do backup e não valida o conteúdo (Zero-Knowledge). Um ESP32 roubado, antes do Kill Switch, pode subir um backup lixo com versão alta.
