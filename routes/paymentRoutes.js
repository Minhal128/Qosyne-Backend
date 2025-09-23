const express = require('express');
const {
  processStripePayment,
  addPaymentMethod,
  getPayPalToken,
  getPayPalAuthUrl,
  payPalCallback,
  createOrder,
  authorizePayment,
  paymentCapture,
  getTransactions,
  attachPaymentMethod,
payPalCallbackAuthorize,
  getRecipients,
  getBankAccounts,
  generateClientToken,
  createRecipientToken,
  changeTransactionStatus,
} = require('../controllers/paymentController');

const {
  getAllTransactions,
  getTransactionStats,
} = require('../simple-endpoints');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const router = express.Router();

router.post('/stripe', authMiddleware, tryCatch(processStripePayment));
router.get(
  '/stripe/bank-accounts/:customerId',
  authMiddleware,
  tryCatch(getBankAccounts),
);

router.post('/add-payment-method', authMiddleware, tryCatch(addPaymentMethod));
router.get('/paypal-token',  tryCatch(getPayPalToken));
router.get('/paypal-auth-url', authMiddleware, tryCatch(getPayPalAuthUrl))
router.get('/paypal/callback', tryCatch(payPalCallback));
router.get('/paypal/callback/authorize', tryCatch(payPalCallbackAuthorize));
router.post(
  '/create-order/:paymentMethod',
  authMiddleware,
  tryCatch(createOrder),
);
router.post(
  '/authorize-payment/:paymentMethod',
  authMiddleware,
  tryCatch(authorizePayment),
);
router.post(
  '/capture-payment/:paymentMethod',
  authMiddleware,
  tryCatch(paymentCapture),
);

router.post(
  '/attach-payment-method/:paymentMethod',
  authMiddleware,
  tryCatch(attachPaymentMethod),
);

router.get('/transactions', authMiddleware, getTransactions);
router.get('/generateClientToken', generateClientToken);
router.get('/transactions-recipients', authMiddleware, getRecipients);

router.get('/paypal/success', (req, res) => {
  res.status(200).json({
    message: 'Success URL hit',
    status_code: 200
  });
});

router.get('/paypal/failure', (req, res) => {
  res.status(200).json({
    message: 'Failure URL hit',
    status_code: 200
  });
});

router.post(
  '/payout/google-pay',
  authMiddleware,
  tryCatch(async (req, res) => {
    const { amount, currency, paymentData } = req.body;
    const { recipientEmail } = paymentData.transferDetails;

    // Process the payout using PayPal's payout API
    const payoutResult = await paypalGateway.createPayout({
      amount,
      currency,
      recipientEmail,
      senderBatchId: `GPAY_${Date.now()}`,
      paymentSource: 'google_pay',
      paymentToken: paymentData.paymentToken
    });

    res.json(payoutResult);
  })
);

router.post('/create-recipient-token/wise', authMiddleware, tryCatch(createRecipientToken));

router.get('/admin/transactions', getAllTransactions);
router.get('/admin/transactions/stats', getTransactionStats);
router.patch('/change-status/:id', changeTransactionStatus);

module.exports = router;
