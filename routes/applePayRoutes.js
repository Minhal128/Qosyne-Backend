
const express = require('express');
const router = express.Router();
const applePayController = require('../controllers/applePayController');

router.post('/applepay/validate-merchant', applePayController.validateMerchant);
router.post('/applepay/process-payment', applePayController.processPayment);

module.exports = router;
