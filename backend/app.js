/**
 * The Express application: security middleware, health check, API routes, error handling.
 * server.js starts it; keeping them apart lets tests import the app without opening a port.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const aiService = require('./services/aiService');
const { ping } = require('./lib/supabase');

const app = express();

app.disable('x-powered-by');
if (config.isProduction) app.set('trust proxy', 1); // behind a load balancer / reverse proxy
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => cb(null, config.isAllowedOrigin(origin)),
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Timezone-Offset'],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
if (!config.isProduction) app.use(morgan('dev'));

// Public health check: readiness only - no keys, hosts or error details
app.get('/api/health', async (req, res) => {
  const db = await ping();
  res.status(db.ok ? 200 : 503).json({
    success: db.ok,
    status: db.ok ? 'ok' : 'unavailable',
    supabaseReady: db.ok,
    supabaseIssue: db.ok ? null : db.reason, // not_configured | not_migrated | unreachable | error
    aiConfigured: aiService.isConfigured(),
  });
});

app.use('/api', require('./routes'));
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
