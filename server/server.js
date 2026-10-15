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

const connectDB = async () => {
    const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rental_manager';
    try {
        await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
        console.log('✅ MongoDB Connected successfully');
        startRentReminders();
    } catch (err) {
        console.warn('⚠️ Primary MongoDB connection failed (check Atlas IP whitelist):', err.message);
        if (primaryUri !== 'mongodb://127.0.0.1:27017/rental_manager') {
            console.log('🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/rental_manager)...');
            try {
                await mongoose.connect('mongodb://127.0.0.1:27017/rental_manager', { serverSelectionTimeoutMS: 2000 });
                console.log('✅ Connected to local MongoDB fallback successfully');
                startRentReminders();
            } catch (localErr) {
                console.error('❌ Failed to connect to both Atlas and local MongoDB:', localErr.message);
            }
        }
    }
};

connectDB();

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
