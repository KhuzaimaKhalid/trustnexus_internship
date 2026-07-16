const pool = require('../config/connectdb');

class LeavePriorityQueue {
    constructor() { this.heap = []; }
    _calculateWeight(leave) {
        let score = 0;
        const type = leave.leave_type || '';
        if (type.includes('Sick') || type.includes('Medical')) score += 100;
        else if (type.includes('Casual')) score += 50;
        else score += 20;
        score += leave.days * 5;
        return score;
    }
    insert(leave) {
        const weight = this._calculateWeight(leave);
        this.heap.push({ data: leave, weight });
        this._bubbleUp(this.heap.length - 1);
    }
    _bubbleUp(index) {
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index].weight <= this.heap[parentIndex].weight) break;
            this._swap(index, parentIndex);
            index = parentIndex;
        }
    }
    extractMax() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop().data;
        const max = this.heap[0].data;
        this.heap[0] = this.heap.pop();
        this._sinkDown(0);
        return max;
    }
    _sinkDown(index) {
        const length = this.heap.length;
        const element = this.heap[index];
        while (true) {
            let leftChildIdx = 2 * index + 1;
            let rightChildIdx = 2 * index + 2;
            let leftChild, rightChild, swap = null;
            if (leftChildIdx < length) {
                leftChild = this.heap[leftChildIdx];
                if (leftChild.weight > element.weight) swap = leftChildIdx;
            }
            if (rightChildIdx < length) {
                rightChild = this.heap[rightChildIdx];
                if ((swap === null && rightChild.weight > element.weight) ||
                    (swap !== null && rightChild.weight > leftChild.weight)) swap = rightChildIdx;
            }
            if (swap === null) break;
            this._swap(index, swap);
            index = swap;
        }
    }
    _swap(i, j) { const t = this.heap[i]; this.heap[i] = this.heap[j]; this.heap[j] = t; }
    isEmpty() { return this.heap.length === 0; }
}

// ─── HR: view all ────────────────────────────────────
const getAllLeavesForHR = async (req, res) => {
    try {
        const query = `
            SELECT l.leave_id, l.leave_type, l.days, l.status, l.start_date, l.end_date,
                   u.name, r.name AS reviewed_by_name
            FROM leaves l
            JOIN users u ON l.user_id = u.user_id
            LEFT JOIN users r ON l.reviewed_by = r.user_id
            WHERE l.is_deleted = FALSE;
        `;
        const result = await pool.query(query);
        const pq = new LeavePriorityQueue();
        result.rows.forEach(leave => pq.insert(leave));
        const sorted = [];
        while (!pq.isEmpty()) sorted.push(pq.extractMax());
        res.status(200).json({ success: true, data: sorted });
    } catch (error) {
        console.error("Error fetching leaves:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// ─── HR: Decline OR Forward to Team Lead OR Forward straight to CFO ──
const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowed = ['Rejected', 'Forwarded to Team Lead', 'Forwarded'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status update" });
        }

        const result = await pool.query(
            `UPDATE leaves SET status = $1, reviewed_by = $2
             WHERE leave_id = $3 AND is_deleted = FALSE RETURNING *`,
            [status, req.user.user_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Leave request not found" });
        }
        res.status(200).json({ success: true, message: `Leave status updated to ${status}`, data: result.rows[0] });
    } catch (error) {
        console.error("Error updating leave status:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// ─── Team Lead: view queue ────────────────────────────
const getLeavesForTeamLead = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.leave_id, l.leave_type, l.days, l.status, l.start_date, l.end_date, u.name
             FROM leaves l JOIN users u ON l.user_id = u.user_id
             WHERE l.status = 'Forwarded to Team Lead' AND l.is_deleted = FALSE
             ORDER BY l.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// ─── Team Lead: Approve OR Reject OR Forward to CFO ──
const teamLeadUpdateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowed = ['Approved', 'Rejected', 'Forwarded'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status update" });
        }

        const result = await pool.query(
            `UPDATE leaves SET status = $1, reviewed_by = $2
             WHERE leave_id = $3 AND status = 'Forwarded to Team Lead' AND is_deleted = FALSE RETURNING *`,
            [status, req.user.user_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Leave not found or not pending your review" });
        }
        res.status(200).json({ success: true, message: `Leave ${status}`, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// ─── CFO: view queue ──────────────────────────────────
const getLeavesForCFO = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.leave_id, l.leave_type, l.days, l.status, l.start_date, l.end_date, u.name
             FROM leaves l JOIN users u ON l.user_id = u.user_id
             WHERE l.status = 'Forwarded' AND l.is_deleted = FALSE
             ORDER BY l.created_at DESC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// ─── CFO: Approve or Reject (final decision) ──────────
const cfoUpdateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowed = ['Approved by CFO', 'Rejected by CFO'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status update" });
        }

        const result = await pool.query(
            `UPDATE leaves SET status = $1, reviewed_by = $2
             WHERE leave_id = $3 AND status = 'Forwarded' AND is_deleted = FALSE RETURNING *`,
            [status, req.user.user_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Leave not found or not pending CFO review" });
        }
        res.status(200).json({ success: true, message: `Leave ${status}`, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const createLeaveRequest = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { leave_type, start_date, end_date } = req.body;

        if (!leave_type || !start_date || !end_date) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const start = new Date(start_date);
        const end = new Date(end_date);
        const timeDiff = end.getTime() - start.getTime();
        if (timeDiff < 0) {
            return res.status(400).json({ success: false, message: "End date cannot be before start date" });
        }

        const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        const result = await pool.query(
            `INSERT INTO leaves (user_id, leave_type, days, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *`,
            [userId, leave_type, days, start_date, end_date]
        );

        res.status(201).json({ success: true, message: "Leave request submitted successfully", data: result.rows[0] });
    } catch (error) {
        console.error("Error creating leave request:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

module.exports = {
    getAllLeavesForHR,
    updateLeaveStatus,
    createLeaveRequest,
    getLeavesForTeamLead,
    teamLeadUpdateStatus,
    getLeavesForCFO,
    cfoUpdateStatus
};