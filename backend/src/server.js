/**
 * Server entrypoint.
 * Loads environment variables, connects to server port, and handles graceful shutdown of HTTP, DB, and Redis.
 */
require('dotenv').config();
const app = require('./app');
const prisma = require('./lib/prisma');
const { redis } = require('./lib/redis');

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Delivery Agent Management System backend running on http://localhost:${PORT}`);
  console.log(`🩺 Health check available at http://localhost:${PORT}/health`);
  console.log(`📦 Agent API endpoints at http://localhost:${PORT}/api/agents`);
});

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Database connections closed.');
      await redis.quit();
      console.log('Redis connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
