const express = require('express');
const {
  sendContactSupport,
  getAllSupportRequests,
} = require('../controllers/supportController');
const tryCatch = require('../middlewares/tryCatch');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/contact', authMiddleware, tryCatch(sendContactSupport));
router.get('/all', tryCatch(getAllSupportRequests));

module.exports = router;
