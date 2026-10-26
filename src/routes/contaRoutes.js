const express = require('express');
const contaController = require('./../controllers/contaController');
const { exigirToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/accounts', contaController.criarConta);
router.get('/accounts/:id', exigirToken(['admin_web', 'hardware']), contaController.buscarContaPorId);

module.exports = router;
