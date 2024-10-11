const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


exports.createMultipleCards = async (req, res) => {
  const { cards } = req.body;

  // Validate that 'cards' is an array
  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ message: "Invalid request. 'cards' should be a non-empty array." });
  }

  try {
    // Create each card using the data provided in the 'cards' array
    const createdCards = await Promise.all(
      cards.map((card) => {
        // Destructure card properties with default values for optional fields
        const {
          name,
          category,
          baseProfit,
          profitIncrease,
          maxLevel,
          baseCost,
          costIncrease ,
          requires ,
          imagePath,
          coinIcon
        } = card;

        // Create a card in the database
        return prisma.card.create({
          data: {
            name,
            category,
            baseProfit,
            profitIncrease,
            maxLevel,
            baseCost,
            costIncrease,
            requires,
            imagePath,
            coinIcon
          }
        });
      })
    );

    // Return the array of created cards
    res.status(201).json(createdCards);
  } catch (error) {
    console.error('Error creating multiple cards:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
// Create a new card
exports.createCard = async (req, res) => {
  const { name, category, baseProfit, profitIncrease, maxLevel } = req.body;

  try {
    const card = await prisma.card.create({
      data: {
        name,
        category,
        baseProfit,
        profitIncrease,
        maxLevel,
      },
    });

    res.status(201).json(card);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all cards
exports.getAllCards = async (req, res) => {
  try {
    const cards = await prisma.card.findMany();
    res.status(200).json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get a single card by ID
exports.getCardById = async (req, res) => {
  const { cardId } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    res.status(200).json(card);
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update a card by ID
exports.updateCard = async (req, res) => {
  const { cardId } = req.params;
  const data = req.body;

  try {
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...data,
      },
    });

    res.status(200).json(updatedCard);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a card by ID
exports.deleteCard = async (req, res) => {
  const { cardId } = req.params;

  try {
    await prisma.card.delete({
      where: { id: cardId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Example of a controller method for getting all cards with user-specific details
exports.getCardsByCategory = async (req, res) => {
  const { category } = req.params;
  const { userId } = req.query; // Assume userId is passed as a query parameter

  try {
    // Fetch all cards in the specified category
    const cards = await prisma.card.findMany({
      where: {
        category: category.toUpperCase(),
      },
    });

    // Fetch the user's purchase records for these cards
    const userPurchases = await prisma.cardPurchase.findMany({
      where: {
        userId: userId,
        cardId: { in: cards.map((card) => card.id) },
      },
    });

    // Map the user's purchases for quick lookup
    const purchaseMap = userPurchases.reduce((acc, purchase) => {
      acc[purchase.cardId] = purchase;
      return acc;
    }, {});

    // Format the cards with user-specific details
    const formattedCards = cards.map((card) => {
      const userPurchase = purchaseMap[card.id]; // Find the user's purchase record for this card, if any
      const level = userPurchase ? userPurchase.level : 0;

      // Calculate the next cost based on the next level
      const nextCost = Math.floor(card.baseCost * Math.pow(card.costIncrease, level));

      // Calculate the profit at the current level
      const profitPerHour = Math.floor(card.baseProfit * Math.pow(card.profitIncrease, level));

      // Calculate the profit at the next level
      const nextProfitPerHour = Math.floor(card.baseProfit * Math.pow(card.profitIncrease, level + 1));

      return {
        id: card.id,
        name: card.name,
        category: card.category,
        baseProfit: card.baseProfit,
        profitIncrease: card.profitIncrease,
        baseCost: card.baseCost,
        costIncrease: card.costIncrease,
        requires: card.requires,
        imagePath: card.imagePath,
        coinIcon: card.coinIcon,
        level,
        nextCost,
        profitPerHour,
        nextProfitPerHour,
        userPurchased: !!userPurchase, // Whether the user has purchased this card or not
      };
    });

    res.status(200).json(formattedCards);
  } catch (error) {
    console.error('Error fetching cards by category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




// Upgrade a purchased card
exports.upgradeCard = async (req, res) => {
  const { userId, cardId } = req.body;

  try {
    // Validate input
    if (!userId || !cardId) {
      return res.status(400).json({ message: 'User ID and Card ID are required' });
    }

    // Fetch the card details
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Fetch the user's card purchase record
    const userCard = await prisma.cardPurchase.findFirst({
      where: {
        userId: userId,
        cardId: cardId,
      },
    });

    if (!userCard) {
      return res.status(400).json({ message: 'User does not own this card' });
    }

    // Check if the card has reached its maximum level
    if (userCard.level >= card.maxLevel) {
      return res.status(400).json({ message: 'Card has already reached the maximum level' });
    }

    // Calculate the next level
    const nextLevel = userCard.level + 1;

    // Calculate the cost for upgrading to the next level
    const upgradeCost = Math.floor(card.baseCost * Math.pow(card.costIncrease, nextLevel - 1));

    // Fetch the user details for balance verification
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.coins < upgradeCost) {
      return res.status(400).json({ message: 'Insufficient balance to upgrade this card' });
    }

    // Calculate the profit contribution of the card at the current and next levels
    const currentProfitPerHour = Math.floor(card.baseProfit * Math.pow(card.profitIncrease, userCard.level - 1));
    const newProfitPerHour = Math.floor(card.baseProfit * Math.pow(card.profitIncrease, nextLevel ));

    const nextProfitPerHour = Math.floor(card.baseProfit * Math.pow(card.profitIncrease, nextLevel+ 1)); // Profit for the level after the current upgrade

  


    console.log("Current Profit Per Hour:", currentProfitPerHour);
    console.log("New Profit Per Hour:", newProfitPerHour);
    console.log("Next Profit Per Hour:", nextProfitPerHour);

    // Deduct the upgrade cost from the user's balance and update profitPerHour
   const updatedUser =  await prisma.user.update({
      where: { id: userId },
      data: {
        coins: user.coins - upgradeCost,
        profitPerHour: user.profitPerHour + newProfitPerHour,
      },
    });

    console.log("updated user", updatedUser)

    // Update the card level in the CardPurchase record
    const updatedCardPurchase = await prisma.cardPurchase.update({
      where: { id: userCard.id },
      data: {
        level: nextLevel,
      },
    });

    // Calculate the next upgrade cost for the subsequent level
    const nextCost = Math.floor(card.baseCost * Math.pow(card.costIncrease, nextLevel));

    console.log("Next Cost:", nextCost);

    res.status(200).json({
      message: 'Card upgraded successfully',
      card: {
        ...card,
        level: nextLevel,
        nextCost,
        profitPerHour: newProfitPerHour,
        nextProfitPerHour,
        userPurchased: true,
      },
      updatedUser
    });
  } catch (error) {
    console.error('Error upgrading card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};





// Purchase a card for a user
// Purchase a card for a user
exports.purchaseCard = async (req, res) => {
  const { userId, cardId } = req.body;
  console.log(userId, cardId);

  try {
    // Validate input
    if (!userId || !cardId) {
      return res.status(400).json({ message: 'User ID and Card ID are required' });
    }

    // Fetch the card details
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Check if the user already owns this card
    const existingPurchase = await prisma.cardPurchase.findFirst({
      where: {
        userId: userId,
        cardId: cardId,
      },
    });

    if (existingPurchase) {
      return res.status(400).json({ message: 'User already owns this card' });
    }

    // Calculate initial cost for the card purchase
    const purchaseCost = card.baseCost;

    // Fetch the user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.coins < purchaseCost) {
      return res.status(400).json({ message: 'Insufficient balance to purchase this card' });
    }

    // Calculate the profit contribution of the card at level 1
    const initialProfitPerHour = Math.floor(card.baseProfit);

    // Deduct the cost from user's balance and update profitPerHour
    const updatedUser= await prisma.user.update({
      where: { id: userId },
      data: {
        coins: user.coins - purchaseCost,
        profitPerHour: user.profitPerHour + initialProfitPerHour,
      },
    });

    // Create the card purchase entry with level 1
    const newPurchase = await prisma.cardPurchase.create({
      data: {
        userId: userId,
        cardId: cardId,
        level: 1, // Store the actual level of the card purchase
      },
    });

    // Calculate the profit for the next level (level 2)
    const nextProfitPerHour = Math.floor(card.baseProfit * Math.pow(card.profitIncrease, 2 - 1)); // Profit for level 2
    const nextCost = Math.floor(card.baseCost * Math.pow(card.costIncrease, 2 - 1)); // Cost for upgrading to level 2

    res.status(201).json({
      message: 'Card purchased successfully',
      card: {
        ...card,
        level: newPurchase.level,
        nextCost,
        profitPerHour: initialProfitPerHour,
        nextProfitPerHour,
        userPurchased: true,
      },
      updatedUser
    });
  } catch (error) {
    console.error('Error purchasing card:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};





