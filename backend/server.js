const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoTasksRouter = require('./routes/mongoTasks');
const mockTasksRouter = require('./routes/mockTasks');
const authRouter = require('./routes/auth');
const { connectMongo } = require('./mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});

// Serve static assets from the frontend/public folder
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Home route fallback for single page navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// Middleware to ensure DB connection is ready before handling API requests
app.use(async (req, res, next) => {
  if (process.env.MONGO_URI && (req.path.startsWith('/auth') || req.path.startsWith('/tasks'))) {
    try {
      await connectMongo();
    } catch (err) {
      console.error('Failed to ensure MongoDB connection:', err);
      // Let it fall through so routes can handle failure (or mock can take over)
    }
  }
  next();
});

if (process.env.MONGO_URI) {
  // Mount routers
  app.use('/auth', authLimiter, authRouter);
  app.use('/tasks', mongoTasksRouter);
} else {
  console.log('MongoDB not configured; mock task routes mounted at /tasks');
  app.use('/tasks', mockTasksRouter);
}

// Serve extra HTML files
app.use('/reset-password.html', express.static(path.join(__dirname, '..', 'frontend', 'public', 'reset-password.html')));
app.use('/forgot-password.html', express.static(path.join(__dirname, '..', 'frontend', 'public', 'forgot-password.html')));

// For local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing process or set PORT to a free value.`);
      process.exit(1);
    }
    throw err;
  });
}

// Export the Express API for Vercel Serverless Functions
module.exports = app;
