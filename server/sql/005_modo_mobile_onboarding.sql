-- ============================================================
-- KRYPTA — Migração 005: modo Mobile e questionário de boas-vindas
-- Banco: MySQL / MariaDB (XAMPP local e Hostinger)
--
-- COMO RODAR (phpMyAdmin): banco "krypta" → aba "SQL" → cole → "Executar".
-- Rode UMA vez só (depois da 004).
--
-- O que muda:
--   • sessions.cliente: de onde a sessão foi aberta (web, mobile, pwa, desktop).
--     O servidor descobre sozinho (cabeçalho X-Krypta-Cliente ou o navegador).
--   • users.onboarding_*: respostas do questionário do primeiro acesso e o
--     plano que o servidor recomendou a partir delas.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE `sessions`
  ADD COLUMN `cliente` VARCHAR(12) NULL DEFAULT NULL AFTER `user_agent`;

ALTER TABLE `users`
  ADD COLUMN `onboarding_respostas` TEXT NULL DEFAULT NULL,
  ADD COLUMN `onboarding_recomendacao` VARCHAR(20) NULL DEFAULT NULL,
  ADD COLUMN `onboarding_concluido_em` DATETIME NULL DEFAULT NULL;
