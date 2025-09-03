const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const tryCatch = require('../middlewares/tryCatch');

// Webhook signature verification middleware
const verifyWebhookSignature = (provider) => {
  return (req, res, next) => {
    try {
      const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
      const payload = JSON.stringify(req.body);
      
      const webhookService = require('../services/webhookService');
      const isValid = webhookService.verifySignature(provider, signature, payload);
      
      if (!isValid) {
        console.warn('Invalid webhook signature:', {
          provider,
          signature: signature?.substring(0, 10) + '...',
          ip: req.ip
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
      
      next();
    } catch (error) {
      console.error('Webhook signature verification failed:', {
        provider,
        error: error.message,
        ip: req.ip
      });
      return res.status(400).json({
        success: false,
        error: 'Signature verification failed'
      });
    }
  };
};

// Provider-specific webhook handlers
router.post('/paypal', verifyWebhookSignature('PAYPAL'), tryCatch(webhookController.handlePayPalWebhook));
router.post('/googlepay', verifyWebhookSignature('GOOGLEPAY'), tryCatch(webhookController.handleGooglePayWebhook));
router.post('/wise', verifyWebhookSignature('WISE'), tryCatch(webhookController.handleWiseWebhook));
router.post('/square', verifyWebhookSignature('SQUARE'), tryCatch(webhookController.handleSquareWebhook));
router.post('/venmo', verifyWebhookSignature('VENMO'), tryCatch(webhookController.handleVenmoWebhook));
router.post('/rapyd', verifyWebhookSignature('RAPYD'), tryCatch(webhookController.handleRapydWebhook));

// Generic webhook handler for testing
router.post('/test', tryCatch(webhookController.handleTestWebhook));

// Webhook management routes
router.get('/deliveries/:webhookId', tryCatch(webhookController.getWebhookDelivery));
router.post('/deliveries/:webhookId/retry', tryCatch(webhookController.retryWebhook));
router.get('/stats', tryCatch(webhookController.getWebhookStats));

module.exports = router;
