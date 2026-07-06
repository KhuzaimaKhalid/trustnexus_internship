const pool = require('../config/connectdb');

const createTask = async (req, res) => {
    const { project_id, title, description, assigned_to, due_date } = req.body;

    if (!project_id || !title) {
        return res.status(400).json({ success: false, message: 'Project ID and Title are required.' });
    }

    try {
        const query = `
            INSERT INTO tasks (project_id, title, description, assigned_to, due_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await pool.query(query, [project_id, title, description, assigned_to, due_date]);
        res.status(201).json({ success: true, message: 'Task created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ success: false, message: 'Server error while creating task.' });
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
    assignTask
};