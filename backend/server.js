const express = require('express');
const path = require('path');
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

// Serve static assets from the frontend/public folder
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Home route fallback for single page navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

async function startServer() {
  // MongoDB is the primary backend for this project.
  // If MongoDB is unreachable, the app falls back to local mock task data so the UI still works.
  if (process.env.MONGO_URI) {
    try {
      const mongooseInstance = await connectMongo();
      if (mongooseInstance) {
        app.use('/auth', authRouter);
        app.use('/tasks', mongoTasksRouter);
        app.use('/reset-password.html', express.static(path.join(__dirname, '..', 'frontend', 'public', 'reset-password.html')));
        app.use('/forgot-password.html', express.static(path.join(__dirname, '..', 'frontend', 'public', 'forgot-password.html')));
        console.log('MongoDB task routes mounted at /tasks');
      } else {
        app.use('/tasks', mockTasksRouter);
        console.log('MongoDB unavailable; mock task routes mounted at /tasks');
      }
    } catch (err) {
      app.use('/tasks', mockTasksRouter);
      console.log('MongoDB unavailable; mock task routes mounted at /tasks');
      console.error('Failed to initialize MongoDB:', err.message);
    }
  } else {
    app.use('/tasks', mockTasksRouter);
    console.log('MongoDB not configured; mock task routes mounted at /tasks');
  }

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

startServer();
