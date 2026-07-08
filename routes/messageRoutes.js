const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const hrMiddleware = require('../middlewares/hrMiddleware')
const { sendMessage, getInbox } = require('../controllers/messageController')

router.post('/sendMessage', hrMiddleware, sendMessage)
    .get('/inbox', authMiddleware, getInbox)

module.exports = router