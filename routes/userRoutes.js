const express = require('express')
const { register, login, loggedUser } = require('../controllers/userController')
const authMiddleware = require('../middlewares/authMiddleware')
const { validateEmailMiddleware } = require('../middlewares/validationMidlleware');
const router = express.Router()

router.post('/register', register)
router.post('/login',validateEmailMiddleware, login)
router.get('/loggedUser', authMiddleware, loggedUser)

module.exports = router