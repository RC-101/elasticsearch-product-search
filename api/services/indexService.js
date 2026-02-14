const { client } = require('../config/elasticsearch');
const { productsMapping } = require('../config/indexMapping');

class IndexService {
  constructor(indexName) {
    this.indexName = indexName;
  }

  async createIndex() {
    try {
      const exists = await client.indices.exists({ index: this.indexName });
      
      if (exists) {
        console.log(`⚠️  Index '${this.indexName}' already exists`);
        return false;
      }

      await client.indices.create({
        index: this.indexName,
        body: productsMapping
      });

      console.log(`✅ Index '${this.indexName}' created successfully`);
      return true;
    } catch (error) {
      console.error('❌ Error creating index:', error.message);
      throw error;
    }
  }

  async deleteIndex() {
    try {
      const exists = await client.indices.exists({ index: this.indexName });
      
      if (!exists) {
        console.log(`⚠️  Index '${this.indexName}' does not exist`);
        return false;
      }

      await client.indices.delete({ index: this.indexName });
      console.log(`✅ Index '${this.indexName}' deleted successfully`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting index:', error.message);
      throw error;
    }
  }

  async recreateIndex() {
    await this.deleteIndex();
    await this.createIndex();
  }

  async getIndexInfo() {
    try {
      const exists = await client.indices.exists({ index: this.indexName });
      
      if (!exists) {
        return { exists: false };
      }

      const stats = await client.indices.stats({ index: this.indexName });
      const mapping = await client.indices.getMapping({ index: this.indexName });

      return {
        exists: true,
        document_count: stats.indices[this.indexName].total.docs.count,
        size: stats.indices[this.indexName].total.store.size_in_bytes,
        mapping: mapping[this.indexName].mappings
      };
    } catch (error) {
      console.error('❌ Error getting index info:', error.message);
      throw error;
    }
  }
}

module.exports = IndexService;