const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const { createCandidate, submitApplication, getApplicationStatus, getCandidateProfile, getDashboard, getStatusByEmail, getAllCandidatesForHR } = require('../controllers/candidateController')

router.post('/submit-application', authMiddleware, submitApplication)

router.get('/:applicationId/status', authMiddleware, getApplicationStatus)

router.post('/create-profile', authMiddleware, createCandidate)
router.get('/profile', authMiddleware, getCandidateProfile)
router.get('/dashboard', authMiddleware, getDashboard); 
router.get('/status-by-email', authMiddleware, getStatusByEmail)
router.get('/hr/all',getAllCandidatesForHR)

module.exports = router