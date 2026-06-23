const pool = require('../config/connectdb')

const createCandidate = async (req, res) => {
    try {
        const { applied_position, password } = req.body

        if (!applied_position || !password) {
            return res.status(400).send({ "status": "failed", "message": "applied_position and password fields are required" })
        }

        const existingProfile = await pool.query('SELECT * FROM candidates WHERE user_id = $1', [req.user.user_id])
        if (existingProfile.rows.length > 0) {
            return res.status(400).send({ "status": "failed", "message": "Candidate profile already exists" })
        }

        const candidateResult = await pool.query(
            `INSERT INTO candidates (name, email, password, applied_position, role, status, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.name, req.user.email, password, applied_position, 'candidate', 'Pending', req.user.user_id]
        )

        res.status(201).send({ "status": "success", "message": "Profile created successfully", candidate: candidateResult.rows[0] })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const submitApplication = async (req, res) => {
    try {
        const profileResult = await pool.query('SELECT * FROM candidates WHERE user_id = $1', [req.user.user_id])

        if (profileResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Create your profile first before applying" })
        }

        const candidate = profileResult.rows[0]
        if (candidate.status !== 'Pending') {
            return res.status(400).send({ "status": "failed", "message": "Application already submitted" })
        }

        // Directly execute SQL UPDATE query
        const updateResult = await pool.query(
            'UPDATE candidates SET status = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
            ['Under Review', req.user.user_id]
        )

        res.status(200).send({ "status": "success", "message": "Application submitted successfully", candidate: updateResult.rows[0] })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const getApplicationStatus = async (req, res) => {
    try {
        const profileResult = await pool.query(
            'SELECT name, applied_position, status FROM candidates WHERE user_id = $1', 
            [req.user.user_id]
        )

        if (profileResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "No application found" })
        }

        res.status(200).send({ "status": "success", candidate: profileResult.rows[0] })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

module.exports = { 
    createCandidate, 
    submitApplication, 
    getApplicationStatus 
}