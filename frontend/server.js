const express = require('express');
const path = require('path');
const tasksRouter = require('./routes/tasks');
const mongoTasksRouter = require('./routes/mongoTasks');
const { connectMongo } = require('./mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// API routes for tasks
app.use('/tasks', tasksRouter);

// Optionally initialize and mount MongoDB-backed routes when MONGO_URI is provided
if (process.env.MONGO_URI) {
  connectMongo().then((m) => {
    if (m) {
      app.use('/mongo-tasks', mongoTasksRouter);
      console.log('MongoDB routes mounted at /mongo-tasks');
    }
  }).catch(err => console.error('Failed to initialize MongoDB:', err.message));
} else {
  console.log('MONGO_URI not set — MongoDB routes not mounted.');
}

// Home route fallback for single page navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
