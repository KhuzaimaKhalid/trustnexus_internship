const pool = require('../config/connectdb');

const getAllLeavesForHR = async (req, res) => {
    try {
        const query = `
            SELECT l.leave_id, l.leave_type, l.days, l.status, l.start_date, l.end_date, u.name
            FROM leaves l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.is_deleted = FALSE
            ORDER BY l.created_at DESC;
        `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching all leaves:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status update" });
        }

        const query = `
            UPDATE leaves 
            SET status = $1 
            WHERE leave_id = $2 AND is_deleted = FALSE 
            RETURNING *;
        `;
        const result = await pool.query(query, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Leave request not found" });
        }

        res.status(200).json({ success: true, message: `Leave application ${status} successfully.` });
    } catch (error) {
        console.error("Error updating leave status:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const createLeaveRequest = async (req, res) => {
    try {
        const userId = req.user.user_id; // From authMiddleware
        const { leave_type, start_date, end_date } = req.body;

        // Validation
        if (!leave_type || !start_date || !end_date) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Calculate days automatically
        const start = new Date(start_date);
        const end = new Date(end_date);
        const timeDiff = end.getTime() - start.getTime();

        if (timeDiff < 0) {
            return res.status(400).json({ success: false, message: "End date cannot be before start date" });
        }

        const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Including boundary day

        const query = `
            INSERT INTO leaves (user_id, leave_type, days, start_date, end_date, status)
            VALUES ($1, $2, $3, $4, $5, 'Pending')
            RETURNING *;
        `;
        const result = await pool.query(query, [userId, leave_type, days, start_date, end_date]);

        res.status(201).json({
            success: true,
            message: "Leave request submitted successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error creating leave request:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

module.exports = {
    getAllLeavesForHR,
    updateLeaveStatus,
    createLeaveRequest
};