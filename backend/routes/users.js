const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body } = require('express-validator');

// Get all farmers (for buyers to browse)
router.get('/farmers', async (req, res) => {
  try {
    const { page = 1, limit = 10, location } = req.query;
    
    const query = { role: 'farmer', isActive: true };
    if (location) {
      query.farmLocation = { $regex: location, $options: 'i' };
    }

    const farmers = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1, createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: farmers,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: farmers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching farmers',
      error: error.message
    });
  }
});

// Get all buyers (for farmers to see potential customers)
router.get('/buyers', auth, async (req, res) => {
  try {
    // Only farmers can see buyers
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { page = 1, limit = 10, location } = req.query;
    
    const query = { role: 'buyer', isActive: true };
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    const buyers = await User.find(query)
      .select('name email location rating totalRatings createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: buyers,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: buyers.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching buyers',
      error: error.message
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

module.exports = router;