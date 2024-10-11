const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET; // Replace with environment variables in production

// Middleware to authenticate user using JWT
exports.authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) return res.status(401).json({ message: 'Token required' });

  const authToken = token.split(' ')[1]; // Extract the Bearer token

  jwt.verify(authToken, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    console.log("token is valid")

    req.user = user; // Add user data to request object
    next();
  });
};


// Get user profile by JWT token
exports.getUserProfile = async (req, res) => {
  const { userId } = req.params
  console.log(userId)

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  const { userId } = req.params;
  const data = req.body; // Data from the request body

  try {
    // Ensure at least one field is provided to update
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    // Perform the update with the provided data
    const updatedUser = await prisma.user.update({
      where: { telegramId: userId },
      data: {
        ...data // Spread the fields provided in the request body
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Fetch all users (for admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
    });
console.log(users)

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user balance (add/subtract balance)
exports.updateUserBalance = async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { telegramId: userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedBalance = user.balance + amount;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: updatedBalance,
      },
      select: {
        id: true,
        balance: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Function to get all users referred by a specific user
exports.getReferredUsers = async (req, res) => {
  const { userId } = req.params;

  try {
    // Step 1: Find the user with the given telegramId
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
    });

    // If the user is not found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 2: Fetch all referrals made by the user
    const referrals = await prisma.referral.findMany({
      where: {
        userId: userId, // Use the telegramId directly as the userId in the query
      },
    });

    // Step 3: Fetch the details of each referred user using the referredId
    const referredUsers = await Promise.all(
      referrals.map((referral) =>
        prisma.user.findUnique({
          where: {
            id: referral.referredId, // Use the referredId which is the ObjectId
          },
        })
      )
    );

    // Step 4: Return the list of referred users
    res.json({ referredUsers });

  } catch (error) {
    console.error("Error fetching referred users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.refillTaps = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Fetch the user details
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { lastRefillTime, taps, maxTaps } = user;
    const now = new Date();

    // Calculate the time difference in seconds
    const secondsSinceLastRefill = Math.floor((now - new Date(lastRefillTime)) / 1000); // 1000ms = 1 second

    // Calculate how many taps should be refilled
    // A full refill takes 3600 seconds, so we refill (maxTaps / 3600) taps per second.
    const tapsPerSecond = maxTaps / 3600;
    const refilledTaps = Math.min(secondsSinceLastRefill * tapsPerSecond, maxTaps - taps);

    // Only update if there's a change
    if (refilledTaps > 0) {
      const updatedUser = await prisma.user.update({
        where: { telegramId: userId  },
        data: {
          taps: Math.min(taps + refilledTaps, maxTaps), // Ensure taps don't exceed maxTaps
          lastRefillTime: now, // Update the last refill time to now
        },
      });

      return res.status(200).json({
        message: 'Taps refilled successfully',
        user: updatedUser,
      });
    } else {
      // If no refill is needed (e.g., taps are already full or no time has passed)
      return res.status(200).json({
        message: 'No refill needed',
        user,
      });
    }
  } catch (error) {
    console.error('Error refilling taps:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

