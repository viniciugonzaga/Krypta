const express = require('express');
const controller = require('../controllers/herancaController');
const { exigirToken } = require('../middlewares/authMiddleware');
const { limitarHeranca, limitarResgate } = require('../middlewares/rateLimit');

const router = express.Router();

// Dono, com o dispositivo na mão: ativa/troca/remove a herança. Exige a prova atual da CCP.
router.post('/inheritance/enable', exigirToken(['hardware']), limitarHeranca, controller.habilitar);
router.post('/inheritance/disable', exigirToken(['hardware']), limitarHeranca, controller.desabilitar);

// Herdeiro: público, sem token. A prova da CCH é a autenticação.
router.post('/inheritance/claim', limitarResgate, controller.resgatar);

module.exports = router;
