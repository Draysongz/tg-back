const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createBatchTasks = async (req, res) => {
  const { tasks } = req.body; // Expecting an array of tasks in the request body

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ message: 'Invalid input, no tasks provided' });
  }

  try {
    // Prepare the batch creation of tasks
    const taskCreationPromises = tasks.map((task) => {
      return prisma.task.create({
        data: {
          category: task.category, // INVITE or CHALLENGE
          description: task.description,
          levelName: task.levelName || null, // Only for CHALLENGE tasks
          reward: task.reward,
          requiredInvites: task.requiredInvites || null, // Only for INVITE tasks
        },
      });
    });

    // Execute all task creations
    const createdTasks = await Promise.all(taskCreationPromises);

    res.status(201).json({
      message: 'Tasks created successfully',
      tasks: createdTasks,
    });
  } catch (error) {
    console.error('Error creating batch tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.createTask = async (req, res) => {
  const { category, description, reward, levelName, requiredInvites } = req.body;

  try {
    // Create a new task
    const newTask = await prisma.task.create({
      data: {
        category: category.toUpperCase(),
        description,
        reward,
        levelName: levelName || null,
        requiredInvites: requiredInvites || null,
      },
    });

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTasks = async (req, res) => {
  const { category } = req.query; // Optional query parameter to filter by category

  try {
    const tasks = await prisma.task.findMany({
      where: category ? { category: category.toUpperCase() } : {},
    });

    res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.claimTaskReward = async (req, res) => {
  const { userId, taskId } = req.body;

  try {
    // Fetch the user's task to ensure it's unclaimed
     const user = await prisma.user.findUnique({
      where: { telegramId : userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userTask = await prisma.userTask.findFirst({
      where: {
        userId: user.id,
        taskId,
        claimed: false, // Ensure it hasn't been claimed yet
      },
      include: { task: true },
    });

    if (!userTask) {
      return res.status(400).json({ message: 'Task not found or already claimed' });
    }

    // Fetch the task details
    const task = userTask.task;

    // Update the user's coins and mark the task as claimed
    const updatedUser = await prisma.user.update({
      where: { telegramId: userId },
      data: {
        coins: {
          increment: task.reward, // Increment coins by the reward amount
        },
      },
    });

    // Mark the task as claimed
    const updatedTask = await prisma.userTask.update({
      where: { id: userTask.id },
      data: {
        claimed: true,
      },
    });

    res.status(200).json({
      message: 'Reward claimed successfully',
      reward: task.reward,
      updatedTask,
      updatedUser,
    });
  } catch (error) {
    console.error('Error claiming task reward:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getUserTasks = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId : userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userTasks = await prisma.userTask.findMany({
      where: { userId: user.id }, // Use the user's unique `id` field
      include: {
        task: true, // Include task details
      },
    });

    res.status(200).json({
      userTasks,
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

