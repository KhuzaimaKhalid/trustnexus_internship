const express = require('express');
const router = express.Router();
const hrMiddleware = require('../middlewares/hrMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/multerConfig')
const { createTask, getTasks, updateTaskStatus, assignTask } = require('../controllers/taskController');

router.post('/createTask', authMiddleware, hrMiddleware, upload.single('attachment'), createTask);              
router.get('/getTask', getTasks);                 
router.patch('/:id/status', updateTaskStatus); 
router.patch('/:id/assign', assignTask);   
module.exports = router;