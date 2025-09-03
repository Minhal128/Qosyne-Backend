const express = require('express');
const {
  getBalance,
  deposit,
  withdraw,
  connectWallet,
  getConnectedWallets,
} = require('../controllers/walletController');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const router = express.Router();

router.get('/balance', authMiddleware, tryCatch(getBalance));
router.get('/wallets', authMiddleware, tryCatch(getConnectedWallets));
// router.post('/deposit', authMiddleware, tryCatch(deposit));
// router.post('/withdraw', authMiddleware, tryCatch(withdraw));
// router.post('/connect', tryCatch(connectWallet));

module.exports = router;
