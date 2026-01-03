const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, setDoc } = require('firebase/firestore');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

console.log('Firebase initialized');

// Create default admin user if not exists
const createDefaultAdmin = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminRef = doc(usersRef);
      await setDoc(adminRef, {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date()
      });
      console.log('Default admin user created: username=admin, password=admin123');
      console.log('⚠️  WARNING: Change default password in production!');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Initialize server
const initializeServer = async () => {
  try {
    console.log('Initializing server...');
    await createDefaultAdmin();
    console.log('Admin user check completed');
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use((req, res, next) => {
      req.io = io; // Attach io to req for routes
      req.db = db; // Attach Firestore db to req
      next();
    });

    console.log('Middleware configured');

    // Routes
    console.log('Loading routes...');
    const authRoutes = require('./routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('Auth routes loaded');

    const productRoutes = require('./routes/products');
    app.use('/api/products', productRoutes);
    console.log('Product routes loaded');

    const customerRoutes = require('./routes/customers');
    app.use('/api/customers', customerRoutes);
    console.log('Customer routes loaded');

    const invoiceRoutes = require('./routes/invoices');
    app.use('/api/invoices', invoiceRoutes);
    console.log('Invoice routes loaded');

    const vehicleRoutes = require('./routes/vehicles');
    app.use('/api/vehicles', vehicleRoutes);
    console.log('Vehicle routes loaded');

    const transporterRoutes = require('./routes/transporters');
    app.use('/api/transporters', transporterRoutes);
    console.log('Transporter routes loaded');

    // Basic routes
    app.get('/', (req, res) => {
      res.send('Transportation & Cargo Management Backend API');
    });

    // Socket.IO for realtime
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
    
    console.log('Starting server...');
    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

initializeServer();

module.exports = { app, io, db };