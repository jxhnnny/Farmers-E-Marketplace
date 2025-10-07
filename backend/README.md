# Rundu Farmers Marketplace - Backend

## 🌾 MongoDB Database Integration

This backend is now fully integrated with MongoDB and includes all the collections you set up:

### Database Collections
- **users** - Farmers, buyers, and admin accounts
- **products** - Farm products listings
- **orders** - Purchase orders and transactions
- **messages** - Real-time messaging system
- **reviews** - Product and farmer reviews

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or remote)

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - The `.env` file is already configured for local MongoDB
   - Update `MONGODB_URI` if using a different database

3. **Initialize Database**
   ```bash
   npm run init-db
   ```
   This will populate your MongoDB with sample data from your JSON files.

4. **Start the Server**
   ```bash
   # Development (with auto-reload)
   npm run dev
   
   # Production
   npm start
   ```

### Windows Users
Double-click `setup.bat` to run the complete setup automatically.

## 🔑 Default Login Credentials

### Admin Account
- **Email:** admin@farmersmarket.com
- **Password:** admin123

### All Farmers and Buyers
- **Password:** password123
- Use any email from your JSON data files

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (farmers only)
- `GET /api/products/:id` - Get single product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status

### Reviews
- `GET /api/reviews/product/:productId` - Get product reviews
- `GET /api/reviews/farmer/:farmerId` - Get farmer reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Messages
- `GET /api/messages` - Get conversations
- `POST /api/messages` - Send message
- Real-time messaging via Socket.IO

## 🛠 Database Models

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  role: ['farmer', 'buyer', 'admin'],
  farmLocation: String (farmers),
  location: String (buyers),
  rating: Number,
  totalRatings: Number
}
```

### Product Schema
```javascript
{
  name: String,
  category: ['vegetables', 'fruits', 'grains', 'herbs', 'dairy', 'meat'],
  price: Number,
  quantity: Number,
  unit: String,
  description: String,
  images: [String],
  farmer: ObjectId (ref: User),
  location: String,
  isAvailable: Boolean,
  isApproved: Boolean
}
```

### Order Schema
```javascript
{
  product: ObjectId (ref: Product),
  buyer: ObjectId (ref: User),
  farmer: ObjectId (ref: User),
  quantity: Number,
  totalPrice: Number,
  status: ['pending', 'accepted', 'rejected', 'fulfilled', 'cancelled'],
  deliveryMethod: ['pickup', 'delivery'],
  scheduledDate: Date
}
```

## 🔧 Configuration

### Environment Variables (.env)
```env
MONGODB_URI=mongodb://127.0.0.1:27017/farmers_marketplace
PORT=5000
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## 🧪 Testing the Connection

1. Start your MongoDB service
2. Run the backend server
3. Check the console for "MongoDB connected successfully"
4. Test API endpoints using Postman or your frontend

## 📱 Real-time Features

- **Socket.IO Integration** for real-time messaging
- **Real-time notifications** for new orders
- **Live chat** between farmers and buyers

## 🛡 Security Features

- **JWT Authentication**
- **Password hashing** with bcrypt
- **Rate limiting** to prevent abuse
- **CORS protection**
- **Helmet.js** for security headers
- **Input validation** with express-validator

## 📈 Future Enhancements

- Payment integration (Stripe/PayPal)
- Email notifications
- SMS notifications
- Advanced search and filtering
- Geographic location services
- Mobile app support

---

**Database Status:** ✅ Fully integrated with MongoDB
**Collections:** 5 collections with relationships
**Sample Data:** Populated from your JSON files
**Authentication:** JWT-based with role management
**Real-time:** Socket.IO messaging system