# Banco de dados (`server/sql/`)

MySQL 8 ou MariaDB 10.4+ (XAMPP no PC, Hostinger em produção). Charset `utf8mb4`.

## Ordem
| Arquivo | O que cria / muda |
|---|---|
| `001_base.sql` | Estrutura base: `users`, `sessions`, `audit_logs` |
| `002_cofre_hardware.sql` | Cofre zero-knowledge: estado do cofre, chave pública, provas da CCP/CCH, `backups`, `chaves_revogadas`, nonces |
| `003_pedidos_dispositivos.sql` | `pedidos` (plano e produto) e `dispositivos` comprados |
| `004_hardware_real.sql` | ESP32 de verdade: chave anunciada, último contato |
| `005_modo_mobile_onboarding.sql` | `sessions.cliente` e respostas do questionário de boas-vindas |
| `006_cofre_multiaparelho_abandono.sql` | Código para abandonar o cofre e motivo `ABANDONO` |
| `007_acesso_remoto_pontos.sql` | `cofre_acesso_remoto` (senha de acesso) e `cofre_pontos` (pontos de restauração) |

## Como rodar
- **Banco novo:** crie o banco `krypta` no phpMyAdmin → aba **SQL** → rode **001 → 007**, um de cada vez, na ordem.
- **Banco que já existe:** rode só as migrações que ainda não rodou. Cada uma roda **uma vez só**.

## Tabelas
| Tabela | Guarda |
|---|---|
| `users` | Conta, plano, status, estado do cofre, chave pública do dispositivo, hashes das provas |
| `sessions` | Sessões do site (refresh token, `jti`, de onde: web/mobile/pwa/desktop) |
| `audit_logs` | Histórico de segurança da conta e do cofre |
| `backups` | `vault.enc` **cifrado** + `version_counter` |
| `chaves_revogadas` | Chaves banidas (Kill Switch, herança, abandono) |
| `pedidos`, `dispositivos` | Loja e unidades físicas |
| `cofre_acesso_remoto` | Prova do PIN, envelope do PIN, segredo do servidor cifrado, tentativas |
| `cofre_pontos` | Cópias cifradas do cofre (pontos de restauração) |

> Backup do banco sem o `PASSWORD_PEPPER` não serve para conferir CCPs. Guarde os dois, em lugares separados.
