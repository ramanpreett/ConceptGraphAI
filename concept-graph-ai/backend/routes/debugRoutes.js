const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { testGeminiConnection } = require('../services/ollamaService');

router.get('/debug/health-full', async (req, res) => {
  const out = { timestamp: new Date().toISOString() };

  // MongoDB state
  try {
    const state = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    out.mongo = { state };

    if (state === 1 && mongoose.connection.db && typeof mongoose.connection.db.admin === 'function') {
      try {
        const ping = await mongoose.connection.db.admin().ping();
        out.mongo.ping = ping;
        out.mongo.ok = true;
      } catch (err) {
        out.mongo.ok = false;
        out.mongo.error = err && err.message ? err.message : String(err);
      }
    } else {
      out.mongo.ok = false;
      out.mongo.info = state === 0 ? 'disconnected' : (state === 2 ? 'connecting' : 'other');
    }
  } catch (err) {
    out.mongo = { ok: false, error: err && err.message ? err.message : String(err) };
  }

  // Gemini test
  try {
    if (typeof testGeminiConnection === 'function') {
      const geminiOk = await testGeminiConnection();
      out.gemini = { ok: !!geminiOk };
    } else {
      out.gemini = { ok: false, info: 'testGeminiConnection not available' };
    }
  } catch (err) {
    out.gemini = { ok: false, error: err && err.message ? err.message : String(err) };
  }

  res.json({ success: true, data: out });
});

module.exports = router;
