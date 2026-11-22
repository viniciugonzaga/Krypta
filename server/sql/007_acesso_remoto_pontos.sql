-- ============================================================
-- KRYPTA — Migração 007: senha de acesso ao cofre (outros aparelhos)
--                        e pontos de restauração do cofre
-- Banco: MySQL / MariaDB (XAMPP local e Hostinger)
--
-- COMO RODAR (phpMyAdmin): banco "krypta" → aba "SQL" → cole → "Executar".
-- Rode UMA vez só (depois da 006).
--
-- O que muda:
--   • cofre_acesso_remoto: o "envelope da senha de acesso" (PIN de 6 dígitos ou
--     senha) — a chave do cofre cifrada com uma chave que só o NAVEGADOR monta,
--     juntando o PIN + um segredo do servidor que só é liberado depois que o
--     PIN é conferido (máx. 5 tentativas). O servidor nunca vê o PIN nem a chave.
--   • cofre_pontos: cópias CIFRADAS do cofre ("salvar estado") para reverter
--     alterações. Criar, restaurar e apagar exigem a CCP.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `cofre_acesso_remoto` (
  `user_id` VARCHAR(36) NOT NULL,
  `tipo` ENUM('PIN','SENHA') NOT NULL DEFAULT 'PIN',
  `salt` VARCHAR(64) NOT NULL,
  `hash_prova` VARCHAR(255) NULL DEFAULT NULL,
  `envelope` TEXT NULL DEFAULT NULL,
  `segredo_cifrado` TEXT NOT NULL,
  `tentativas` INT NOT NULL DEFAULT 0,
  `bloqueado` TINYINT(1) NOT NULL DEFAULT 0,
  `ativo` TINYINT(1) NOT NULL DEFAULT 0,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_uso` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_acesso_remoto_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cofre_pontos` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `nome` VARCHAR(60) NOT NULL,
  `payload_cifrado` MEDIUMBLOB NOT NULL,
  `versao_origem` INT UNSIGNED NOT NULL,
  `automatico` TINYINT(1) NOT NULL DEFAULT 0,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cofre_pontos_user` (`user_id`),
  CONSTRAINT `fk_cofre_pontos_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
