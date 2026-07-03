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
            'SELECT * FROM applications WHERE candidate_id = $1 AND applied_position = $2 AND status NOT IN (\'Accepted\', \'Rejected\') AND is_deleted = FALSE',
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
        // res.status(500).send({ "status": "failed", "message": "Something went wrong" });
        res.status(500).send({
            "status": "failed",
            "message": error.message,
            "detail": error.detail || "No extra details"
        });
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

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // 1) Get candidate_id
        const candidateRes = await pool.query(
            `SELECT candidate_id, name FROM candidates WHERE user_id = $1 AND is_deleted = FALSE`,
            [userId]
        );
        if (candidateRes.rows.length === 0) {
            return res.status(404).json({ status: "failed", message: "Candidate profile not found" });
        }
        const { candidate_id, name } = candidateRes.rows[0];

        // 2) All applications for this candidate
        const appsRes = await pool.query(
            `SELECT status, applied_position, created_at 
         FROM applications 
         WHERE candidate_id = $1 AND is_deleted = FALSE`,
            [candidate_id]
        );
        const apps = appsRes.rows;

        // 3) Stats
        const total = apps.length;
        const rejected = apps.filter(a => a.status === 'Rejected').length;
        const selected = apps.filter(a => a.status === 'Selected').length;
        const inProgress = total - rejected - selected;

        // 4) Latest application
        const latestApp = apps.length > 0 ? apps.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b) : null;

        // 5) Upcoming interview (not completed)
        const interviewRes = await pool.query(
            `SELECT scheduled_date, scheduled_time 
         FROM interviews 
         WHERE candidate_id = $1 AND status != 'Completed' 
         ORDER BY scheduled_date ASC, scheduled_time ASC LIMIT 1`,
            [candidate_id]
        );
        const interview = interviewRes.rows[0] || null;

        const notifications = [];

        // If interview is scheduled, add a notification
        if (interview) {
            notifications.push({
                id: 1,
                message: `Interview scheduled for ${interview.scheduled_date}`,
                date: new Date().toLocaleDateString(),
                read: false,
            });
        }

        // If application status changed recently, add a notification
        if (latestApp && latestApp.status !== 'Submitted') {
            notifications.push({
                id: 2,
                message: `Your application status is now "${latestApp.status}"`,
                date: new Date(latestApp.created_at).toLocaleDateString(),
                read: false,
            });
        }

        // 6) Build response exactly as frontend expects
        const dashboardData = {
            name,
            stats: { total, inProgress, selected, rejected },
            status: latestApp ? {
                position: latestApp.applied_position,
                appliedDate: new Date(latestApp.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                }),
                current: latestApp.status,
            } : null,
            interview: interview ? {
                date: new Date(interview.scheduled_date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                }),
                day: new Date(interview.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long' }),
                time: interview.scheduled_time,
            } : null,
            notifications,
        };

        res.status(200).json({ status: "success", data: dashboardData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "failed", message: "Something went wrong" });
    }
};

// candidateController.js

const getStatusByEmail = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).send({ status: "failed", message: "Email is required" });
        }

        const result = await pool.query(
            `SELECT c.name, a.applied_position, a.status, a.created_at,
                    i.scheduled_date, i.scheduled_time, i.interview_type, i.meeting_link,
                    i.location, i.notes
             FROM candidates c
             JOIN applications a ON c.candidate_id = a.candidate_id
             LEFT JOIN interviews i ON c.candidate_id = i.candidate_id
             WHERE c.email = $1 AND c.is_deleted = FALSE AND a.is_deleted = FALSE
             ORDER BY a.created_at DESC LIMIT 1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).send({ status: "failed", message: "No application found for this email" });
        }

        const row = result.rows[0];
        // Build a response that matches what track.js expects
        const response = {
            id: 'some-id', // not used in track.js, but keep for compatibility
            name: row.name,
            position: row.applied_position,
            status: row.status,
            appliedDate: new Date(row.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            }),
            statuses: [
                { stage: 'Submitted', date: new Date(row.created_at).toLocaleDateString('en-GB'), description: 'Application received' },
                // you can add more stages based on the actual status if you have a status history table
                // but for now, just show the current status
                { stage: row.status, date: row.status === 'Submitted' ? new Date(row.created_at).toLocaleDateString('en-GB') : 'Pending', description: row.status }
            ],
            interview: row.scheduled_date ? {
                date: new Date(row.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                day: new Date(row.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long' }),
                time: row.scheduled_time,
                meetLink: row.meeting_link,
                interviewer: 'HR Team', // or fetch from users table if available
                notes: row.notes || ''
            } : null
        };

        res.status(200).send({ status: "success", data: response });
    } catch (error) {
        console.error(error);
        res.status(500).send({ status: "failed", message: "Something went wrong" });
    }
};

module.exports = {
    createCandidate,
    submitApplication,
    getApplicationStatus,
    getCandidateProfile,
    getDashboard,
    getStatusByEmail
}