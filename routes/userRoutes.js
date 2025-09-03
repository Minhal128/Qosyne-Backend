const express = require('express');
const {
  getProfile,
  updateProfile,
  changeEmailRequest,
  changeEmailVerify,
  getAllUsers,
  toggleUserDeletion,
  sendMail,
} = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const tryCatch = require('../middlewares/tryCatch');

const router = express.Router();

router.get('/profile', authMiddleware, tryCatch(getProfile));
router.patch('/profile', authMiddleware, tryCatch(updateProfile));
router.post('/change-email', authMiddleware, tryCatch(changeEmailRequest));
router.post('/change-email-verify', authMiddleware, tryCatch(changeEmailVerify));
router.get('/all', tryCatch(getAllUsers));
router.patch('/toggle-deletion/:id', tryCatch(toggleUserDeletion));
router.post('/send-mail/:id', tryCatch(sendMail));

module.exports = router;
