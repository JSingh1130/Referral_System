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
    return res.status(400).json({ message: 'Name and Email are required' });  // Returning JSON error message
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

    res.status(201).json({ message: 'User created successfully!' });  // Return a success message in JSON format
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user: ' + error.message });  // Returning JSON error message
  }
});

// Real-time earnings report for a user
app.get('/earningsReport/:userId', async (req, res) => {
  const { userId } = req.params;  // Fetch the userId from request parameters

  try {
    // Find all earnings for this user from the Earnings collection
    const earningsData = await Earnings.find({ user: userId }).populate('referralUser', 'name email');
    
    if (!earningsData || earningsData.length === 0) {
      return res.status(404).json({
        message: 'No earnings found for this user',
        level1Earnings: 0,
        level2Earnings: 0
      });
    }

    const earningsBreakdown = {
      level1: 0,
      level2: 0,
      total: 0
    };

    earningsData.forEach(entry => {
      if (entry.level === 1) earningsBreakdown.level1 += entry.amount;
      else if (entry.level === 2) earningsBreakdown.level2 += entry.amount;

      earningsBreakdown.total += entry.amount;
    });

    res.status(200).json({
      userId,
      totalEarnings: earningsBreakdown.total,
      level1Earnings: earningsBreakdown.level1,
      level2Earnings: earningsBreakdown.level2,
      earningsDetails: earningsData
    });  // Returning the data as JSON
  } catch (error) {
    console.error('Error fetching earnings report:', error);
    res.status(500).json({ message: 'Error fetching earnings report' });  // Returning JSON error message
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
    });  // Returning the data as JSON
  } catch (error) {
    console.error('Error fetching referral earnings breakdown:', error);
    res.status(500).json({ message: 'Error fetching referral earnings breakdown' });  // Returning JSON error message
  }
});

// Fetch user details (for displaying on frontend)
app.get('/userDetails/:userId', async (req, res) => {
  const { userId } = req.params; // Fetch the userId from request parameters

  try {
    // Fetch user details including referrals and referredBy (populating the fields)
    const user = await User.findById(userId)
      .populate('referrals')
      .populate('referredBy', 'name email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' }); // Ensure JSON response for errors
    }

    // Return the full user details as JSON
    res.status(200).json(user); // Ensure this is JSON, not HTML
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details' }); // Ensure JSON error response
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
      level1Earnings = purchaseAmount * 0.05;  // 5% of the purchase amount
      level1User.level1Earnings += level1Earnings;  // Add to Level 1 earnings
      level1User.earnings += level1Earnings;        // Add to total earnings
      await level1User.save();

      // Emit earnings for Level 1 referrer (User 4)
      io.emit('earningsUpdate', { userId: level1User._id, earnings: level1Earnings, referralType: 'Level 1' });
    }

    // Level 2 earnings: 1% of the purchase amount from Level 1 users
    if (level2User) {
      level2Earnings = purchaseAmount * 0.01;  // 1% of the purchase amount
      level2User.level2Earnings += level2Earnings;  // Add to Level 2 earnings
      level2User.earnings += level2Earnings;        // Add to total earnings
      await level2User.save();

      // Emit earnings for Level 2 referrer (User 1)
      io.emit('earningsUpdate', { userId: level2User._id, earnings: level2Earnings, referralType: 'Level 2' });
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
