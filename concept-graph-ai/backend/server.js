require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const uploadRoutes     = require('./routes/uploadRoutes');
const extractionRoutes = require('./routes/extractionRoutes');
const topicRoutes      = require('./routes/topicRoutes');
const graphRoutes      = require('./routes/graphRoutes');
const questionRoutes   = require('./routes/questionRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const dependencyRoutes = require('./routes/dependencyRoutes');
const weaknessRoutes   = require('./routes/weaknessRoutes');
const pipelineRoutes   = require('./routes/pipelineRoutes');
const ollamaRoutes     = require('./routes/ollamaRoutes');
const progressRoutes   = require('./routes/progressRoutes');
const sessionRoutes      = require('./routes/sessionRoutes');
const learningPathRoutes = require('./routes/learningPathRoutes');
const bloomRoutes        = require('./routes/bloomRoutes');
const ragRoutes          = require('./routes/ragRoutes');
const { errorHandlingMiddleware } = require('./utils/middleware');
const { connectDB } = require('./services/mongoService');

const app  = express();
const PORT = process.env.PORT || 5000;

const normalizeOrigin = (value) => {
  if (!value || value === '*') return '*';
  return value.trim().replace(/\/+$/, '');
};

const buildAllowedOrigins = () => {
  const rawOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map(normalizeOrigin)
    .filter((value) => value && value !== '*');

  return new Set(rawOrigins);
};

const ALLOWED_ORIGINS = buildAllowedOrigins();

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (ALLOWED_ORIGINS.has(origin)) return true;

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;

  if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true;

  return false;
};

// ── Middleware ────────────────────────────────────────────────
console.log('CORS allowed origins:', [...ALLOWED_ORIGINS]);
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api', uploadRoutes);
app.use('/api', extractionRoutes);
app.use('/api', topicRoutes);
app.use('/api', graphRoutes);
app.use('/api', questionRoutes);
app.use('/api', evaluationRoutes);
app.use('/api', dependencyRoutes);
app.use('/api', weaknessRoutes);
app.use('/api', pipelineRoutes);
app.use('/api', ollamaRoutes);
app.use('/api', progressRoutes);
app.use('/api', sessionRoutes);
app.use('/api', learningPathRoutes);
app.use('/api', bloomRoutes);
app.use('/api', ragRoutes);
// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.path });
});

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandlingMiddleware);

// ── Start: connect MongoDB then listen ────────────────────────
connectDB().then((ok) => {
  if (!ok) {
    console.warn('⚠️  Database connection failed — starting server without DB. Check logs for details.');
  }
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`💾 Upload:     POST /api/upload`);
    console.log(`🧠 Topics:     POST /api/topics`);
    console.log(`📚 Questions:  POST /api/questions`);
    console.log(`📊 Evaluate:   POST /api/evaluate\n`);
  });
}).catch((err) => {
  console.error('Unexpected error starting server:', err && err.stack ? err.stack : err);
  process.exit(1);
});

module.exports = app;
