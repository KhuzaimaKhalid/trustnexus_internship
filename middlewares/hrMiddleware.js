const jwt = require('jsonwebtoken');
const pool = require('../config/connectdb');

const allowHROnly = async (req, res, next) => {
    try {
        const { authorization } = req.headers;

        // 1. Verify token exists
        if (!authorization || !authorization.startsWith('Bearer')) {
            return res.status(401).send({ 
                "status": "failed", 
                "message": "Unauthorized. Please log in first." 
            });
        }

        // 2. Extract and decode the token
        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Extract user_id from the nested claims object
        const userId = decoded.claims && decoded.claims.user_id;

        if (!userId) {
            return res.status(401).send({ 
                "status": "failed", 
                "message": "Invalid token structure" 
            });
        }

        // 4. Query the database to ensure the user exists and isn't deleted
        const userQuery = await pool.query(
            'SELECT user_id, role FROM users WHERE user_id = $1 AND is_deleted = FALSE', 
            [userId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(401).send({ 
                "status": "failed", 
                "message": "User profile not found or account has been deleted." 
            });
        }

        const user = userQuery.rows[0];

        // 5. Enforce HR role restrictions
        if (user.role !== 'HR') {
            return res.status(403).send({ 
                "status": "failed", 
                "message": "Access denied. This endpoint is strictly restricted to HR accounts only." 
            });
        }

        // 6. Keep req.user populated for your controller queries
        req.user = user;
        
        next();

    } catch (error) {
        console.error("Error in HR verification middleware:", error);
        return res.status(401).send({ 
            "status": "failed", 
            "message": "Invalid Token" 
        });
    }
};

module.exports = allowHROnly;