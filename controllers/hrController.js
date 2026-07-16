const pool = require('../config/connectdb');

const getHRDashboardMetrics = async (req, res) => {
    try {
        // 1. Total Candidates in Pipeline (Not deleted)
        const totalCandidatesQuery = `SELECT COUNT(*) FROM candidates WHERE is_deleted = false`;
        const totalCandidatesResult = await pool.query(totalCandidatesQuery);

        // 2. Interviews scheduled for today
        // NOTE: position now comes from the candidate's latest application
        // (applications.applied_position), not candidates.applied_position,
        // which is a stale value set once at registration and never updated.
        const todaysInterviewsQuery = `
            SELECT c.name, la.applied_position, i.scheduled_time, i.interview_id
            FROM interviews i
            JOIN candidates c ON i.candidate_id = c.candidate_id
            LEFT JOIN LATERAL (
                SELECT applied_position
                FROM applications
                WHERE candidate_id = c.candidate_id AND is_deleted = FALSE
                ORDER BY created_at DESC
                LIMIT 1
            ) la ON true
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

        // 5. Dynamic Recruitment Pipeline Breakdown
        // Aggregates real application statuses from your enum/status column
        const pipelineStagesQuery = `
            SELECT status, COUNT(*) as count 
            FROM applications 
            WHERE is_deleted = false 
            GROUP BY status
        `;
        const pipelineStagesResult = await pool.query(pipelineStagesQuery);
        
        // Map database statuses into a clean key-value lookup
        const pipelineMap = {};
        pipelineStagesResult.rows.forEach(row => {
            pipelineMap[row.status] = parseInt(row.count || 0);
        });

        // 6. Dynamic Open Positions Count (Distinct roles currently being applied for)
        const openPositionsQuery = `SELECT COUNT(DISTINCT applied_position) FROM applications WHERE is_deleted = false`;
        const openPositionsResult = await pool.query(openPositionsQuery);

        // 7. Dynamic Recent Activities (Combining recent applications and document uploads)
        const dynamicActivitiesQuery = `
            (
                SELECT 
                    'app_' || a.application_id AS id,
                    'New Application Received' AS title,
                    c.name || ' applied for ' || a.applied_position AS description,
                    a.created_at
                FROM applications a
                JOIN candidates c ON a.candidate_id = c.candidate_id
                WHERE a.is_deleted = false
            )
            UNION ALL
            (
                SELECT 
                    'doc_' || d.document_id AS id,
                    'Onboarding Document Submitted' AS title,
                    c.name || ' uploaded required files' AS description,
                    d.created_at
                FROM documents d
                JOIN candidates c ON d.candidate_id = c.candidate_id
                WHERE d.is_deleted = false
            )
            ORDER BY created_at DESC
            LIMIT 5
        `;
        const dynamicActivitiesResult = await pool.query(dynamicActivitiesQuery);

        // Send fully accurate dataset matching your available Postgres tables
        res.status(200).json({
            success: true,
            data: {
                stats: {
                    openPositions: parseInt(openPositionsResult.rows[0].count || 0),
                    pipelineTotal: parseInt(totalCandidatesResult.rows[0].count || 0),
                    pendingLeaves: 0, // 0 leaves because the table layout does not exist yet
                    interviewsThisWeek: parseInt(weeklyInterviewsResult.rows[0].count || 0),
                    activeProjects: parseInt(activeProjectsResult.rows[0].count || 0)
                },
                todaysInterviews: todaysInterviewsResult.rows.map(row => ({
                    name: row.name,
                    role: row.applied_position,
                    time: row.scheduled_time,
                    interview_id: row.interview_id
                })),
                pipelineBreakdown: {
                    applied: pipelineMap['Submitted'] || 0,
                    taskSubmitted: pipelineMap['Task Submitted'] || 0,
                    interviewScheduled: pipelineMap['Interview Scheduled'] || 0,
                    interviewed: pipelineMap['Interviewed'] || 0,
                    selected: pipelineMap['Selected'] || 0,
                    onboarded: pipelineMap['Onboarded'] || 0
                },
                pendingLeaveList: [], // Clean empty array; avoids crashing frontend with fake values
                recentActivities: dynamicActivitiesResult.rows.map(row => ({
                    id: row.id,
                    title: row.title,
                    desc: row.description
                }))
            }
        });

    } catch (error) {
        console.error("Error calculating HR metrics:", error);
        res.status(500).json({ success: false, message: "Error compiling dashboard statistics" });
    }
};

module.exports = { getHRDashboardMetrics };