-- ============================================================
-- KRYPTA — Migração 004: Dispositivo físico (ESP32) de verdade
-- Banco: MySQL / MariaDB (XAMPP local e Hostinger)
--
-- COMO RODAR (phpMyAdmin): banco "krypta" → aba "SQL" → cole → "Executar".
-- Rode UMA vez só (depois da 003).
--
-- O que muda:
--   Quando o ESP32 liga, ele se apresenta ao servidor com o número de série
--   e a CHAVE PÚBLICA que ele mesmo gerou (POST /api/hardware/announce).
--   O servidor guarda essa chave aqui. No Meu Krypta, o dono confere o
--   código de 6 dígitos mostrado na tela do dispositivo e pareia o cofre
--   com a chave do hardware real. A chave privada nunca sai do ESP32.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE `dispositivos`
  ADD COLUMN `chave_anunciada` VARCHAR(64) NULL DEFAULT NULL AFTER `public_key`,
  ADD COLUMN `anunciado_em` DATETIME NULL DEFAULT NULL AFTER `chave_anunciada`,
  ADD COLUMN `ultimo_contato` DATETIME NULL DEFAULT NULL AFTER `anunciado_em`;
