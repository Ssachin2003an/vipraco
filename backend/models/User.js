const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  organization_id: { type: String, required: true, index: true }, // tenant key
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, required: true }, // Employee | Manager | Admin
  manager_id: { type: String, default: null }, // self-referencing user_id
  date_of_joining: { type: Date, required: true },
  department: { type: String },
  location: { type: String }
});

module.exports = mongoose.model('User', userSchema);
