const pool = require('../config/connectdb');

const getHRDashboardMetrics = async (req, res) => {
    try {
        // 1. Total Candidates in Pipeline (Not deleted)
        const totalCandidatesQuery = `SELECT COUNT(*) FROM candidates WHERE is_deleted = false`;
        const totalCandidatesResult = await pool.query(totalCandidatesQuery);

        // 2. Interviews scheduled for today
        const todaysInterviewsQuery = `
            SELECT c.name, c.applied_position, i.scheduled_time, i.interview_id
            FROM interviews i
            JOIN candidates c ON i.candidate_id = c.candidate_id
            WHERE i.scheduled_date = CURRENT_DATE 
              AND c.is_deleted = false
            ORDER BY i.scheduled_time ASC
        `;
        const todaysInterviewsResult = await pool.query(todaysInterviewsQuery);

        // 3. Active Projects count
        const activeProjectsQuery = `SELECT COUNT(*) FROM projects WHERE is_deleted = false`;
        const activeProjectsResult = await pool.query(activeProjectsQuery);

        // 4. Interviews this upcoming week (Next 7 days)
        const weeklyInterviewsQuery = `
            SELECT COUNT(*) FROM interviews 
            WHERE scheduled_date >= CURRENT_DATE 
              AND scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
        `;
        const weeklyInterviewsResult = await pool.query(weeklyInterviewsQuery);

        // Send formatted dataset directly matching your layout components
        res.status(200).json({
            success: true,
            data: {
                stats: {
                    openPositions: 7, // Placeholder value
                    pipelineTotal: parseInt(totalCandidatesResult.rows[0].count || 0),
                    pendingLeaves: 2, // Placeholder value until leave_management table is introduced
                    interviewsThisWeek: parseInt(weeklyInterviewsResult.rows[0].count || 0),
                    activeProjects: parseInt(activeProjectsResult.rows[0].count || 0)
                },
                todaysInterviews: todaysInterviewsResult.rows.map(row => ({
                    name: row.name,
                    role: row.applied_position,
                    time: row.scheduled_time,
                    interview_id: row.interview_id
                }))
            }
        });

    } catch (error) {
        console.error("Error calculating HR metrics:", error);
        res.status(500).json({ success: false, message: "Error compiling dashboard statistics" });
    }
};

module.exports = { getHRDashboardMetrics };