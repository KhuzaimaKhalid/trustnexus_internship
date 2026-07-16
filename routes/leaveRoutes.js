const express = require('express');
const router = express.Router();
const hrMiddleware = require('../middlewares/hrMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const teamLeadMiddleware = require('../middlewares/teamLeadMiddleware');
const cfoMiddleware = require('../middlewares/cfoMiddleware');
const {
    getAllLeavesForHR, updateLeaveStatus, createLeaveRequest,
    getLeavesForTeamLead, teamLeadUpdateStatus,
    getLeavesForCFO, cfoUpdateStatus
} = require('../controllers/leavesController');

router.post('/request', authMiddleware, createLeaveRequest);

// HR
router.get('/hr/all', authMiddleware, hrMiddleware, getAllLeavesForHR);
router.patch('/status/:id', authMiddleware, hrMiddleware, updateLeaveStatus);

// Team Lead
router.get('/team-lead/all', authMiddleware, teamLeadMiddleware, getLeavesForTeamLead);
router.patch('/team-lead/:id/status', authMiddleware, teamLeadMiddleware, teamLeadUpdateStatus);

// CFO
router.get('/cfo/all', authMiddleware, cfoMiddleware, getLeavesForCFO);
router.patch('/cfo/:id/status', authMiddleware, cfoMiddleware, cfoUpdateStatus);

module.exports = router;