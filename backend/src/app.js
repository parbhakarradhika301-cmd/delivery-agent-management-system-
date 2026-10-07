/**
 * Express application configuration module.
 * Sets up global middleware, CORS with exposed headers, routes, and error handlers.
 * Exported without calling app.listen() to facilitate automated integration testing.
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const agentRoutes = require('./routes/agent.routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { isRedisReady } = require('./lib/redis');

const app = express();

// Security and HTTP Request Logging
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    exposedHeaders: ['X-Cache'],
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint with Redis connectivity status
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
