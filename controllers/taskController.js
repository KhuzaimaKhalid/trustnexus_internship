const pool = require('../config/connectdb');
const { put } = require('@vercel/blob');

const createTask = async (req, res) => {
    const {
        project_id, project_name, title, description,
        assigned_to, assignee_name, reporter, priority,
        start_date, due_date, team, status,
    } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    try {
        let attachmentPath = null;
        if (req.file) {
            const fileName = `tasks/${Date.now()}-${req.file.originalname}`;
            const blob = await put(fileName, req.file.buffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                contentType: req.file.mimetype,
            });
            attachmentPath = blob.url;
        }

        const query = `
            INSERT INTO tasks (
                project_id, project_name, title, description,
                assigned_to, assignee_name, reporter, priority,
                start_date, due_date, team, attachment_path, status
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *;
        `;
        const values = [
            project_id || null, project_name || null, title, description || null,
            assigned_to || null, assignee_name || null, reporter || null,
            priority || 'Medium', start_date || null, due_date || null,
            team || null, attachmentPath, status || 'Todo',
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Task created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ success: false, message: 'Server error while creating task.' });
    }
};

const submitCandidateTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { repository_link, comments } = req.body;

        // 1. Get candidate_id
        const candidateRes = await pool.query(
            'SELECT candidate_id FROM candidates WHERE user_id = $1 AND is_deleted = FALSE',
            [userId]
        );

        if (candidateRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Candidate profile not found." });
        }
        const candidateId = candidateRes.rows[0].candidate_id;

        // 2. Handle file upload (if files are attached)
        // Change this block in your submitCandidateTask controller:
        let fileUrl = null;

        // Since the route uses upload.array('attachments'), Multer populates req.files
        if (req.files && req.files.length > 0) {
            const uploadedFile = req.files[0]; // Grab the first file
            const fileName = `task-submissions/${candidateId}-${Date.now()}-${uploadedFile.originalname}`;
            const blob = await put(fileName, uploadedFile.buffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                contentType: uploadedFile.mimetype,
            });
            fileUrl = blob.url;
        }

        // 3. Update the candidate's application status to 'Task Submitted'
        const updateAppQuery = `
            UPDATE applications 
            SET status = 'Task Submitted', updated_at = NOW()
            WHERE candidate_id = $1 AND is_deleted = FALSE
            RETURNING application_id, status;
        `;
        const updatedApp = await pool.query(updateAppQuery, [candidateId]);

        if (updatedApp.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No active application found to attach task to." });
        }

        const applicationId = updatedApp.rows[0].application_id;

        // 4. PERSIST: Save the submission details to the database!
        const submissionQuery = `
            INSERT INTO task_submissions (candidate_id, application_id, file_url, repository_link, comments)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const submissionResult = await pool.query(submissionQuery, [
            candidateId,
            applicationId,
            fileUrl,
            repository_link || null,
            comments || null
        ]);

        res.status(200).json({
            success: true,
            message: "Task assessment submitted successfully!",
            data: {
                status: 'Task Submitted',
                submission: submissionResult.rows[0]
            }
        });

    } catch (error) {
        console.error("Task submission error:", error);
        res.status(500).json({ success: false, message: "Server error during task submission." });
    }
};
const getTasks = async (req, res) => {
    const { project_id } = req.query;
    try {
        let query = `
            SELECT t.*, u.name AS assigned_user_name 
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.user_id
        `;
        const values = [];

        if (project_id) {
            query += ` WHERE t.project_id = $1`;
            values.push(project_id);
        }

        query += ` ORDER BY t.created_at DESC;`;

        const result = await pool.query(query, values);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ success: false, message: 'Server error while retrieving tasks.' });
    }
};

const updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ success: false, message: 'Status field is required.' });
    }

    try {
        const query = `
            UPDATE tasks 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE task_id = $2 
            RETURNING *;
        `;
        const result = await pool.query(query, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        res.status(200).json({ success: true, message: 'Task status updated.', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ success: false, message: 'Server error updating task status.' });
    }
};

const getSubmissionDetails = async (req, res) => {
    try {
        const { candidateId } = req.params;

        // Fetch application and submission details
        const query = `
            SELECT 
                c.name,
                c.applied_position,
                a.status as application_status,
                ts.file_url,
                ts.repository_link,
                ts.comments,
                ts.created_at as task_submitted_date
            FROM candidates c
            JOIN applications a ON c.candidate_id = a.candidate_id
            LEFT JOIN task_submissions ts ON c.candidate_id = ts.candidate_id
            WHERE c.candidate_id = $1 AND c.is_deleted = FALSE AND a.is_deleted = FALSE
            ORDER BY ts.created_at DESC LIMIT 1;
        `;

        const result = await pool.query(query, [candidateId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No active submission found for this candidate." });
        }

        const row = result.rows[0];

        // Format the output payload to match what the frontend's View Submission expects
        const responseData = {
            candidateName: row.name,
            position: row.applied_position,
            status: row.application_status,
            submission_title: `${row.applied_position} Task Submission`,
            task_submitted_date: row.task_submitted_date,
            task_attachments: row.file_url ? [{ name: "Submission Attachment", url: row.file_url }] : [],
            task_links: row.repository_link ? [{ label: "Repository Link", url: row.repository_link }] : [],
            task_comments: row.comments || "No notes provided."
        };

        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        console.error("Error fetching submission details:", error);
        res.status(500).json({ success: false, message: "Server error while retrieving submission." });
    }
};

const assignTask = async (req, res) => {
    const { id } = req.params;
    const { assigned_to } = req.body;

    try {
        const query = `
            UPDATE tasks 
            SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE task_id = $2 
            RETURNING *;
        `;
        const result = await pool.query(query, [assigned_to, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        res.status(200).json({ success: true, message: 'Task assignment updated.', data: result.rows[0] });
    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({ success: false, message: 'Server error assigning task.' });
    }
};

const deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM tasks WHERE task_id = $1 RETURNING task_id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }
        res.status(200).json({ success: true, message: 'Task deleted.', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting task.' });
    }
};

const bulkDeleteTasks = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required.' });
    }
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE task_id = ANY($1::int[]) RETURNING task_id',
            [ids]
        );
        res.status(200).json({ success: true, message: `${result.rows.length} task(s) deleted.`, deletedIds: result.rows.map(r => r.task_id) });
    } catch (error) {
        console.error('Error bulk deleting tasks:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting tasks.' });
    }
};

module.exports = {
    createTask,
    getTasks,
    updateTaskStatus,
    assignTask,
    submitCandidateTask,
    getSubmissionDetails,
    deleteTask,
    bulkDeleteTasks
};