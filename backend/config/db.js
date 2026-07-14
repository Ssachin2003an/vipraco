const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/vipraco';
  await mongoose.connect(uri);
  console.log('MongoDB connected.');
}

module.exports = connectDB;
