const express = require('express');
const router = express.Router();
const hrMiddleware = require('../middlewares/hrMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/multerConfig')
const {
    createTask, getTasks, updateTaskStatus, assignTask,
    submitCandidateTask, getSubmissionDetails, deleteTask, bulkDeleteTasks
} = require('../controllers/taskController');

router.post('/createTask', authMiddleware, hrMiddleware, upload.single('attachment'), createTask);
router.post('/submit', authMiddleware, upload.array('attachments'), submitCandidateTask);
router.get('/getTask', authMiddleware, getTasks);
router.patch('/:id/status', authMiddleware, updateTaskStatus);
router.patch('/:id/assign', authMiddleware, assignTask);
router.delete('/:id', authMiddleware, hrMiddleware, deleteTask);
router.post('/bulk-delete', authMiddleware, hrMiddleware, bulkDeleteTasks);
router.get('/submission/:candidateId', authMiddleware, getSubmissionDetails);

module.exports = router;