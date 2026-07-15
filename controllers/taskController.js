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

        // 1. Get candidate_id and current application
        const candidateRes = await pool.query(
            'SELECT candidate_id FROM candidates WHERE user_id = $1 AND is_deleted = FALSE',
            [userId]
        );

        if (candidateRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Candidate profile not found." });
        }
        const candidateId = candidateRes.rows[0].candidate_id;

        // 2. Handle file upload (if files are attached)
        let fileUrl = null;
        if (req.file) {
            const fileName = `task-submissions/${candidateId}-${Date.now()}-${req.file.originalname}`;
            const blob = await put(fileName, req.file.buffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                contentType: req.file.mimetype,
            });
            fileUrl = blob.url;
        }

        // 3. Update the candidate's application status to 'Task Submitted'
        const updateAppQuery = `
            UPDATE applications 
            SET status = 'Task Submitted', updated_at = NOW()
            WHERE candidate_id = $1 AND is_deleted = FALSE
            RETURNING *;
        `;
        const updatedApp = await pool.query(updateAppQuery, [candidateId]);

        if (updatedApp.rows.length === 0) {
            return res.status(404).json({ success: false, message: "No active application found to attach task to." });
        }

        // 4. Save the submission details to your database (e.g., tasks or a new task_submissions table)
        // If you don't have a task_submissions table yet, you can log it or insert it into your documents/tasks structure.
        // Here, we'll return a success response showing the status has changed.
        res.status(200).json({
            success: true,
            message: "Task assessment submitted successfully!",
            data: {
                status: 'Task Submitted',
                fileUrl,
                repository_link,
                comments
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

module.exports = {
    createTask,
    getTasks,
    updateTaskStatus,
    assignTask,
    submitCandidateTask
};