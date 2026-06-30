const express = require('express')
const { register, login, createHRUser, loggedUser } = require('../controllers/userController')
const authMiddleware = require('../middlewares/authMiddleware')
const adminMiddleware = require('../middlewares/adminMiddleware')
const { validateEmailMiddleware } = require('../middlewares/validationMidlleware');
const router = express.Router()

router.post('/register', register)
    .post('/login', validateEmailMiddleware, login)
    .post('/logout', (req, res) => res.status(200).json({ success: true, message: 'Logged out' }))
    .get('/profile', authMiddleware, loggedUser)
    .post('/createHRUser', authMiddleware, adminMiddleware, createHRUser)

module.exports = router