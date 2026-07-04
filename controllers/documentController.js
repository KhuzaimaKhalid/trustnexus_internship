const { put } = require('@vercel/blob')
const pool = require('../config/connectdb')

const uploadDocuments = async (req, res) => {
    try {
        const candidateResult = await pool.query(
            'SELECT candidate_id FROM candidates WHERE user_id = $1 AND is_deleted = FALSE',
            [req.user.user_id]
        )

        if (candidateResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Create your candidate profile first" })
        }

        const candidate_id = candidateResult.rows[0].candidate_id

        if (!req.files['resume'] || !req.files['cnicFront'] || !req.files['cnicBack']) {
            return res.status(400).send({ "status": "failed", "message": "CV, CNIC front and CNIC back are all required" })
        }

        const existingDocs = await pool.query('SELECT * FROM documents WHERE candidate_id = $1 AND is_deleted = FALSE', [candidate_id])
        if (existingDocs.rows.length > 0) {
            return res.status(400).send({ "status": "failed", "message": "Documents already uploaded" })
        }

        const resumeFile = req.files['resume'][0]
        const cnicFrontFile = req.files['cnicFront'][0]
        const cnicBackFile = req.files['cnicBack'][0]

        const cvBlob = await put(`resumes/${candidate_id}-${Date.now()}-${resumeFile.originalname}`, resumeFile.buffer, { access: 'public' })
        const cnicFrontBlob = await put(`cnic/${candidate_id}-${Date.now()}-${cnicFrontFile.originalname}`, cnicFrontFile.buffer, { access: 'public' })
        const cnicBackBlob = await put(`cnic/${candidate_id}-${Date.now()}-${cnicBackFile.originalname}`, cnicBackFile.buffer, { access: 'public' })

        const newDoc = await pool.query(
            `INSERT INTO documents (candidate_id, cv_path, cnic_front_path, cnic_back_path) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [candidate_id, cvBlob.url, cnicFrontBlob.url, cnicBackBlob.url]
        )

        res.status(201).send({ "status": "success", "message": "Documents uploaded successfully", document: newDoc.rows[0] })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

const getMyDocuments = async (req, res) => {
    try {
        const candidateResult = await pool.query('SELECT candidate_id FROM candidates WHERE user_id = $1 AND is_deleted = FALSE', [req.user.user_id])

        if (candidateResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "Candidate profile not found" })
        }

        const candidate_id = candidateResult.rows[0].candidate_id
        const documentsResult = await pool.query(
            'SELECT * FROM documents WHERE candidate_id = $1 AND is_deleted = FALSE',
            [candidate_id]
        )

        if (documentsResult.rows.length === 0) {
            return res.status(404).send({ "status": "failed", "message": "No documents found" })
        }

        res.status(200).send({ "status": "success", documents: documentsResult.rows[0] })

    } catch (error) {
        console.log(error)
        res.status(500).send({ "status": "failed", "message": "Something went wrong" })
    }
}

module.exports = { uploadDocuments, getMyDocuments }