const pool = require('../config/connectdb')

const userModel = {
    findOne: async ({ email }) => {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        )
        return result.rows[0] || null
    },

    findById: async (id) => {
        const result = await pool.query(
            'SELECT * FROM users WHERE user_id = $1', [id]
        )
        return result.rows[0] || null
    },

    create: async ({ name, email, passwordHash }) => {
        const result = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, email, passwordHash, 'candidate']
        )
        return result.rows[0]
    }
}

module.exports = userModel