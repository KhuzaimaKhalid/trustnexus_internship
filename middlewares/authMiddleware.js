const jwt = require('jsonwebtoken')
const pool = require('../config/connectdb')

const checkUserAuth = async (req, res, next) => {
    let token
    const { authorization } = req.headers

    if (authorization && authorization.startsWith('Bearer')) {
        try {
            token = authorization.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            
            // Get user fields without leaking the password string
            const userResult = await pool.query('SELECT user_id, name, email, role, created_at, updated_at FROM users WHERE user_id = $1', [decoded.userID])
            
            if (userResult.rows.length === 0) {
                return res.status(401).send({ "status": "failed", "message": "Unauthorized" })
            }

            req.user = userResult.rows[0]
            next()
        } catch (error) {
            res.status(401).send({ "status": "failed", "message": "Invalid Token" })
        }
    } else {
        res.status(401).send({ "status": "failed", "message": "No Token Provided" })
    }
}

module.exports = checkUserAuth