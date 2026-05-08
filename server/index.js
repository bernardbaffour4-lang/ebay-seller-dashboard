require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const analyticsRoutes = require('./routes/analytics');
const salesRoutes = require('./routes/sales');
const promotionsRoutes = require('./routes/promotions');
const { startAutoPromotion } = require('./services/autoPromotion');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : true)
  : ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/promotions', promotionsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`eBay Seller Dashboard server running on http://localhost:${PORT}`);
  startAutoPromotion();
});
