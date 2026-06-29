const pool = require('../config/connectdb');

const allowAdminOnly = async (req, res, next) => {
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).send({ 
                "status": "failed", 
                "message": "Unauthorized. Complete authentication required." 
            });
        }

        const adminQuery = await pool.query(
            'SELECT role FROM users WHERE user_id = $1 AND is_deleted = FALSE', 
            [req.user.user_id]
        );

        if (adminQuery.rows.length === 0) {
            return res.status(401).send({ 
                "status": "failed", 
                "message": "User profile not found or account has been deleted." 
            });
        }

        const userRole = adminQuery.rows[0].role;

        if (userRole !== 'Admin') {
            return res.status(403).send({ 
                "status": "failed", 
                "message": "Access denied. System Admin credentials required." 
            });
        }

        next();

    } catch (error) {
        console.error("Error inside Admin verification middleware:", error);
        return res.status(500).send({ 
            "status": "failed", 
            "message": "Internal server error during admin validation." 
        });
    }
};

module.exports = allowAdminOnly;