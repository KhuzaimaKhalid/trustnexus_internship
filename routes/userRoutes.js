const express = require('express')
const { register, login, loggedUser } = require('../controllers/userController')
const authMiddleware = require('../middlewares/authMiddleware')
const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/loggedUser', authMiddleware, loggedUser)

module.exports = router