const { client } = require('../config/elasticsearch');

class BulkIndexService {
  constructor(indexName) {
    this.indexName = indexName;
  }

  async bulkIndex(products) {
    try {
      const body = products.flatMap(doc => [
        { index: { _index: this.indexName, _id: doc.id } },
        doc
      ]);

      const bulkResponse = await client.bulk({ refresh: true, body });

      if (bulkResponse.errors) {
        const erroredDocuments = [];
        bulkResponse.items.forEach((action, i) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              document: products[i]
            });
          }
        });
        console.error('❌ Bulk indexing had errors:', erroredDocuments.length);
        return { success: false, errors: erroredDocuments };
      }

      console.log(`✅ Successfully indexed ${products.length} documents`);
      return { success: true, count: products.length };
    } catch (error) {
      console.error('❌ Bulk indexing failed:', error.message);
      throw error;
    }
  }

  async countDocuments() {
    try {
      const result = await client.count({ index: this.indexName });
      return result.count;
    } catch (error) {
      console.error('❌ Error counting documents:', error.message);
      return 0;
    }
  }
}

module.exports = BulkIndexService;