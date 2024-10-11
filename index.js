const express = require('express');
const app = express();
const cors = require('cors');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const cardRoutes = require("./routes/cards")

const corsOptions = {
  origin: ['https://tg-front-eight.vercel.app', 'http://localhost:5173'], // Replace with the exact URL of your frontend 
  allowedHeaders: ['Content-Type', 'Authorization', "ngrok-skip-browser-warning"],
  credentials: true, // Allows credentials like cookies or authorization headers
};

app.use(cors(corsOptions));

// Handle preflight `OPTIONS` request for all routes.
app.options('*', cors(corsOptions));

app.use(express.json());

// API routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', cardRoutes);
// app.use('/api', withdrawalRoutes);

// Start the server
app.listen(3000, () => {
  console.log(`Your app is running on port 3000`);
});
