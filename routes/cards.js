const express = require('express');
const router = express.Router();
const {createCard, getAllCards, getCardById, deleteCard, updateCard, createMultipleCards, getCardsByCategory, upgradeCard, purchaseCard
} = require('../controllers/cards')
const {authenticateToken} = require('../controllers/users')




// Route for creating a new card
router.post('/cards', createCard);

router.post('/cards/all', createMultipleCards)

// Route for getting all cards
router.get('/cards',authenticateToken, getAllCards);

// Route for getting a card by ID
router.get('/cards/:cardId', getCardById);

// Route for updating a card by ID
router.put('/cards/:cardId', updateCard);

// Route for deleting a card by ID
router.delete('/cards/:cardId', deleteCard);

router.get('/cards/category/:category', authenticateToken, getCardsByCategory);

router.post('/cards/purchase', purchaseCard);

router.post('/cards/upgrade', upgradeCard);

module.exports = router;