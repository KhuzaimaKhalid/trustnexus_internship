const express = require('express')
const router = express.Router()
const hrMiddleware = require('../middlewares/hrMiddleware')
const authMiddleware = require('../middlewares/authMiddleware')
const { scheduleInterview, updateInterviewOutcome, getInterviewDetails, getCandidateList, getUpcomingInterviews } = require('../controllers/interviewController')

router.post('/schedule',  hrMiddleware, scheduleInterview)
    .put('/update-outcome', authMiddleware, hrMiddleware, updateInterviewOutcome)
    .get('/candidates', authMiddleware, hrMiddleware, getCandidateList)
    .get('/details', authMiddleware, getInterviewDetails)
    .get('/upcoming', authMiddleware, hrMiddleware, getUpcomingInterviews)

module.exports = router