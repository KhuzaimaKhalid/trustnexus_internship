const pool = require('../config/connectdb');

const allowHROnly = async (req, res, next) => {
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).send({ 
                "status": "failed", 
                "message": "Unauthorized. Please log in first." 
            });
        }

        const userQuery = await pool.query(
            'SELECT role FROM users WHERE user_id = $1 AND is_deleted = FALSE', 
            [req.user.user_id]
        );

        if (userQuery.rows.length === 0) {
            return res.status(401).send({ 
                "status": "failed", 
                "message": "User profile not found or account has been deleted." 
            });
        }

        const userRole = userQuery.rows[0].role;

        if (userRole !== 'HR') {
            return res.status(403).send({ 
                "status": "failed", 
                "message": "Access denied. This endpoint is strictly restricted to HR accounts only." 
            });
        }

        next();

    } catch (error) {
        console.error("Error in HR verification middleware:", error);
        return res.status(500).send({ 
            "status": "failed", 
            "message": "Internal server error during authorization verification." 
        });
    }
};

module.exports = allowHROnly;