const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');
const adminRoutes = require('./routes/admin');

const app = express();
// CORS_ORIGIN set in Render env vars to your deployed frontend URL.
// Falls back to open CORS for local dev.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'vipraco-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`VipraCo backend running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Unable to connect to MongoDB:', err.message);
    process.exit(1);
  });