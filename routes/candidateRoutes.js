const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const { createCandidate, submitApplication, getApplicationStatus, getCandidateProfile } = require('../controllers/candidateController')

router.post('/create-profile', authMiddleware, createCandidate)
router.post('/submit-application', authMiddleware, submitApplication)
router.get('/application-status', authMiddleware, getApplicationStatus)
.get('/profile', authMiddleware, getCandidateProfile)

module.exports = router