-- ============================================================
-- KRYPTA — Migração 002: Cofre por hardware (API zero-knowledge)
-- Banco: MySQL / MariaDB (XAMPP local e Hostinger)
--
-- COMO RODAR (phpMyAdmin):
--   1. Abra http://localhost/phpmyadmin
--   2. Clique no banco "krypta" na coluna da esquerda
--   3. Aba "SQL" → cole este arquivo inteiro → "Executar"
--   Rode UMA vez só. Se der erro no meio, me mande a mensagem.
--
-- O que muda:
--   • users ganha as colunas do cofre (estado_cofre, provas de
--     contingência e ultimo_sincronismo).
--   • public_key_ed25519 passa a guardar a chave REAL do ESP32
--     (antes o cadastro inventava uma chave falsa).
--   • Tabelas novas: backups, chaves_revogadas, avisos_ttl.
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 1) Limpa as chaves FALSAS que o cadastro antigo gerava
--    ("ESP32-XXXX" e "ed25519_xxxx" aleatórios). Nenhuma delas
--    era de um dispositivo de verdade.
-- ------------------------------------------------------------
UPDATE `users` SET `hardware_uuid` = NULL, `public_key_ed25519` = NULL;

-- ------------------------------------------------------------
-- 2) Colunas do cofre na tabela users
--    estado_cofre é SEPARADO de status:
--      status       → a conta no SITE (ATIVA, SUSPENSA, REVOGADA...)
--      estado_cofre → o COFRE/dispositivo (pareamento, recuperação,
--                     Kill Switch...). Um Kill Switch deixa o cofre
--                     REVOGADO, mas o dono continua entrando no site
--                     para vincular um dispositivo novo.
-- ------------------------------------------------------------
ALTER TABLE `users`
  MODIFY `public_key_ed25519` VARCHAR(64) NULL DEFAULT NULL,
  ADD COLUMN `estado_cofre` ENUM(
      'PENDENTE_PAREAMENTO',
      'ATIVA',
      'REVOGADA',
      'RECUPERACAO_LOCAL',
      'RECUPERACAO_HARDWARE'
    ) NOT NULL DEFAULT 'PENDENTE_PAREAMENTO' AFTER `public_key_ed25519`,
  ADD COLUMN `hash_cont_dono` VARCHAR(255) NULL DEFAULT NULL AFTER `estado_cofre`,
  ADD COLUMN `hash_cont_herdeiro` VARCHAR(255) NULL DEFAULT NULL AFTER `hash_cont_dono`,
  ADD COLUMN `ultimo_sincronismo` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `hash_cont_herdeiro`,
  ADD UNIQUE KEY `idx_users_public_key` (`public_key_ed25519`),
  ADD KEY `idx_users_ultimo_sincronismo` (`ultimo_sincronismo`);

-- ------------------------------------------------------------
-- 3) Backup cifrado do cofre (1 por conta). O servidor nunca
--    consegue abrir o conteúdo: só guarda os bytes cifrados.
--    MEDIUMBLOB aceita até 16 MB (o limite da API é 1 MB).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `backups` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `payload_cifrado` MEDIUMBLOB NOT NULL,
  `version_counter` INT UNSIGNED NOT NULL,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_backups_user` (`user_id`),
  CONSTRAINT `fk_backups_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4) Chaves banidas para sempre (Kill Switch e resgate de herança).
--    Uma chave revogada nunca mais pode ser pareada em conta nenhuma.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chaves_revogadas` (
  `id` VARCHAR(36) NOT NULL,
  `public_key` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(36) NULL DEFAULT NULL,
  `motivo` ENUM('KILL_SWITCH_DONO', 'KILL_SWITCH_HERDEIRO') NOT NULL,
  `revogada_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_chaves_revogadas_pk` (`public_key`),
  CONSTRAINT `fk_chaves_revogadas_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5) Avisos de inatividade enviados (30 dias, 15 dias, 48 horas).
--    O UNIQUE impede mandar o mesmo aviso duas vezes.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `avisos_ttl` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `nivel` ENUM('D30', 'D15', 'H48') NOT NULL,
  `sincronismo_ref` DATETIME NOT NULL,
  `enviado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_avisos_ttl_unico` (`user_id`, `nivel`, `sincronismo_ref`),
  CONSTRAINT `fk_avisos_ttl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Conferência: deve listar as colunas novas e as 3 tabelas.
-- ------------------------------------------------------------
SHOW COLUMNS FROM `users` LIKE '%cofre%';
SHOW TABLES LIKE 'backups';
SHOW TABLES LIKE 'chaves_revogadas';
SHOW TABLES LIKE 'avisos_ttl';
