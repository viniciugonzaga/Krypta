const express = require('express');
const contaController = require('../controllers/contaController');
const { exigirToken } = require('../middlewares/authMiddleware');
const { limitarCadastro } = require('../middlewares/rateLimit');

const router = express.Router();

router.post('/accounts', limitarCadastro, contaController.criarConta);
router.get('/accounts/:id', exigirToken(['admin_web', 'hardware']), contaController.buscarContaPorId);

module.exports = router;
