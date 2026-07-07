const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const hrMiddleware = require('../middlewares/hrMiddleware');
const { getHRDashboardMetrics } = require('../controllers/hrController');

router.get('/metrics', authMiddleware, hrMiddleware, getHRDashboardMetrics);

module.exports = router;