const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const { createCandidate, submitApplication, getApplicationStatus, getCandidateProfile } = require('../controllers/candidateController')

router.post('/', authMiddleware, submitApplication)

router.get('/:applicationId/status', authMiddleware, getApplicationStatus)

router.post('/create-profile', authMiddleware, createCandidate)
router.get('/profile', authMiddleware, getCandidateProfile)

module.exports = router