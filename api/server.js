const express = require('express');
const cors = require('cors');
const { checkConnection } = require('./config/elasticsearch');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Elasticsearch Product Search API',
    timestamp: new Date().toISOString() 
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
  });
};

startServer();