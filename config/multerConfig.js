const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`
        cb(null, uniqueName)
    }
})

const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    
    const allowedMimeTypes = [
        'application/pdf',                                                         // .pdf
        'application/msword',                                                      // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'image/jpeg',                                                              // .jpeg / .jpg
        'image/png'                                                                // .png
    ]
    const mimeValid = allowedMimeTypes.includes(file.mimetype)

    // FIXED: Both extension AND binary content format must validate true
    if (ext && mimeValid) {
        cb(null, true)
    } else {
        cb(new Error('Security Validation Failed: File extension or type is invalid!'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } 
})

module.exports = upload