const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');
require('dotenv').config();

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Seed data uses plaintext-looking hashed_pass_* placeholders for demo.
    // Supports both real bcrypt hashes and the seeded demo password "password123".
    let valid = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      valid = await bcrypt.compare(password, user.password_hash);
    } else {
      valid = password === 'password123';
    }

    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const org = await Organization.findOne({ organization_id: user.organization_id });

    const token = jwt.sign(
      {
        user_id: user.user_id,
        organization_id: user.organization_id,
        role: user.role,
        first_name: user.first_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        department: user.department,
        organization_id: user.organization_id,
        org_name: org ? org.org_name : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.me = async (req, res) => {
  const user = await User.findOne({ user_id: req.user.user_id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    department: user.department,
    organization_id: user.organization_id
  });
};
