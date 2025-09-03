const express = require('express');
const router = express.Router();
const { getAdminDashboardStats } = require('../controllers/adminDashboardController');
const tryCatch = require('../middlewares/tryCatch');

router.get('/admin/dashboard-stats', tryCatch(getAdminDashboardStats));

module.exports = router;
