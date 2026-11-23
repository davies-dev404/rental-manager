const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { validateSecurityConfig, sanitizeRequest } = require('./middleware/securityMiddleware');

validateSecurityConfig();

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;

// Render / reverse-proxy IP resolution for rate limiting & cookies
app.set('trust proxy', 1);

const ALLOWED_CORS_ORIGINS = new Set([
  'http://localhost:5173',
  'http://msimamizi.localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'https://rental-manager-gold.vercel.app',
  'https://rental-manager-1-7jmg.onrender.com',
  'https://afrinextech.co.ke',
  'https://www.afrinextech.co.ke',
  'https://makaziflow.afrinextech.co.ke',
  'https://msimamizi.afrinextech.co.ke',
]);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin rewrites)
    if (!origin) return callback(null, true);
    if (
      ALLOWED_CORS_ORIGINS.has(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.afrinextech.co.ke') ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for unified domain routing
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition', 'Content-Length'],
  optionsSuccessStatus: 204
};

// Apply CORS before Helmet & Rate Limiting so preflight OPTIONS and error/429 responses always include CORS headers
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Security Middleware: Helmet
// Security Middleware: Helmet with Cloudflare Turnstile & API friendly CSP
app.use(
  helmet({
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://challenges.cloudflare.com",
          "https://*.cloudflare.com",
          "https://static.cloudflareinsights.com"
        ],
        frameSrc: [
          "'self'",
          "https://challenges.cloudflare.com",
          "https://*.challenges.cloudflare.com",
          "https://*.cloudflare.com",
          "https://test.pesaflow.com",
          "https://payments.ecitizen.go.ke",
          "https://*.pesaflow.com",
          "https://*.intasend.com",
          "https://cybqa.pesapal.com",
          "https://pay.pesapal.com",
          "https://*.pesapal.com"
        ],
        connectSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://challenges.cloudflare.com",
          "https://*.challenges.cloudflare.com",
          "https://*.cloudflare.com",
          "https://*.cloudflarecaptcha.com",
          "https://*.dnstest.challenges.cloudflare.com",
          "https://dnstest.dev",
          "https://static.cloudflareinsights.com",
          "https://makaziflow.afrinextech.co.ke",
          "https://msimamizi.afrinextech.co.ke",
          "https://afrinextech.co.ke",
          "https://rental-manager-1-7jmg.onrender.com",
          "https://rental-manager-gold.vercel.app",
          "https://test.pesaflow.com",
          "https://payments.ecitizen.go.ke",
          "https://*.pesaflow.com",
          "https://*.intasend.com",
          "https://api.intasend.com",
          "https://sandbox.intasend.com",
          "https://payment.intasend.com",
          "https://cybqa.pesapal.com",
          "https://pay.pesapal.com",
          "https://*.pesapal.com",
          "https://etims-api-sbx.kra.go.ke",
          "https://etims-api.kra.go.ke"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
          "https://challenges.cloudflare.com"
        ],
        upgradeInsecureRequests: null
      }
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Security Middleware: Rate Limiting (applied after CORS and skipping OPTIONS preflights)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // Generous per-IP budget for SPA fetches, refreshes, and PDF downloads
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/api/health',
  message: { message: 'Too many requests, please try again shortly.' }
});
app.use(limiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(sanitizeRequest);

// Lightweight Cookie Parser Middleware (Senior Standard for httpOnly JWT Cookies)
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = decodeURIComponent(parts.slice(1).join('='));
        req.cookies[name] = value;
      }
    });
  }
  next();
});
app.use(morgan('dev'));

