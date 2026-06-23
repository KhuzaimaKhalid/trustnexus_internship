const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const { scheduleInterview, updateInterviewOutcome, getInterviewDetails } = require('../controllers/interviewController')

router.patch('/schedule/:id', authMiddleware, scheduleInterview)
    .patch('/outcome/:id', authMiddleware, updateInterviewOutcome)

    .get('/my-interview', authMiddleware, getInterviewDetails)

module.exports = router