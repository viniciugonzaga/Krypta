const express = require('express');
const contaController = require('../controllers/contaController');

// Routes: só mapeia verbo + caminho -> Controller. Sem lógica aqui.
const router = express.Router();

router.post('/accounts', contaController.criarConta);
router.get('/accounts/:id', contaController.buscarContaPorId);

module.exports = router;
