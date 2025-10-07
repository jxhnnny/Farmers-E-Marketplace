const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Dashboard analytics for farmers
router.get('/farmer-dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const farmerId = req.user.userId;

    // Get product statistics
    const totalProducts = await Product.countDocuments({ farmer: farmerId });
    const activeProducts = await Product.countDocuments({ 
      farmer: farmerId, 
      isAvailable: true 
    });

    // Get order statistics
    const totalOrders = await Order.countDocuments({ farmer: farmerId });
    const pendingOrders = await Order.countDocuments({ 
      farmer: farmerId, 
      status: 'pending' 
    });
    const completedOrders = await Order.countDocuments({ 
      farmer: farmerId, 
      status: 'fulfilled' 
    });

    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { farmer: farmerId, status: 'fulfilled' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Get recent orders
    const recentOrders = await Order.find({ farmer: farmerId })
      .populate('buyer', 'name email')
      .populate('product', 'name price')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get product views
    const productViews = await Product.aggregate([
      { $match: { farmer: farmerId } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const totalViews = productViews[0]?.totalViews || 0;

    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          active: activeProducts,
          totalViews
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders
        },
        revenue: {
          total: totalRevenue
        },
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching farmer analytics',
      error: error.message
    });
  }
});

// Dashboard analytics for buyers
router.get('/buyer-dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const buyerId = req.user.userId;

    // Get order statistics
    const totalOrders = await Order.countDocuments({ buyer: buyerId });
    const pendingOrders = await Order.countDocuments({ 
      buyer: buyerId, 
      status: 'pending' 
    });
    const completedOrders = await Order.countDocuments({ 
      buyer: buyerId, 
      status: 'fulfilled' 
    });

    // Calculate total spent
    const spentResult = await Order.aggregate([
      { $match: { buyer: buyerId, status: 'fulfilled' } },
      { $group: { _id: null, totalSpent: { $sum: '$totalPrice' } } }
    ]);
    const totalSpent = spentResult[0]?.totalSpent || 0;

    // Get recent orders
    const recentOrders = await Order.find({ buyer: buyerId })
      .populate('farmer', 'name farmLocation')
      .populate('product', 'name price')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders
        },
        spending: {
          total: totalSpent
        },
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching buyer analytics',
      error: error.message
    });
  }
});

// Admin analytics (if admin user exists)
router.get('/admin-dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get user statistics
    const totalUsers = await User.countDocuments();
    const totalFarmers = await User.countDocuments({ role: 'farmer' });
    const totalBuyers = await User.countDocuments({ role: 'buyer' });

    // Get product statistics
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isAvailable: true });
    const pendingApproval = await Product.countDocuments({ isApproved: false });

    // Get order statistics
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'fulfilled' });
    
    // Calculate platform revenue (assuming platform takes a cut)
    const revenueResult = await Order.aggregate([
      { $match: { status: 'fulfilled' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Get recent activity
    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentOrders = await Order.find()
      .populate('buyer', 'name')
      .populate('farmer', 'name')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          farmers: totalFarmers,
          buyers: totalBuyers
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          pendingApproval
        },
        orders: {
          total: totalOrders,
          completed: completedOrders
        },
        revenue: {
          total: totalRevenue
        },
        recentActivity: {
          users: recentUsers,
          orders: recentOrders
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin analytics',
      error: error.message
    });
  }
});

module.exports = router;