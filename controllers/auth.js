const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const validateInitData= require("../utils/verfiyInitData");
require("dotenv").config();

const telegramToken = process.env.BOT_TOKEN; // Your Telegram bot token
const jwtSecret = process.env.JWT_SECRET; // Secret key for JWT (use env variables for production)

// Authenticate user with Telegram initData
exports.telegramAuth = async (req, res) => {
  const { initData,  referralCode  } = req.body; // Add referredBy (optional) to capture who referred the user
  const referralId = referralCode
  console.log(initData)
  
  console.log("referralcode", referralId)
  // console.log("phot-url",photoUrl)

  // Step 1: Verify Telegram initData
  const isValid = validateInitData(initData, telegramToken);
  console.log(isValid)

  if (!isValid) {
    return res.status(400).json({ message: "Invalid initData" });
  }

  // Step 2: Extract user information from initData
  const parsedData = new URLSearchParams(initData);
   const userDataJson = parsedData.get('user');
     if (!userDataJson) {
            console.log("No user data available");
            return res.status(400).json({ msg: 'No user data available' });
        }

        const telegramUser = JSON.parse(userDataJson);
        console.log(telegramUser)
         const telegramId = telegramUser.id.toString();

  console.log(telegramId)
  const username = telegramUser.username;

  

  try {
    // Step 3: Check if the user already exists
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramId },
    });

    // Step 4: If the user doesn't exist, create a new user
    if (!user) {
      user = await prisma.user.upsert({
      where: { telegramId },
      update: {
        username, // Update username if it has changed
      },
      create: {
        telegramId,
        username,
        referredBy: referralCode || null,
      },
    });

      // Step 5: Handle the referral logic automatically (if referredBy is provided)
      if (referralId) {
        const referringUser = await prisma.user.findUnique({
          where: { telegramId: referralId },
        });

        if (referringUser) {
          // Add referral record
          await prisma.referral.create({
            data: {
              userId: referralId,
              referredId: user.id,
            },
          });

          // Update the referral count for the referring user
          const updatedReferrer = await prisma.user.update({
            where: { telegramId: referralId },
            data: {
              referralCount: {
                increment: 1,
              },
            },
          });

          // Check if referral count reaches 5 and award free spin
          if (updatedReferrer.referralCount % 5 === 0) {
            // Award exactly one spin
            await prisma.user.update({
              where: { telegramId: referralId },
              data: {
                freeSpins: {
                  increment: 1, // Increment spins by 1
                },
              },
            });
          }
        }
      }
    }

    // Step 6: Create JWT token for the user
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId },
      jwtSecret,
      { expiresIn: "24h" }
    );

    // Step 7: Respond with user info and token
    res.json({ token, user });
  } catch (error) {
    console.error("Error during Telegram authentication:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
