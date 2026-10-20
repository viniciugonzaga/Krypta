const express = require('express');
const hardwareController = require('../controllers/hardwareController');

const router = express.Router();

router.post('/hardware/pair', hardwareController.parear);

module.exports = router;
