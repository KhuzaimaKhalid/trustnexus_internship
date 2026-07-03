const express = require('express')
const router = express.Router()
const hrMiddleware = require('../middlewares/hrMiddleware')
const authMiddleware = require('../middlewares/authMiddleware')
const { scheduleInterview, updateInterviewOutcome, getInterviewDetails, getCandidateList } = require('../controllers/interviewController')

router.post('/schedule',  hrMiddleware, scheduleInterview)
    .put('/update-outcome', authMiddleware, hrMiddleware, updateInterviewOutcome)
    .get('/candidates', authMiddleware, hrMiddleware, getCandidateList)
    .get('/details', authMiddleware, getInterviewDetails)

module.exports = router