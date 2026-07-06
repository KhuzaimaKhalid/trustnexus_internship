const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const projectController = require('../controllers/projectController');
const { createProject, getAllProjects, getProjectById,updateProject, deleteProject, assignProjectRole } = require('../controllers/projectController');

router.post('/createProject', authMiddleware,createProject);
router.get('/getAllProjects', authMiddleware,getAllProjects);
router.get('/my-project', authMiddleware, getProjectById);
router.put('/updateProject/:id', updateProject);              
router.delete('/deleteProject/:id', deleteProject);              
router.post('/assignRole/:id', assignProjectRole);    

module.exports = router;