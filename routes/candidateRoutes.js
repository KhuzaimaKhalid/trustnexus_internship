const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const hrMiddleware = require('../middlewares/hrMiddleware')
const { createCandidate, submitApplication, getApplicationStatus, getCandidateProfile, getDashboard, getStatusByEmail, getAllCandidatesForHR, updateApplicationStatusForCandidate } = require('../controllers/candidateController')

router.post('/submit-application', authMiddleware, submitApplication)

router.get('/:applicationId/status', authMiddleware, getApplicationStatus)

router.post('/create-profile', authMiddleware, createCandidate)
router.patch('/:candidateId/status', authMiddleware, hrMiddleware, updateApplicationStatusForCandidate);
router.get('/profile', authMiddleware, getCandidateProfile)
router.get('/dashboard', authMiddleware, getDashboard); 
router.get('/status-by-email', authMiddleware, getStatusByEmail)
router.get('/hr/all',getAllCandidatesForHR)

module.exports = router