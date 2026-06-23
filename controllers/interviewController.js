const pool = require('../config/connectdb')

const scheduleInterview = async (req, res) => {
    try {
        const { id } = req.params  
        const { scheduledDate, scheduledTime, interviewType, location, meetingLink } = req.body

        if (!scheduledDate || !scheduledTime || !interviewType) {
            return res.status(400).send({ "status": "failed", "message": "scheduledDate, scheduledTime and interviewType are required" })
        }

        const checkCandidate = await pool.query('SELECT * FROM candidates WHERE candidate_id = $1', [id])
        if (checkCandidate.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Candidate not found" })
        }

        const updatedResult = await pool.query(
            'UPDATE candidates SET status = $1, updated_at = NOW() WHERE candidate_id = $2 RETURNING *',
            ['Under Review', id]
        )

        res.status(200).send({ 
            "status": "success", 
            "message": "Interview scheduled", 
            candidate: {
                ...updatedResult.rows[0],
                interview: { scheduledDate, scheduledTime, interviewType, location, meetingLink }
            } 
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const updateInterviewOutcome = async (req, res) => {
    try {
        const { id } = req.params 
        const { outcome, notes } = req.body

        if (!outcome) {
            return res.status(400).send({ "status": "failed", "message": "outcome is required" })
        }

        const checkCandidate = await pool.query('SELECT * FROM candidates WHERE candidate_id = $1', [id])
        if (checkCandidate.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Candidate not found" })
        }

        const updatedResult = await pool.query(
            'UPDATE candidates SET status = $1, updated_at = NOW() WHERE candidate_id = $2 RETURNING *',
            [outcome, id]
        )

        res.status(200).send({ 
            "status": "success", 
            "message": "Interview outcome updated", 
            candidate: {
                ...updatedResult.rows[0],
                interview: { outcome, notes }
            } 
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const getInterviewDetails = async (req, res) => {
    try {
        const profileResult = await pool.query(
            'SELECT candidate_id, name, applied_position, status FROM candidates WHERE user_id = $1', 
            [req.user.user_id]
        )

        if (profileResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Candidate not found" })
        }

        res.status(200).send({ 
            "status": "success", 
            candidate: profileResult.rows[0] 
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

module.exports = { scheduleInterview, updateInterviewOutcome, getInterviewDetails }