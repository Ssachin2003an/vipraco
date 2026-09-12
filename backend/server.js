const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
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