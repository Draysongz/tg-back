const express = require('express');
const router = express.Router();
const taskController = require('../controllers/tasks');

// Task routes

// Route for creating multiple tasks in batch
router.post('/tasks/batch', taskController.createBatchTasks);

// Route for creating a single task
router.post('/tasks', taskController.createTask);

// Route for getting tasks (optional filter by category)
router.get('/tasks', taskController.getTasks);

// User Task routes

// Route for claiming a task reward
router.post('/tasks/claim', taskController.claimTaskReward);

// Route for getting a user's tasks with their status
router.get('/user/:userId/tasks', taskController.getUserTasks);

module.exports = router;
