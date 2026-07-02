const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const projectController = require('../controllers/projectController');

router.post('/createProject', authMiddleware, projectController.createProject);
router.get('/getAllProjects', authMiddleware, projectController.getAllProjects);
router.get('/my-project', authMiddleware, projectController.getProjectById);

module.exports = router;