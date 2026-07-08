const express = require('express');
const router = express.Router();
const hrMiddleware = require('../middlewares/hrMiddleware');
const authMiddleware = require('../middlewares/authMiddleware')
const { getAllLeavesForHR, updateLeaveStatus,createLeaveRequest } = require('../controllers/leavesController');

router.get('/hr/all', hrMiddleware, getAllLeavesForHR);
router.patch('/status/:id', hrMiddleware, updateLeaveStatus);
router.post('/request',authMiddleware, createLeaveRequest);

module.exports = router;