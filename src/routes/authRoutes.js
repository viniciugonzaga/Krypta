const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/auth/challenge', authController.gerarChallenge);
router.post('/auth/verify', authController.verificarAssinatura);

module.exports = router;
