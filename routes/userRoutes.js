const express = require('express')
const { register, login, createHRUser, loggedUser } = require('../controllers/userController')
const authMiddleware = require('../middlewares/authMiddleware')
const adminMiddleware = require('../middlewares/adminMiddleware')
const { validateEmailMiddleware } = require('../middlewares/validationMidlleware');
const router = express.Router()

router.post('/register', register)
.post('/login',validateEmailMiddleware, login)
.get('/loggedUser', authMiddleware, loggedUser)
.post('/createHRUser',authMiddleware, adminMiddleware, createHRUser)

module.exports = router