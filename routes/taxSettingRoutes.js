const express = require('express');
const router = express.Router();
const { getTaxSettings, updateOrCreateTaxSettings } = require('../controllers/taxSettings.controller');
const tryCatch = require('../middlewares/tryCatch');

router.get('/', tryCatch(getTaxSettings));
router.post('/', tryCatch(updateOrCreateTaxSettings));

module.exports = router;