const express = require('express');
const controller = require('../controllers/contingenciaController');
const { exigirToken } = require('../middlewares/authMiddleware');
const { limitarContingencia } = require('../middlewares/rateLimit');

const router = express.Router();

// Token primeiro, limitador depois: só quem já tem token consome tentativas de prova.
// Recuperação local e conclusão: o dono PRECISA estar com o hardware (token 'hardware').
router.post('/recovery/owner', exigirToken(['hardware']), limitarContingencia, controller.iniciarRecuperacaoLocal);
router.post('/recovery/complete', exigirToken(['hardware']), controller.concluirRecuperacao);

// Kill Switch e recuperação de hardware: o hardware antigo pode estar perdido,
// então o gatilho é a sessão do portal (admin_web) + prova da CCP.
router.post('/account/kill-switch', exigirToken(['admin_web']), limitarContingencia, controller.killSwitch);
router.post('/recovery/hardware', exigirToken(['admin_web']), limitarContingencia, controller.recuperarHardware);

module.exports = router;
