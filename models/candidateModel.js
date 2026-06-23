const pool = require('../config/connectdb')

const candidateModel = {
    findOne: async ({ user_id }) => {
        const result = await pool.query(
            'SELECT * FROM candidates WHERE user_id = $1', [user_id]
        )
        return result.rows[0] || null
    },

    create: async ({ user_id, name, email, password, applied_position }) => {
        // Status defaults to 'Pending' automatically via database schema configuration
        const result = await pool.query(
            `INSERT INTO candidates (user_id, name, email, password, applied_position, role) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [user_id, name, email, password, applied_position, 'candidate']
        )
        return result.rows[0]
    },

    updateStatus: async (candidate_id, status) => {
        const result = await pool.query(
            'UPDATE candidates SET status = $1, updated_at = NOW() WHERE candidate_id = $2 RETURNING *',
            [status, candidate_id]
        )
        return result.rows[0] || null
    }
}

module.exports = candidateModel