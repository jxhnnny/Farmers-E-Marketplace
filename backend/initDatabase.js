const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Message = require('./models/Message');
const Review = require('./models/Review');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmers_marketplace';

// Sample data
const sampleFarmers = [
  { name: 'Maria Nghidinwa', email: 'maria@farmer.com', phone: '+264 81 234 5678', farmLocation: 'Rundu West', rating: 4.5 },
  { name: 'Johannes Mukuve', email: 'johannes@farmer.com', phone: '+264 81 234 5679', farmLocation: 'Rundu East', rating: 4.2 },
  { name: 'Grace Kapere', email: 'grace@farmer.com', phone: '+264 81 234 5680', farmLocation: 'Rundu Central', rating: 4.8 },
  { name: 'David Shihepo', email: 'david@farmer.com', phone: '+264 81 234 5681', farmLocation: 'Rundu South', rating: 4.3 },
  { name: 'Anna Nambahu', email: 'anna@farmer.com', phone: '+264 81 234 5682', farmLocation: 'Rundu North', rating: 4.6 }
];

const sampleBuyers = [
  { name: 'Peter Muyunda', email: 'peter@buyer.com', phone: '+264 81 345 6789', location: 'Windhoek' },
  { name: 'Sarah Katamba', email: 'sarah@buyer.com', phone: '+264 81 345 6790', location: 'Rundu Town' },
  { name: 'Michael Hamutenya', email: 'michael@buyer.com', phone: '+264 81 345 6791', location: 'Windhoek' }
];

const sampleProducts = [
  { name: 'Fresh Tomatoes', category: 'vegetables', price: 25.0, quantity: 50, unit: 'kg', description: 'Fresh, organic tomatoes grown without pesticides.', images: ['tomatoes.jpg'] },
  { name: 'Sweet Oranges', category: 'fruits', price: 18.0, quantity: 30, unit: 'kg', description: 'Juicy, sweet oranges perfect for eating or juice.', images: ['oranges.jpg'] },
  { name: 'White Maize', category: 'grains', price: 12.0, quantity: 100, unit: 'kg', description: 'High-quality white maize, freshly harvested.', images: ['maize.jpg'] },
  { name: 'Green Peppers', category: 'vegetables', price: 35.0, quantity: 25, unit: 'kg', description: 'Crisp green peppers, great for cooking.', images: ['peppers.jpg'] },
  { name: 'Spinach Leaves', category: 'vegetables', price: 22.0, quantity: 20, unit: 'kg', description: 'Organic spinach leaves, rich in nutrients.', images: ['spinach.jpg'] }
];

async function initializeDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Message.deleteMany({}),
      Review.deleteMany({})
    ]);
    console.log('Cleared existing data');

    const farmers = [];
    for (const farmerData of sampleFarmers) {
      const farmer = await User.create({
        name: farmerData.name,
        email: farmerData.email,
        phone: farmerData.phone,
        password: 'password123', 
        role: 'farmer',
        farmLocation: farmerData.farmLocation,
        isVerified: true,
        isActive: true,
        rating: farmerData.rating,
        totalRatings: Math.floor(Math.random() * 50) + 10
      });
      farmers.push(farmer);
    }
    console.log(`Created ${farmers.length} farmers`);

    // Create buyers
    const buyers = [];
    for (const buyerData of sampleBuyers) {
      const buyer = await User.create({
        name: buyerData.name,
        email: buyerData.email,
        phone: buyerData.phone,
        password: 'password123',
        role: 'buyer',
        location: buyerData.location,
        isVerified: true,
        isActive: true
      });
      buyers.push(buyer);
    }
    console.log(`Created ${buyers.length} buyers`);

    // Create admin user
    await User.create({
      name: 'Admin User',
      email: 'admin@farmersmarket.com',
      phone: '+264 81 000 0000',
      password: 'admin123',
      role: 'admin',
      location: 'Rundu',
      isVerified: true,
      isActive: true
    });
    console.log('Created admin user');

    // Create products
    const products = [];
    for (let i = 0; i < sampleProducts.length; i++) {
      const productData = sampleProducts[i];
      const farmer = farmers[i % farmers.length];
      const product = await Product.create({
        ...productData,
        farmer: farmer._id,
        location: farmer.farmLocation,
        isAvailable: true,
        isApproved: true,
        views: Math.floor(Math.random() * 100),
        inquiries: Math.floor(Math.random() * 20)
      });
      products.push(product);
    }
    console.log(`Created ${products.length} products`);

    // Create sample orders
    const orders = [];
    for (let i = 0; i < 5; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const buyer = buyers[Math.floor(Math.random() * buyers.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const order = await Order.create({
        product: product._id,
        buyer: buyer._id,
        farmer: product.farmer,
        quantity,
        totalPrice: product.price * quantity,
        status: ['pending', 'accepted', 'fulfilled'][Math.floor(Math.random() * 3)],
        deliveryMethod: Math.random() > 0.5 ? 'pickup' : 'delivery',
        deliveryAddress: buyer.location,
        buyerNote: 'Please pack carefully',
        scheduledDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
      orders.push(order);
    }
    console.log(`Created ${orders.length} orders`);

    // Create sample reviews for fulfilled orders
    const reviews = [];
    for (const order of orders.filter(o => o.status === 'fulfilled')) {
      const review = await Review.create({
        order: order._id,
        product: order.product,
        buyer: order.buyer,
        farmer: order.farmer,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        comment: 'Great quality products and fast delivery!',
        reviewType: 'farmer'
      });
      reviews.push(review);
    }
    console.log(`Created ${reviews.length} reviews`);

    // Create sample messages
    for (let i = 0; i < 3; i++) {
      const farmer = farmers[Math.floor(Math.random() * farmers.length)];
      const buyer = buyers[Math.floor(Math.random() * buyers.length)];
      await Message.create({
        sender: buyer._id,
        receiver: farmer._id,
        content: 'Hello, I am interested in your products. Are they still available?',
        messageType: 'text',
        conversationId: `${buyer._id}_${farmer._id}`
      });
      await Message.create({
        sender: farmer._id,
        receiver: buyer._id,
        content: 'Yes, they are available. When would you like to collect them?',
        messageType: 'text',
        conversationId: `${buyer._id}_${farmer._id}`
      });
    }
    console.log('Created sample messages');

    console.log('Database initialization completed successfully!');
    console.log('\n--- Sample Login Credentials ---');
    console.log('Farmers:');
    sampleFarmers.forEach(farmer => {
      console.log(`  ${farmer.name}: ${farmer.email} / password123`);
    });
    console.log('\nBuyers:');
    sampleBuyers.forEach(buyer => {
      console.log(`  ${buyer.name}: ${buyer.email} / password123`);
    });
    console.log('\nAdmin:');
    console.log('  Admin User: admin@farmersmarket.com / admin123');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;