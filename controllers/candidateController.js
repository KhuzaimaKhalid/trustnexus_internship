const pool = require('../config/connectdb')

const createCandidate = async (req, res) => {
    try {
        const { password, applied_position } = req.body; 

        if (!applied_position) {
            return res.status(400).send({ "status": "failed", "message": "applied_position is required" });
        }

        const existingProfile = await pool.query('SELECT * FROM candidates WHERE user_id = $1 AND is_deleted = FALSE', [req.user.user_id]);
        if (existingProfile.rows.length > 0) {
            return res.status(400).send({ "status": "failed", "message": "Candidate profile already exists" });
        }

        const candidateResult = await pool.query(
            `INSERT INTO candidates (name, email, password, role, status, user_id, applied_position)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.name, req.user.email, password, 'candidate', 'Active', req.user.user_id, applied_position]
        );

        res.status(201).send({ "status": "success", "message": "Profile created successfully", candidate: candidateResult.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send({ "status": "failed", "message": "Something went wrong" });
    }
};

const submitApplication = async (req, res) => {
    try {
        const { applied_position } = req.body;

        if (!applied_position) {
            return res.status(400).send({ "status": "failed", "message": "applied_position is required" });
        }

        // Only search active candidates
        const profileResult = await pool.query('SELECT candidate_id FROM candidates WHERE user_id = $1 AND is_deleted = FALSE', [req.user.user_id]);
        if (profileResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Create your profile first before applying" });
        }
        const candidate_id = profileResult.rows[0].candidate_id;

        const existingApp = await pool.query(
            'SELECT * FROM applications WHERE candidate_id = $1 AND applied_position = $2 AND status NOT IN (\'Selected\', \'Rejected\') AND is_deleted = FALSE',
            [candidate_id, applied_position]
        );
        if (existingApp.rows.length > 0) {
            return res.status(400).send({ "status": "failed", "message": "You already have an active application for this position" });
        }

        const newApplication = await pool.query(
            `INSERT INTO applications (candidate_id, applied_position, status)
             VALUES ($1, $2, 'Submitted') RETURNING *`,
            [candidate_id, applied_position]
        );

        res.status(201).send({ 
            "status": "success", 
            "message": "Application submitted successfully", 
            application: newApplication.rows[0] 
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ "status": "failed", "message": "Something went wrong" });
    }
};

const getApplicationStatus = async (req, res) => {
    try {
        const statusResult = await pool.query(
            `SELECT c.name, a.applied_position, a.status 
             FROM candidates c
             JOIN applications a ON c.candidate_id = a.candidate_id
             WHERE c.user_id = $1 AND c.is_deleted = FALSE AND a.is_deleted = FALSE`, 
            [req.user.user_id]
        )

        if (statusResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "No application found" })
        }

        res.status(200).send({ "status": "success", application: statusResult.rows[0] })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const getCandidateProfile = async (req, res) => {
    try {
        const profileResult = await pool.query(
            'SELECT candidate_id, name, email, role, status, created_at FROM candidates WHERE user_id = $1 AND is_deleted = FALSE', 
            [req.user.user_id]
        )

        if (profileResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Candidate profile not found" })
        }

        res.status(200).send({ "status": "success", "profile": profileResult.rows[0] })

    } catch (error) {
        console.error(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

module.exports = { 
    createCandidate, 
    submitApplication, 
    getApplicationStatus,
    getCandidateProfile 
}