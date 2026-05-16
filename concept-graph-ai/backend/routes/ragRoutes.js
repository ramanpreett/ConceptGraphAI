const express = require('express');
const router = express.Router();
const { upsertDocument, searchByEmbedding, getEmbeddingForText } = require('../services/vectorService');

// Upsert a document with embedding
router.post('/rag/upsert', async (req, res) => {
  try {
    const { id, text, metadata } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'text required' });
    const embedding = await getEmbeddingForText(text);
    const doc = await upsertDocument(id, text, metadata, embedding);
    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Query by text (embeds query then searches)
router.post('/rag/query', async (req, res) => {
  try {
    const { text, k } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'text required' });
    const qEmb = await getEmbeddingForText(text);
    const results = await searchByEmbedding(qEmb, k || 5);
    res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
