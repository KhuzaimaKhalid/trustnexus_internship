const multer = require('multer')
const path = require('path')

const storage = multer.memoryStorage() // 🟢 Perfect for streaming directly to the cloud

const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    ]
    const mimeValid = allowedMimeTypes.includes(file.mimetype)

    if (ext && mimeValid) {
        cb(null, true)
    } else {
        cb(new Error('Security Validation Failed: File extension or type is invalid!'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 4.5 * 1024 * 1024 } // ⚠️ Note: Vercel serverless has a 4.5MB request payload limit
})

module.exports = upload