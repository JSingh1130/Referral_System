require('dotenv').config();  // Import dotenv to load .env file

const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const Earnings = require('./models/Earnings');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware to parse JSON in request bodies
app.use(express.json());  // This line is essential for parsing JSON requests

// Serve static files from the "public" folder
app.use(express.static('public'));  // This allows Express to serve static files

// Connect to MongoDB using the URI from .env file
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas...'))
  .catch(err => console.log('Could not connect to MongoDB:', err));

// Route to create a new user
app.post('/createUser', async (req, res) => {
  const { name, email, referredBy, referralLevel, earnings, referrals } = req.body;

  // Basic validation
  if (!name || !email) {
    return res.status(400).send('Name and Email are required');
  }

  try {
    const newUser = new User({
      name,
      email,
      referredBy: referredBy || null,  // Null if no referrer
      referralLevel: referralLevel || 0,
      earnings: earnings || 0,
      level1Earnings: 0, // Initialize level 1 earnings to 0
      level2Earnings: 0, // Initialize level 2 earnings to 0
      referrals: []      // Initialize referrals as an empty array
    });

    // Save the user to the database
    await newUser.save();

    // If a user is referred by another user, update the referring user's `referrals` array
    if (referredBy) {
      // Find the referring user (User who referred the new user)
      const referringUser = await User.findById(referredBy);

      if (referringUser) {
        // Add the new user's ObjectId to the referring user's `referrals` array
        referringUser.referrals.push(newUser._id);
        await referringUser.save();  // Save the referring user after updating the referrals array
      }
    }

    res.status(201).send('User created successfully!');
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send('Error creating user: ' + error.message);
  }
});

// Real-time earnings report for a user
app.get('/earningsReport/:userId', async (req, res) => {
  const { userId } = req.params;  // Fetch the userId from request parameters

  try {
    // Find all earnings for this user from the Earnings collection
    const earningsData = await Earnings.find({ user: userId }).populate('referralUser', 'name email');
    
    // Log the earningsData to verify what is returned
    console.log('Earnings Data for User:', earningsData);

    // If no earnings are found, return 0 for level1Earnings and level2Earnings
    if (!earningsData || earningsData.length === 0) {
      return res.status(404).json({
        message: 'No earnings found for this user',
        level1Earnings: 0,
        level2Earnings: 0
      });
    }

    // Initialize the earnings breakdown
    const earningsBreakdown = {
      level1: 0,
      level2: 0,
      total: 0
    };

    // Aggregate earnings data to calculate total and level-specific earnings
    earningsData.forEach(entry => {
      if (entry.level === 1) {
        earningsBreakdown.level1 += entry.amount;  // Add Level 1 earnings
      } else if (entry.level === 2) {
        earningsBreakdown.level2 += entry.amount;  // Add Level 2 earnings
      }
      earningsBreakdown.total += entry.amount;  // Add to total earnings
    });

    // Log the earnings breakdown for debugging purposes
    console.log('Earnings Breakdown:', earningsBreakdown);

    // Send the earnings breakdown and details as the response
    res.status(200).json({
      userId,
      totalEarnings: earningsBreakdown.total,
      level1Earnings: earningsBreakdown.level1,
      level2Earnings: earningsBreakdown.level2,
      earningsDetails: earningsData
    });
  } catch (error) {
    console.error('Error fetching earnings report:', error);
    res.status(500).json({ message: 'Error fetching earnings report' });
  }
});

// API to get breakdown of earnings across referrals (Level 1, Level 2)
app.get('/referralEarningsBreakdown/:userId', async (req, res) => {
  const { userId } = req.params;  // Fetch the userId from request parameters

  try {
    const referralEarnings = await Earnings.find({ referralUser: userId }).populate('user', 'name email');

    if (!referralEarnings || referralEarnings.length === 0) {
      return res.status(404).json({ message: 'No referral earnings found for this user' });
    }

    const referralBreakdown = referralEarnings.map(entry => ({
      userId: entry.user._id,
      userName: entry.user.name,
      referralLevel: entry.level,
      earnings: entry.amount
    }));

    res.status(200).json({
      userId,
      referralEarnings: referralBreakdown
    });
  } catch (error) {
    console.error('Error fetching referral earnings breakdown:', error);
    res.status(500).json({ message: 'Error fetching referral earnings breakdown' });
  }
});

// Referral system logic to calculate and save earnings
app.post('/purchase', async (req, res) => {
  const { userId, purchaseAmount } = req.body;

  // Validate purchaseAmount
  if (!purchaseAmount || purchaseAmount <= 1000) {
    return res.status(400).send('Purchase amount must be greater than 1000Rs');
  }

  if (isNaN(purchaseAmount)) {
    return res.status(400).send('Purchase amount must be a valid number');
  }

  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send('Invalid userId format');
  }

  try {
    // Find the user making the purchase
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');

    let totalEarnings = 0;
    let level1Earnings = 0;
    let level2Earnings = 0;

    // Fetch Level 1 and Level 2 user details in parallel to improve performance
    const [level1User, level2User] = await Promise.all([
      user.referredBy ? User.findById(user.referredBy) : null,
      user.referredBy && (await User.findById(user.referredBy)).referredBy
        ? User.findById((await User.findById(user.referredBy)).referredBy)
        : null
    ]);

    // Level 1 earnings: 5% of the purchase amount
    if (level1User) {
      level1Earnings = purchaseAmount * 0.05;
      level1User.level1Earnings += level1Earnings;  // Add to Level 1 earnings
      level1User.earnings += level1Earnings;        // Add to total earnings
      await level1User.save();
      totalEarnings += level1Earnings;
    }

    // Level 2 earnings: 1% of the purchase amount from Level 1 users
    if (level2User) {
      level2Earnings = purchaseAmount * 0.01;
      level2User.level2Earnings += level2Earnings;  // Add to Level 2 earnings
      level2User.earnings += level2Earnings;        // Add to total earnings
      await level2User.save();
      totalEarnings += level2Earnings;
    }

    // Save the earnings in the Earnings collection
    const earnings = new Earnings({
      user: userId,
      referralUser: user.referredBy,
      amount: totalEarnings,
      level: 2,  // Assuming this is indirect earnings (Level 2)
      level1Earnings,  // Save Level 1 earnings separately
      level2Earnings   // Save Level 2 earnings separately
    });
    await earnings.save();

    // Emit real-time updates to the clients
    if (level1Earnings > 0) {
      io.emit('earningsUpdate', { userId: user.referredBy, earnings: level1Earnings });
    }

    if (level2Earnings > 0) {
      io.emit('earningsUpdate', { userId: (await User.findById(user.referredBy)).referredBy, earnings: level2Earnings });
    }

    res.status(200).send('Purchase processed and earnings updated!');
  } catch (error) {
    console.error('Error processing purchase:', error);
    res.status(500).send('Error processing purchase');
  }
});

// Start server
server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
