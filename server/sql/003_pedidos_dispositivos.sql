-- ============================================================
-- KRYPTA — Migração 003: Pedidos e Dispositivos comprados
-- Banco: MySQL / MariaDB (XAMPP local e Hostinger)
--
-- COMO RODAR (phpMyAdmin):
--   1. Abra http://localhost/phpmyadmin
--   2. Clique no banco "krypta"
--   3. Aba "SQL" → cole este arquivo inteiro → "Executar"
--   Rode UMA vez só (depois da 002).
--
-- O que muda:
--   • pedidos      → toda compra (plano ou produto) fica registrada no servidor
--   • dispositivos → cada Dispositivo Krypta comprado vira uma unidade com
--                    número de série. É ele que o usuário pareia no cofre.
--   • users ganha tipo_dispositivo e dispositivo_id: de onde veio o
--     dispositivo pareado (software ou um dispositivo físico comprado).
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 1) Pedidos (compras simuladas, mas gravadas de verdade)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id` VARCHAR(36) NOT NULL,
  `codigo` VARCHAR(20) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `tipo` ENUM('PLANO', 'PRODUTO') NOT NULL,
  `item` VARCHAR(60) NOT NULL,
  `descricao` VARCHAR(255) NOT NULL,
  `quantidade` INT UNSIGNED NOT NULL DEFAULT 1,
  `valor_unitario` DECIMAL(10,2) NOT NULL,
  `valor_total` DECIMAL(10,2) NOT NULL,
  `periodo` ENUM('MENSAL', 'ANUAL') NULL DEFAULT NULL,
  `metodo` ENUM('card', 'pix', 'apple', 'google') NOT NULL,
  `parcelas` INT UNSIGNED NOT NULL DEFAULT 1,
  `cartao_final` VARCHAR(4) NULL DEFAULT NULL,
  `token_transacao` VARCHAR(64) NOT NULL,
  `endereco_entrega` VARCHAR(255) NULL DEFAULT NULL,
  `status` ENUM('APROVADO', 'CANCELADO') NOT NULL DEFAULT 'APROVADO',
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pedidos_codigo` (`codigo`),
  KEY `idx_pedidos_user` (`user_id`),
  CONSTRAINT `fk_pedidos_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2) Dispositivos físicos (1 linha por unidade comprada)
--    EM_TRANSPORTE → DISPONIVEL (recebido) → PAREADO → REVOGADO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dispositivos` (
  `id` VARCHAR(36) NOT NULL,
  `serial` VARCHAR(24) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `pedido_id` VARCHAR(36) NULL DEFAULT NULL,
  `modelo` VARCHAR(60) NOT NULL DEFAULT 'Dispositivo Krypta v1',
  `status` ENUM('EM_TRANSPORTE', 'DISPONIVEL', 'PAREADO', 'REVOGADO') NOT NULL DEFAULT 'EM_TRANSPORTE',
  `public_key` VARCHAR(64) NULL DEFAULT NULL,
  `entregue_em` DATETIME NULL DEFAULT NULL,
  `pareado_em` DATETIME NULL DEFAULT NULL,
  `revogado_em` DATETIME NULL DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_dispositivos_serial` (`serial`),
  KEY `idx_dispositivos_user` (`user_id`),
  CONSTRAINT `fk_dispositivos_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dispositivos_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3) Origem do dispositivo pareado na conta
--    tipo_dispositivo: SOFTWARE (cofre no app/navegador) ou FISICO (comprado)
-- ------------------------------------------------------------
ALTER TABLE `users`
  ADD COLUMN `tipo_dispositivo` ENUM('SOFTWARE', 'FISICO') NULL DEFAULT NULL AFTER `estado_cofre`,
  ADD COLUMN `dispositivo_id` VARCHAR(36) NULL DEFAULT NULL AFTER `tipo_dispositivo`,
  ADD CONSTRAINT `fk_users_dispositivo` FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivos` (`id`) ON DELETE SET NULL;

-- Contas que já estavam pareadas (pelos testes) ficam como SOFTWARE
UPDATE `users` SET `tipo_dispositivo` = 'SOFTWARE'
 WHERE `public_key_ed25519` IS NOT NULL AND `tipo_dispositivo` IS NULL;

-- Conferência
SHOW TABLES LIKE 'pedidos';
SHOW TABLES LIKE 'dispositivos';
SHOW COLUMNS FROM `users` LIKE '%dispositivo%';
