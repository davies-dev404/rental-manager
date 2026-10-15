require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware: Helmet
app.use(helmet());

// Security Middleware: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Standard Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin rewrites)
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:5173', 
            'https://rental-manager-2sto.vercel.app', 
            'https://rental-manager-sikj.onrender.com',
            'https://rental-manager-seven.vercel.app'
        ];
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        return callback(null, true); // Permissive for unified domain routing
    },
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Database Connection
const startRentReminders = require('./cron/rentReminder');

let isConnected = false;

const connectDB = async () => {
    if (isConnected || mongoose.connection.readyState === 1) {
        return;
    }
    const primaryUri = process.env.MONGODB_URI;
    if (!primaryUri) {
        console.error('❌ MONGODB_URI environment variable is missing!');
    }
    const uri = primaryUri || 'mongodb://127.0.0.1:27017/rental_manager';
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        isConnected = true;
        console.log('✅ MongoDB Connected successfully');
        if (process.env.NODE_ENV !== 'production') {
            startRentReminders();
        }
    } catch (err) {
        console.warn('⚠️ Primary MongoDB connection failed:', err.message);
        if (uri !== 'mongodb://127.0.0.1:27017/rental_manager') {
            try {
                await mongoose.connect('mongodb://127.0.0.1:27017/rental_manager', { serverSelectionTimeoutMS: 2000 });
                isConnected = true;
                console.log('✅ Connected to local MongoDB fallback');
            } catch (localErr) {
                console.error('❌ MongoDB Connection Error:', localErr.message);
                throw err;
            }
        } else {
            throw err;
        }
    }
};

// Initiate connection on boot
connectDB().catch(err => console.error('Initial DB connect error:', err.message));

// Middleware to ensure DB is connected before processing API requests (essential for Vercel Serverless)
app.use(async (req, res, next) => {
    if (req.path === '/' || req.path === '/api/health') return next();
    try {
        await connectDB();
        next();
    } catch (err) {
        return res.status(500).json({ 
            message: 'Database connection failed. Please ensure MONGODB_URI is configured and IP 0.0.0.0/0 is whitelisted in MongoDB Atlas.',
            error: err.message 
        });
    }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const unitRoutes = require('./routes/unitRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/units', unitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/activity-logs', require('./routes/activityLogRoutes'));
app.use('/api/mpesa', require('./routes/mpesaRoutes'));

app.get('/', (req, res) => {
    res.send('Rental Manager API is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
