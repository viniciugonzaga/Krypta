const express = require('express');
const authController = require('../controllers/authController');
const { exigirToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/auth/challenge', authController.gerarChallenge);
router.post('/auth/verify', authController.verificarAssinatura);
router.get('/auth/session', exigirToken(['hardware']), authController.sessao);

module.exports = router;
