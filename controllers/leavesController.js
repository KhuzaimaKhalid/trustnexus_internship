const pool = require('../config/connectdb');

class LeavePriorityQueue {
    constructor() {
        this.heap = [];
    }

    // Helper to calculate custom business urgency weights dynamically
    _calculateWeight(leave) {
        let score = 0;
        const type = leave.leave_type || '';
        // Weight based on leave type
        if (type.includes('Sick') || type.includes('Medical')) {
            score += 100;
        } else if (type.includes('Casual')) {
            score += 50;
        } else {
            score += 20; // Default (e.g., Annual Leave)
        }

        // Long absences take higher priority for HR review
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
            
            // If the current item's weight is less than or equal to its parent, heap property is satisfied
            if (this.heap[index].weight <= this.heap[parentIndex].weight) break;
            
            // Swap if child is heavier than parent
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
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIdx < length) {
                leftChild = this.heap[leftChildIdx];
                if (leftChild.weight > element.weight) {
                    swap = leftChildIdx;
                }
            }

            if (rightChildIdx < length) {
                rightChild = this.heap[rightChildIdx];
                if (
                    (swap === null && rightChild.weight > element.weight) || 
                    (swap !== null && rightChild.weight > leftChild.weight)
                ) {
                    swap = rightChildIdx;
                }
            }

            if (swap === null) break;
            this._swap(index, swap);
            index = swap;
        }
    }

    _swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }

    isEmpty() {
        return this.heap.length === 0;
    }
}

const getAllLeavesForHR = async (req, res) => {
    try {
        const query = `
            SELECT l.leave_id, l.leave_type, l.days, l.status, l.start_date, l.end_date, u.name
            FROM leaves l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.is_deleted = FALSE;
        `;
        
        const result = await pool.query(query);
        
        const priorityQueue = new LeavePriorityQueue();

        result.rows.forEach(leave => {
            priorityQueue.insert(leave);
        });

        const sortedUrgentLeaves = [];
        while (!priorityQueue.isEmpty()) {
            sortedUrgentLeaves.push(priorityQueue.extractMax());
        }

        res.status(200).json({ 
            success: true, 
            data: sortedUrgentLeaves 
        });

    } catch (error) {
        console.error("Error fetching sorted urgent leaves:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Allow 'Forwarded' as a valid status transition
        if (!['Approved', 'Rejected', 'Forwarded'].includes(status)) {
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

        res.status(200).json({ success: true, message: `Leave status updated to ${status} successfully.` });
    } catch (error) {
        console.error("Error updating leave status:", error);
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