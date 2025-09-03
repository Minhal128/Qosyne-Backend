const express = require('express');
const {
  register,
  login,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  googleLogin,
  updatePassword,
  softDeleteUser,
  generateSsoLink,
} = require('../controllers/authController');
const tryCatch = require('../middlewares/tryCatch');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', tryCatch(register));
router.post('/login', tryCatch(login));
router.post('/send-otp', tryCatch(sendOtp));
router.post('/verify-otp', tryCatch(verifyOtp));
router.post('/forgot-password', tryCatch(forgotPassword));
router.post('/reset-password', tryCatch(resetPassword));
router.post('/update-password',  authMiddleware, tryCatch(updatePassword));
router.post('/google-login', tryCatch(googleLogin));
router.post('/delete-account', authMiddleware, tryCatch(softDeleteUser));
router.post('/generate-sso-link', authMiddleware, tryCatch(generateSsoLink));


module.exports = router;
