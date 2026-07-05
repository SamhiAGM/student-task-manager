const mongoose = require('mongoose');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.log('MONGO_URI not set; skipping MongoDB initialization.');
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      dbName: process.env.MONGO_DB_NAME || 'student_task_management'
    };

    console.log('Attempting to connect to MongoDB...');
    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      console.log('Connected to MongoDB successfully.');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e.message);
    throw e;
  }

  return cached.conn;
}

module.exports = { connectMongo, mongoose };
