const pool = require('../config/connectdb')

const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.user_id
        const { receiverId, subject, body } = req.body

        if (!receiverId || !body) {
            return res.status(400).send({
                "status": "failed",
                "message": "receiverId and body are required"
            })
        }

        const result = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, subject, body)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [senderId, receiverId, subject || null, body]
        )

        res.status(201).send({
            "status": "success",
            "message": "Message sent successfully",
            data: result.rows[0]
        })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const getInbox = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role; // 👈 Extract the user's role

        let result;

        if (userRole === 'HR') {
            result = await pool.query(
                `SELECT m.*, u.name as sender_name
                 FROM messages m
                 JOIN users u ON u.user_id = m.sender_id
                 ORDER BY m.created_at DESC`
            );
        } else {
            result = await pool.query(
                `SELECT m.*, u.name as sender_name
                 FROM messages m
                 JOIN users u ON u.user_id = m.sender_id
                 WHERE m.receiver_id = $1
                 ORDER BY m.created_at DESC`,
                [userId]
            );
        }

        res.status(200).send({ "status": "success", messages: result.rows });

    } catch (error) {
        console.log(error);
        res.status(500).send({ "status": "failed", "message": "Something went wrong" });
    }
};



module.exports = {
    sendMessage,
    getInbox
}