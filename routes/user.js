const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  updateUserBalance,
  authenticateToken,
  getReferredUsers,
  refillTaps
} = require('../controllers/users');





const router = express.Router();

// Get current user's profile
router.get('/profile/:userId',  getUserProfile);

// Update current user's profile
router.put('/profile/:userId', updateUserProfile);

router.get('/users', authenticateToken, getAllUsers )

router.get('/users/:userId', authenticateToken, getReferredUsers )

// Update user's balance (increase/decrease)
router.put('/balance/:userId',  updateUserBalance);

router.post('/user/refill', refillTaps)

module.exports = router;

