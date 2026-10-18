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

// Global bufferCommands setting: fail fast if disconnected instead of buffering and timing out after 10s
mongoose.set('bufferCommands', false);

// Database Connection with serverless-safe caching
const startRentReminders = require('./cron/rentReminder');

// Use a global cache so the connection survives hot/warm Lambda/Vercel invocations
let cached = global._mongooseConnection;
if (!cached) {
    cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
    // 1. If already fully connected, return immediately
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // 2. If currently connecting, wait for the in-flight promise
    if (mongoose.connection && mongoose.connection.readyState === 2 && cached.promise) {
        return await cached.promise;
    }

    // 3. Otherwise (disconnected or readyState 0/3), reset cache and initiate fresh connection
    cached.promise = null;
    cached.conn = null;

    const isServerless = !!(process.env.VERCEL || process.env.RENDER || process.env.AWS_LAMBDA_FUNCTION_NAME);
    // Point fallback to 'test' DB where the actual collections (users, properties, settings, etc.) reside
    const atlasFallback = 'mongodb+srv://davis:Tango12@cluster0.6nlji3n.mongodb.net/test?retryWrites=true&w=majority';
    const uri = process.env.MONGODB_URI || (isServerless ? atlasFallback : 'mongodb://127.0.0.1:27017/rental_manager');

    const opts = {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
        console.log('✅ MongoDB Connected:', uri.split('@')[1]?.split('/')[0] || 'local');
        if (!isServerless) {
            startRentReminders();
        }
        cached.conn = mongooseInstance;
        return mongooseInstance;
    }).catch((err) => {
        // Reset on failure so next call retries cleanly
        cached.promise = null;
        cached.conn = null;
        console.error('❌ MongoDB Connection Error:', err.message);
        throw err;
    });

    return await cached.promise;
};

// Initiate connection on boot (non-serverless environments)
if (!process.env.VERCEL) {
    connectDB().catch(err => console.error('Initial DB connect error:', err.message));
}

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
    console.error('Unhandled Server Error:', err.stack || err.message);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
