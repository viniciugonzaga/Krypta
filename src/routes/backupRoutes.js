const express = require('express');
const backupController = require('../controllers/backupController');
const { exigirToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Só token de escopo 'hardware' acessa o cofre. admin_web nunca passa.
router.put('/backup', exigirToken(['hardware']), backupController.enviar);
router.get('/backup', exigirToken(['hardware']), backupController.baixar);

module.exports = router;