// Global bufferCommands setting: fail fast when disconnected (NoSQL operator injection is stripped at Express layer via sanitizeRequest)
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
    const isProduction = process.env.NODE_ENV === 'production' || isServerless;

    let uri = process.env.MONGODB_URI || (isServerless ? null : 'mongodb://127.0.0.1:27017/rental_manager_dev');

    // Strict Environment Separation:
    // Localhost / Development NEVER pollutes or shares database with Production!
    if (!isProduction) {
      if (process.env.MONGODB_DEV_URI) {
        uri = process.env.MONGODB_DEV_URI;
      } else if (uri && uri.includes('/rental_manager?')) {
        uri = uri.replace('/rental_manager?', '/rental_manager_dev?');
      } else if (uri && uri.endsWith('/rental_manager')) {
        uri = uri.replace('/rental_manager', '/rental_manager_dev');
      }
    }

    if (!uri) {
        console.error('❌ MONGODB_URI environment variable is missing.');
        throw new Error('MONGODB_URI environment variable is missing. Please configure MONGODB_URI in your environment or hosting dashboard.');
    }

    const isRemoteTlsUri = uri.startsWith('mongodb+srv://') || /[?&](tls|ssl)=true/i.test(uri);
    const opts = {
        serverSelectionTimeoutMS: isServerless ? 8000 : 30000,
        connectTimeoutMS: isServerless ? 8000 : 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: isServerless ? 5 : 10,
        minPoolSize: isServerless ? 1 : 2,
        heartbeatFrequencyMS: 10000,
        ...(isRemoteTlsUri ? { tls: true } : {})
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
        console.log('✅ MongoDB Connected:', uri.split('@')[1]?.split('/')[0] || 'local');
        // Background reminders only dispatched when initiated by user/landlord
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

// Initiate connection on boot — await it so routes only register after DB is ready
let dbReady = false;
const dbBootPromise = connectDB()
    .then(async () => {
      dbReady = true;
      if (process.env.NODE_ENV !== 'test') {
        try {
          const { seedDefaultPlans, processSubscriptionExpirations } = require('./services/subscriptionService');
          const PaymentService = require('./services/payments/PaymentService');
          await seedDefaultPlans();
          await PaymentService.seedProviders();
          const cron = require('node-cron');
          // Run hourly sweep; per-day date key guarantees max 1 reminder email/day per expired/expiring landlord
          cron.schedule('0 * * * *', () => {
            if (mongoose.connection.readyState === 1) {
              processSubscriptionExpirations().catch((e) => console.warn('Expiry sweep warning:', e.message));
            }
          });
          setTimeout(() => {
            if (mongoose.connection.readyState === 1) {
              processSubscriptionExpirations().catch((e) => console.warn('Initial expiry sweep warning:', e.message));
            }
          }, 5000);
        } catch (seedErr) {
          console.warn('SaaS seed notice:', seedErr.message);
        }
      }
    })
    .catch(err => console.error('Initial DB connect error:', err.message));

// Middleware to ensure DB is connected before processing API requests
app.use(async (req, res, next) => {
    if (req.method === 'OPTIONS' || req.path === '/' || req.path === '/api/health' || req.path.startsWith('/api/public')) return next();
    try {
        if (!dbReady) await dbBootPromise; // wait for boot connection if still pending
        await connectDB();
        next();
    } catch (err) {
        console.error('Database middleware connection error:', err.message);
        return res.status(503).json({
            message: 'Database service temporarily unavailable. Please try again shortly.'
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
const { requireActiveSubscription } = require('./middleware/subscriptionLockMiddleware');
const { enforceMaintenanceMode } = require('./middleware/adminMiddleware');

app.use(enforceMaintenanceMode);

app.use('/api/auth', authRoutes);
app.use('/api/properties', requireActiveSubscription, propertyRoutes);
app.use('/api/tenants', requireActiveSubscription, tenantRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/dashboard', requireActiveSubscription, require('./routes/dashboardRoutes'));
app.use('/api/reports', requireActiveSubscription, require('./routes/reportRoutes'));
app.use('/api/expenses', requireActiveSubscription, require('./routes/expenseRoutes'));
app.use('/api/units', requireActiveSubscription, unitRoutes);
app.use('/api/utilities', requireActiveSubscription, require('./routes/utilityRoutes'));
app.use('/api/users', userRoutes);
app.use('/api/payments', requireActiveSubscription, paymentRoutes);
app.use('/api/reminders', requireActiveSubscription, require('./routes/reminderRoutes'));
app.use('/api/activity-logs', require('./routes/activityLogRoutes'));
app.use('/api/mpesa', require('./routes/mpesaRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/v2/payments', require('./routes/v2PaymentRoutes'));
app.use('/api/admin/auth', require('./routes/adminAuthRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/super-admin', require('./routes/superAdminRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
    res.send('Rental Manager API is running...');
});

app.get('/api/health', async (req, res) => {
    let connectionError = null;
    if (req.query.connect === 'true') {
        try {
            await connectDB();
        } catch (err) {
            connectionError = err.message;
        }
    }
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = states[mongoose.connection.readyState] || 'unknown';
    const rawKey = (process.env.BREVO_API_KEY || '').trim();
    const PaymentService = require('./services/payments/PaymentService');
    const paymentGateway = PaymentService.getActiveGatewayStatus();
    res.json({
        status: connectionError ? 'error' : 'ok',
        uptime: Math.floor(process.uptime()),
        database: {
            status: dbState,
            readyState: mongoose.connection.readyState
        },
        messaging: {
            configured: Boolean(rawKey)
        },
        paymentGateway,
        env: process.env.NODE_ENV || 'development'
    });
});

// Error Handling Middleware (never expose stack traces or raw internals in production)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err.stack || err.message);
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Request payload exceeds maximum allowed size (2MB).' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Malformed JSON request body.' });
    }
    const isProd = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        message: isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error')
    });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
