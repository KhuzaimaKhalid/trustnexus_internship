const pool = require('../config/connectdb')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const register = async (req, res) => {
    try {
        const { name, email, password, confirm_password } = req.body

        if (!name || !email || !password || !confirm_password) {
            return res.status(400).json({ "status": "failed", "message": "All fields are required" })
        }

        if (password !== confirm_password) {
            return res.status(400).json({ "status": "failed", "message": "Password and Confirm password do not match" })
        }

        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ "status": "failed", "message": "User already exists" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id',
            [name, email, hashedPassword, 'candidate']
        )

        const token = jwt.sign(
            { 
                claims: {
                    user_id: newUser.rows[0].user_id,
                    role: 'candidate'
                }
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        )
        res.status(201).json({ "status": "success", "message": "Registration Success", "token": token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ "status": "failed", "message": "Registration failed" })
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ "status": "failed", "message": "All fields are required" })
        }

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE', [email])
        if (userResult.rows.length === 0) {
            return res.status(400).json({ "status": "failed", "message": "You are not a registered user" })
        }

        const user = userResult.rows[0]
        let isMatch = false

        // BYPASS BCRYPT FOR ADMIN ONLY
        if (user.email === 'admin_trustnexus@gmail.com') {
            // Direct plain-text string match
            isMatch = (password === user.password)
        } else {
            // Secure bcrypt check for candidates and other accounts
            isMatch = await bcrypt.compare(password, user.password)
        }

        if (!isMatch) {
            return res.status(400).json({ "status": "failed", "message": "Email or password is not valid" })
        }

        const token = jwt.sign(
            { 
                claims: {
                    user_id: user.user_id,
                    role: user.role
                }
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        )
        res.status(200).json({ "status": "success", "message": "Login successful", "token": token })

    } catch (error) {
        console.error(error)
        res.status(500).json({ "status": "failed", "message": "Something went wrong" })
    }
}

const createHRUser = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ "status": "failed", "message": "Name, email, and temporary password are required" })
        }

        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ "status": "failed", "message": "An account with this email already exists" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newHR = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role',
            [name, email, hashedPassword, 'HR']
        )

        res.status(201).json({ 
            "status": "success", 
            "message": "HR User account provisioned successfully by Admin", 
            "user": newHR.rows[0] 
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ "status": "failed", "message": "Failed to create HR user account" })
    }
}

const loggedUser = async (req, res) => {
    res.status(200).json({ "user": req.user })
}

module.exports = {
    register, 
    login,
    createHRUser,
    loggedUser
}