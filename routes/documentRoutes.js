const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const upload = require('../config/multerConfig')
const { uploadDocuments, getMyDocuments } = require('../controllers/documentController')

router.post(
    '/',
    authMiddleware,
    upload.fields([
        { name: 'resume', maxCount: 1 },
        { name: 'cnicFront', maxCount: 1 },
        { name: 'cnicBack', maxCount: 1 }
    ]),
    uploadDocuments
)

router.get('/my-documents', authMiddleware, getMyDocuments)

module.exports = router