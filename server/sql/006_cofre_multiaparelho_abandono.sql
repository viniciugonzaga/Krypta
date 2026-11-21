-- ============================================================
-- KRYPTA — Migração 006: cofre em outros aparelhos e "abandonar cofre"
-- Banco: MySQL / MariaDB (XAMPP local e Hostinger)
--
-- COMO RODAR (phpMyAdmin): banco "krypta" → aba "SQL" → cole → "Executar".
-- Rode UMA vez só (depois da 005).
--
-- O que muda:
--   • users.abandono_*: código de 6 dígitos (enviado por e-mail) para
--     confirmar que a pessoa quer abandonar o cofre (perdeu a CCP e o dispositivo).
--   • chaves_revogadas.motivo ganha 'ABANDONO'.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE `users`
  ADD COLUMN `abandono_codigo` VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN `abandono_expira` DATETIME NULL DEFAULT NULL,
  ADD COLUMN `abandono_tentativas` INT NOT NULL DEFAULT 0;

ALTER TABLE `chaves_revogadas`
  MODIFY COLUMN `motivo` ENUM('KILL_SWITCH_DONO','KILL_SWITCH_HERDEIRO','ABANDONO') NOT NULL;
