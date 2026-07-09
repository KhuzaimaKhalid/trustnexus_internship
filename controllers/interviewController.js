const pool = require('../config/connectdb')

const updateInterviewOutcome = async (req, res) => {
    try {
        const { interviewId, outcome, notes, candidateStatus } = req.body

        if (!interviewId || !outcome) {
            return res.status(400).send({
                "status": "failed",
                "message": "interviewId and outcome status are required"
            })
        }

        const updatedInterview = await pool.query(
            'UPDATE interviews SET status = $1, notes = $2, updated_at = NOW() WHERE interview_id = $3 RETURNING *',
            [outcome, notes, interviewId]
        )

        if (updatedInterview.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Interview record not found" })
        }

        let candidateData = null;
        if (candidateStatus) {
            const candidateResult = await pool.query(
                'UPDATE candidates SET status = $1, updated_at = NOW() WHERE candidate_id = $2 RETURNING *',
                [candidateStatus, updatedInterview.rows[0].candidate_id]
            )
            candidateData = candidateResult.rows[0];
        }

        res.status(200).send({
            "status": "success",
            "message": "Interview outcome updated successfully",
            interview: updatedInterview.rows[0],
            candidate: candidateData
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const scheduleInterview = async (req, res) => {
    try {
        const { candidateId, scheduledDate, scheduledTime, interviewType, location, meetingLink, interviewer } = req.body

        if (!candidateId || !scheduledDate || !scheduledTime || !interviewType) {
            return res.status(400).send({
                "status": "failed",
                "message": "candidateId, scheduledDate, scheduledTime and interviewType are required"
            })
        }

        const checkCandidate = await pool.query('SELECT * FROM candidates WHERE candidate_id = $1 AND is_deleted = false', [candidateId])
        if (checkCandidate.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Candidate not found" })
        }

        const interviewResult = await pool.query(
            `INSERT INTO interviews (candidate_id, scheduled_date, scheduled_time, interview_type, location, meeting_link, interviewer, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Scheduled') RETURNING *`,
            [candidateId, scheduledDate, scheduledTime, interviewType, location, meetingLink, interviewer]
        )

        const updatedCandidate = await pool.query(
            'UPDATE candidates SET status = $1, updated_at = NOW() WHERE candidate_id = $2 RETURNING *',
            ['Under Review', candidateId]
        )

        res.status(200).send({
            "status": "success",
            "message": "Interview scheduled successfully",
            candidate: updatedCandidate.rows[0],
            interview: interviewResult.rows[0]
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const getInterviewDetails = async (req, res) => {
    try {
        const queryText = `
    SELECT c.candidate_id, c.name, c.applied_position, c.status as candidate_status,
           i.interview_id, i.scheduled_date, i.scheduled_time, i.interview_type, i.status as interview_status,
           i.location, i.meeting_link, i.interviewer, i.notes
    FROM candidates c
    LEFT JOIN interviews i ON c.candidate_id = i.candidate_id
    WHERE c.user_id = $1 AND c.is_deleted = false
    ORDER BY i.created_at DESC LIMIT 1
`;

        const profileResult = await pool.query(queryText, [req.user.user_id])

        if (profileResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Candidate profile or interview data not found" })
        }

        res.status(200).send({
            "status": "success",
            data: profileResult.rows[0]
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const getCandidateList = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM candidates WHERE is_deleted = false ORDER BY created_at DESC');
        res.status(200).send({ "status": "success", candidates: result.rows });
    } catch (error) {
        console.log(error);
        res.status(500).send({ "status": "failed", "message": "Something went wrong" });
    }
}

const getUpcomingInterviews = async (req, res) => {
    try {
        const queryText = `
            SELECT i.interview_id, i.scheduled_date, i.scheduled_time, i.interview_type,
                   i.status as interview_status, i.location, i.meeting_link, i.interviewer,
                   c.candidate_id, c.name, c.applied_position
            FROM interviews i
            JOIN candidates c ON c.candidate_id = i.candidate_id
            WHERE c.is_deleted = false
              AND i.scheduled_date >= CURRENT_DATE
              AND i.status = 'Scheduled'
            ORDER BY i.scheduled_date ASC, i.scheduled_time ASC
        `;

        const result = await pool.query(queryText);
        res.status(200).send({ "status": "success", "interviews": result.rows })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

module.exports = {
    scheduleInterview,
    updateInterviewOutcome,
    getInterviewDetails,
    getCandidateList,
    getUpcomingInterviews
}