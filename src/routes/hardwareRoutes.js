const express = require('express');
const hardwareController = require('../controllers/hardwareController');
const { exigirToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Só o dono autenticado no portal (admin_web) pareia hardware na própria conta.
router.post('/hardware/pair', exigirToken(['admin_web']), hardwareController.parear);

module.exports = router;
