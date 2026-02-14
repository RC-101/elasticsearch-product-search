const { Client } = require('@elastic/elasticsearch');
require('dotenv').config({ path: '../.env' });

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  requestTimeout: 30000,
  maxRetries: 3
});

// Test connection
const checkConnection = async () => {
  try {
    const health = await client.cluster.health();
    console.log('✅ Elasticsearch connected:', health.cluster_name);
    return true;
  } catch (error) {
    console.error('❌ Elasticsearch connection failed:', error.message);
    return false;
  }
};

module.exports = { client, checkConnection };