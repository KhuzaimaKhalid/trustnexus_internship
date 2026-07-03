const jwt = require('jsonwebtoken')
const pool = require('../config/connectdb')

const checkUserAuth = async (req, res, next) => {
    let token
    const { authorization } = req.headers

    if (authorization && authorization.startsWith('Bearer')) {
        try {
            token = authorization.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            
            if (!decoded.user_id) {
                return res.status(401).send({ "status": "failed", "message": "Invalid token structure" })
            }

            const userResult = await pool.query(
                'SELECT user_id, name, email, role FROM users WHERE user_id = $1 AND is_deleted = FALSE', 
                [decoded.user_id]
            )
            
            if (userResult.rows.length === 0) {
                return res.status(401).send({ "status": "failed", "message": "Unauthorized or account deleted" })
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