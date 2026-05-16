const mongoose = require('mongoose');
const axios = require('axios');

// Minimal RAG vector helpers using Atlas Vector Search (stores embeddings in MongoDB)
// Assumptions:
// - You will generate embeddings via an embedding provider (e.g., OpenAI, Google, Ollama) and call `upsertDocument`.
// - Documents are stored in a `rag_documents` collection with fields: _id, text, metadata, embedding (array of numbers)

const RagDocumentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  embedding: { type: [Number], index: '2dsphere' }, // placeholder, Atlas uses vector index configured in UI
  createdAt: { type: Date, default: Date.now }
});

const RagDocument = mongoose.models.RagDocument || mongoose.model('RagDocument', RagDocumentSchema, 'rag_documents');

async function upsertDocument(id, text, metadata, embedding) {
  const doc = await RagDocument.findOneAndUpdate(
    id ? { _id: id } : { text },
    { $set: { text, metadata, embedding, createdAt: new Date() } },
    { upsert: true, new: true }
  );
  return doc;
}

// Query Atlas Vector Search using aggregation with $search + knn
async function searchByEmbedding(queryEmbedding, k = 5) {
  // Use raw collection aggregate because mongoose doesn't support $search stage helper
  const coll = RagDocument.collection;
  const pipeline = [
    {
      $search: {
        knn: {
          vector: queryEmbedding,
          path: 'embedding',
          k
        }
      }
    },
    { $limit: k },
    { $project: { text: 1, metadata: 1, score: { $meta: 'searchScore' } } }
  ];

  const results = await coll.aggregate(pipeline).toArray();
  return results;
}

// Example embedding wrapper — replace with your real embedding call
async function getEmbeddingForText(text) {
  // Placeholder: user should plug in their embedding provider
  // Example: call Ollama or OpenAI to get embeddings
  throw new Error('getEmbeddingForText not implemented. Use your embedding provider and return an array of numbers.');
}

module.exports = { upsertDocument, searchByEmbedding, getEmbeddingForText, RagDocument };
