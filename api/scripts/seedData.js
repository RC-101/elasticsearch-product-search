const { checkConnection } = require('../config/elasticsearch');
const IndexService = require('../services/indexService');
const BulkIndexService = require('../services/bulkIndexService');
const { generateProducts } = require('../utils/dataGenerator');
require('dotenv').config({ path: '../../.env' });

const indexName = process.env.ELASTICSEARCH_INDEX || 'products';

async function seedData() {
  console.log('🌱 Starting data seeding process...\n');

  // Check Elasticsearch connection
  const isConnected = await checkConnection();
  if (!isConnected) {
    console.error('Cannot proceed without Elasticsearch connection');
    process.exit(1);
  }

  // Initialize services
  const indexService = new IndexService(indexName);
  const bulkIndexService = new BulkIndexService(indexName);

  // Recreate index (clean slate)
  console.log('\n📦 Setting up index...');
  await indexService.recreateIndex();

  // Generate products
  console.log('\n🎲 Generating product data...');
  const productCount = parseInt(process.argv[2]) || 1000;
  const products = generateProducts(productCount);
  console.log(`✅ Generated ${products.length} products`);

  // Bulk index in batches
  console.log('\n📤 Indexing products...');
  const batchSize = 500;
  let indexed = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    await bulkIndexService.bulkIndex(batch);
    indexed += batch.length;
    console.log(`   Progress: ${indexed}/${products.length}`);
  }

  // Verify indexing
  console.log('\n🔍 Verifying indexed documents...');
  const count = await bulkIndexService.countDocuments();
  console.log(`✅ Total documents in index: ${count}`);

  // Show index info
  console.log('\n📊 Index Information:');
  const info = await indexService.getIndexInfo();
  console.log(`   Documents: ${info.document_count}`);
  console.log(`   Size: ${(info.size / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n✨ Seeding completed successfully!\n');
  process.exit(0);
}

seedData().catch(error => {
  console.error('💥 Seeding failed:', error);
  process.exit(1);
});