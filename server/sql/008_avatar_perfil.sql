-- ============================================================
-- KRYPTA — Migração 008 (v1.3.0): foto de perfil
-- Banco: MySQL / MariaDB (XAMPP local e Hostinger)
--
-- COMO RODAR (phpMyAdmin da Hostinger): abra o banco do Krypta → aba "SQL"
-- → cole este arquivo → "Executar". Rode UMA vez só (depois da 007).
--
-- O que muda:
--   • users.avatar_url passa de VARCHAR(255) para MEDIUMTEXT, para caber a
--     foto (o app reduz para 256×256 em JPEG, uns 20–40 KB) ou um avatar
--     padrão do Krypta ("preset:robo-roxo", "preset:robo-noite"...).
--   • NULL = sem foto (o app mostra o avatar padrão do Krypta).
--
-- A trava do cofre (PIN/biometria deste aparelho) da v1.3.0 NÃO usa o banco:
-- fica cifrada só no aparelho. Nada mais muda nas tabelas.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE `users` MODIFY `avatar_url` MEDIUMTEXT NULL DEFAULT NULL;
