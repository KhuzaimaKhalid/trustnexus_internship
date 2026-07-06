const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTaskStatus, assignTask } = require('../controllers/taskController');

router.post('/createTask', createTask);               
router.get('/getTask', getTasks);                 
router.patch('/:id/status', updateTaskStatus); 
router.patch('/:id/assign', assignTask);   
module.exports = router;