/**
 * Express application configuration module.
 * Sets up global middleware, security headers (Helmet), Gzip compression,
 * rate limiting on /api, CORS with exposed X-Cache headers, routes, and error handlers.
 * Exported without calling app.listen() to facilitate automated integration testing.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const agentRoutes = require('./routes/agent.routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { isRedisReady } = require('./lib/redis');

const app = express();

// Security HTTP headers
app.use(helmet());

// Gzip response compression
app.use(compression());

// CORS Configuration with exposed X-Cache header
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    exposedHeaders: ['X-Cache'],
  })
);

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request body parsers with 10kb size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate Limiter for /api endpoints: 300 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    });
  },
});
app.use('/api', apiLimiter);

// Health Check Endpoint (reports server and Redis status)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    redis: isRedisReady() ? 'up' : 'down',
  });
});

// Primary API Routes
app.use('/api/agents', agentRoutes);

// Catch-all 404 Route Handler
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
