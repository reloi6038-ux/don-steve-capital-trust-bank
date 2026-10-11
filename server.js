require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

connectDB();

const app = express();

/* ---------- Security & Core Middleware ---------- */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/* ---------- Rate Limiting ---------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

/* ---------- API Routes ---------- */
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);

/* ---------- Health Check ---------- */
app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    status: 'OK',
    bank: 'Don Steve Capital Trust Bank',
  })
);

/* ---------- Serve Static Frontend ---------- */
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

/* ---------- SPA Catch-All (Express 4 + 5 safe) ---------- */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) return next();
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return next();
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* ---------- Error Handling (MUST BE LAST) ---------- */
app.use(notFound);
app.use(errorHandler);

/* ---------- Start ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🏦 Don Steve Capital Trust Bank running on port ${PORT}`)
);