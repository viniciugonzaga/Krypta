// server/src/routes/vault.routes.ts
// ============================================================
// Rotas do COFRE — todas em /api/vault/...
//
// Regra de ordem: TOKEN primeiro, LIMITADOR depois. Assim só quem
// já tem login consome tentativas de prova (ninguém de fora esgota
// o limite de um usuário legítimo). A única rota pública é o resgate
// da herança, que tem o limitador mais apertado.
// ============================================================
import { Router } from 'express';
import { VaultController } from '../controllers/VaultController.js';
import { BackupController } from '../controllers/BackupController.js';
import { ContingencyController } from '../controllers/ContingencyController.js';
import { InheritanceController } from '../controllers/InheritanceController.js';
import { VaultAcessoController } from '../controllers/VaultAcessoController.js';
import { VaultRemotoController as Remoto, exigirSessaoCofre } from '../controllers/VaultRemotoController.js';
import { exigirEscopo } from '../middlewares/vaultAuth.js';
import {
  limitarContingencia,
  limitarHeranca,
  limitarOperacaoConta,
  limitarResgate,
  limitarRotacao,
  limitarPinCofre,
  limitarCofreRemoto,
} from '../middlewares/rateLimit.js';

const router = Router();
const hardware = exigirEscopo(['hardware']);
const site = exigirEscopo(['admin_web']);

// ============ CONTA (Parte 3) ============
router.get('/account', exigirEscopo(['admin_web', 'hardware']), VaultController.account);
// Alertas de acesso (Krypta Pro)
router.get('/activity', site, VaultController.activity);

// ============ BACKUP (Parte 4) — só o dispositivo ============
router.put('/backup', hardware, BackupController.enviar);
router.get('/backup', hardware, BackupController.baixar);
router.get('/backup/metadata', hardware, BackupController.metadados);
// v1.2.0: o dispositivo puxa o que outro aparelho editou
router.get('/backup/sync', hardware, Remoto.sincronizar);

// ============ CONTINGÊNCIA (Parte 5) ============
// Esqueci a senha mestre: o dono PRECISA estar com o dispositivo
router.post('/recovery/owner', hardware, limitarContingencia, ContingencyController.recoveryOwner);
router.post('/recovery/complete', hardware, limitarOperacaoConta, ContingencyController.recoveryComplete);
// Perdi o dispositivo: login do site + prova da CCP
router.post('/kill-switch', site, limitarContingencia, ContingencyController.killSwitch);
router.post('/recovery/hardware', site, limitarContingencia, ContingencyController.recoveryHardware);
// Trocar a CCP: dispositivo + prova atual
router.post('/rotate-ccp', hardware, limitarRotacao, ContingencyController.rotateCcp);

// Cofre em outro aparelho (Pro, só leitura), CCP esquecida e abandonar cofre
router.post('/backup/ccp', site, limitarContingencia, VaultAcessoController.abrirComCcp);
router.post('/ccp/reset', hardware, limitarRotacao, VaultAcessoController.resetCcp);
router.post('/abandon/request', site, limitarContingencia, VaultAcessoController.pedirAbandono);
router.post('/abandon/confirm', site, limitarContingencia, VaultAcessoController.confirmarAbandono);

// ============ v1.2.0: SENHA DE ACESSO AO COFRE (outros aparelhos, Pro) ============
router.get('/remoto', site, Remoto.estado);
router.post('/remoto/preparar', site, limitarCofreRemoto, Remoto.preparar);
router.post('/remoto/ativar', site, limitarCofreRemoto, Remoto.ativar);
router.post('/remoto/abrir', site, limitarPinCofre, Remoto.abrir);
router.post('/remoto/remover', site, limitarCofreRemoto, Remoto.remover);
router.get('/remoto/backup', site, exigirSessaoCofre, Remoto.baixarRemoto);
router.put('/remoto/backup', site, exigirSessaoCofre, Remoto.gravarRemoto);

// ============ v1.2.0: PONTOS DE RESTAURAÇÃO (exigem a CCP) ============
router.get('/pontos', site, Remoto.listarPontos);
router.post('/pontos', site, limitarCofreRemoto, Remoto.criarPonto);
router.post('/pontos/:id/restaurar', site, limitarCofreRemoto, Remoto.restaurarPonto);
router.post('/pontos/:id/apagar', site, limitarCofreRemoto, Remoto.apagarPonto);

// ============ HERANÇA (Parte 6) ============
router.post('/inheritance/enable', hardware, limitarHeranca, InheritanceController.enable);
router.post('/inheritance/disable', hardware, limitarHeranca, InheritanceController.disable);
// Herdeiro: PÚBLICO (sem conta no site). A prova da CCH é a autenticação.
router.post('/inheritance/claim', limitarResgate, InheritanceController.claim);

export default router;
