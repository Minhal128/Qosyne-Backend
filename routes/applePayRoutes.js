const express = require("express");
const router = express.Router();
const applePayController = require("../controllers/applePayController");
const walletIntegrationController = require("../controllers/walletIntegrationController");

// Apple Pay merchant validation and session endpoints
router.post("/applepay/validate-merchant", applePayController.validateMerchant);
router.post(
  "/apple-pay/start-session",
  applePayController.startApplePaySession,
);

// Accept Apple form_post (response_mode=form_post) and parse form-encoded body for this route.
// Use route-level urlencoded parser so the public endpoint receives form-encoded POST bodies even if global urlencoded middleware is not enabled.
router.post(
  "/wallets/auth/APPLEPAY/form_post",
  express.urlencoded({ extended: true }),
  walletIntegrationController.handleAppleFormPost,
);

module.exports = router;
