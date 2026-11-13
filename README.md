# Krypta: API

Backend (Node.js, Express e PostgreSQL) do cofre digital Krypta. Arquitetura Zero-Knowledge: o servidor guarda apenas dados cifrados no cliente e valida assinaturas Ed25519. Ele nunca vê senhas, chaves de decifragem nem a CCP/CCH em texto claro. O ESP32 é a fonte da verdade e o banco é um espelho cifrado.

O contrato completo (endpoints, estados, obrigações do cliente) está em [`docs/contrato-api.md`](docs/contrato-api.md).

## Requisitos

- Node.js 20 ou superior (usado em desenvolvimento com 24)
- PostgreSQL 13 ou superior (usa `gen_random_uuid()` nativo)
- `openssl`, para gerar segredos

## Setup do zero

~~~bash
npm install

SENHA=$(openssl rand -hex 16)
sudo -u postgres psql -c "CREATE USER krypta_user WITH PASSWORD '$SENHA';"
sudo -u postgres psql -c "CREATE DATABASE krypta_db OWNER krypta_user;"
PGPASSWORD=$SENHA psql -h localhost -U krypta_user -d krypta_db -v ON_ERROR_STOP=1 -f src/db/schema.sql

# cria o .env (se ele já existir, NÃO rode esta linha)
printf 'DATABASE_URL=postgres://krypta_user:%s@localhost:5432/krypta_db\nJWT_SECRET=%s\n' "$SENHA" "$(openssl rand -hex 32)" > .env
unset SENHA

npm run dev
~~~

## Variáveis de ambiente (`.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | URL de conexão do PostgreSQL |
| `JWT_SECRET` | sim | Hex de 64+ caracteres (`openssl rand -hex 32`). O servidor não sobe sem ele |
| `PORT` | não | Porta HTTP (padrão 3000) |
| `CORS_ORIGINS` | não | Origens do portal web liberadas no CORS, separadas por vírgula. Vazio = nenhuma |
| `TRUST_PROXY` | não | Número de proxies reversos confiáveis à frente da API. Só configure se houver proxy |
| `RATE_LIMIT_MULT` | não | Só desenvolvimento: multiplica os limites de requisição (ignorado com `NODE_ENV=production`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | não | Envio de email. Sem `SMTP_HOST` e `SMTP_FROM` o envio fica desativado e **nenhuma conta é excluída por inatividade** |
| `SMTP_ONLY_TO` | não | Fora de produção, só estes endereços recebem email (separados por vírgula). Sem isso o email fica desativado fora de produção |
| `NODE_ENV` | não | `production` desativa o multiplicador de limites e libera o email para qualquer destinatário |

## Produção

~~~bash
NODE_ENV=production npm start
~~~

Use HTTPS na frente da API. As provas de contingência (`prova_cont_dono`, `prova_cont_herdeiro`) são credenciais estáticas: nunca registre em log o corpo das requisições.

## Testes

As suítes testam a API em execução, usando um simulador de hardware (par Ed25519 real, gerado com `tweetnacl`).

~~~bash
npm run dev                                  # em um terminal
node scripts/simulate-hardware.js setup      # uma vez: cria conta e chaves em scripts/.sim-keys.json
npm run test:all                             # em outro terminal
~~~

- Com `RATE_LIMIT_MULT=20` no `.env` as suítes podem rodar várias vezes seguidas. Sem ele, reinicie o servidor (zera os contadores) entre execuções.
- `test:hardening` só confere a origem liberada se `CORS_ORIGINS` estiver preenchido; senão mostra `PULADO`.
- **As suítes escrevem no banco do `.env` e a de TTL exclui contas inativas há mais de 365 dias. Use um banco de desenvolvimento, nunca dados reais.**
- Os testes de email usam transporte falso. Nenhum email real é enviado.

### Teste com SMTP real

Preencha `SMTP_*` e `SMTP_ONLY_TO` (seu endereço) no `.env`, reinicie e rode:

~~~bash
node -e "require('./src/services/notificacaoService').enviarAvisoInatividade({contaId:'x',email:process.argv[1],nivel:'D30',diasRestantes:30}).then(console.log)" seu@email.com
~~~

Deve imprimir `true` e a mensagem chegar na caixa de entrada.

## Estrutura

~~~
src/
  config/env.js            valida o .env na inicialização
  routes/ controllers/     camada HTTP
  services/                regras de negócio
  repositories/            SQL puro (sem ORM)
  middlewares/             autenticação por escopo, rate limit, erros
  jobs/ttlJob.js           rotina de inatividade (RN11), a cada 6 horas
  utils/nonceStore.js      nonces do challenge-response, em memória
  db/                      connection.js, schema.sql, migrations/
scripts/                   simulador de hardware e suítes de teste
docs/contrato-api.md       contrato da API
~~~

## Banco de dados

`src/db/schema.sql` é a fonte para criar um banco do zero. `src/db/migrations/` é o histórico das alterações. Depois de criar uma migration, regenere o schema:

~~~bash
sudo -u postgres pg_dump -d krypta_db --schema-only --no-owner --no-privileges > src/db/schema.sql
~~~

## Segurança operacional

- Nunca versionar `.env` nem `scripts/.sim-keys.json` (já estão no `.gitignore`).
- Os limites de requisição e os nonces ficam em memória: valem para instância única e zeram ao reiniciar.
