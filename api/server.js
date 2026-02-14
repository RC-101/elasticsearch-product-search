const express = require('express');
const cors = require('cors');
const { checkConnection } = require('./config/elasticsearch');
const searchRoutes = require('./routes/searchRoutes');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Elasticsearch Product Search API',
    timestamp: new Date().toISOString() 
  });
});

// API routes
app.use('/api', searchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const startServer = async () => {
  // Check Elasticsearch connection
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    console.error('Failed to connect to Elasticsearch. Make sure Docker containers are running.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Elasticsearch: ${process.env.ELASTICSEARCH_NODE}`);
    console.log(`\n📚 Available endpoints:`);
    console.log(`   GET  /api/search`);
    console.log(`   GET  /api/autocomplete`);
    console.log(`   GET  /api/products/:id`);
    console.log(`   GET  /api/products/:id/similar`);
    console.log(`   GET  /api/stats\n`);
  });
};

startServer();