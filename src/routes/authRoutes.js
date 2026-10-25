const express = require('express');
const authController = require('../controllers/authController');
const adminAuthController = require('../controllers/adminAuthController');
const { exigirToken } = require('../middlewares/authMiddleware');
const { limitarLoginAdmin, limitarAuthHardware } = require('../middlewares/rateLimit');

const router = express.Router();

// Fluxo do hardware (Ed25519)
router.post('/auth/challenge', limitarAuthHardware, authController.gerarChallenge);
router.post('/auth/verify', limitarAuthHardware, authController.verificarAssinatura);
router.get('/auth/session', exigirToken(['hardware']), authController.sessao);

// Fluxo do portal web (email + senha administrativa)
router.post('/auth/admin-login', limitarLoginAdmin, adminAuthController.login);

module.exports = router;
