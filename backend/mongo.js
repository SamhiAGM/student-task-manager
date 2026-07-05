const mongoose = require('mongoose');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('MONGO_URI not set; skipping MongoDB initialization.');
    return null;
  }

  const maxAttempts = Number(process.env.MONGO_CONNECT_RETRIES || 5);
  const retryDelayMs = Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS || 1500);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        dbName: process.env.MONGO_DB_NAME || 'student_task_management'
      });
      console.log('Connected to MongoDB.');
      return mongoose;
    } catch (err) {
      const lastAttempt = attempt === maxAttempts;
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (lastAttempt) {
        console.error('MongoDB connection error:', err.message);
        return null;
      }
      await wait(retryDelayMs);
    }
  }

  return null;
}

module.exports = { connectMongo, mongoose };
