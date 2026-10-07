/**
 * Shared Redis client instance using ioredis.
 * Connects to Upstash Redis using the rediss:// (TLS) protocol URL.
 * Configured with fast timeouts and offline queue disabled for resilient fallback.
 */
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 5000,
});

redis.on('ready', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  // Log error without crashing application
  console.warn('[Redis Error]:', err.message);
});

/**
 * Checks if Redis is currently in 'ready' state and able to process commands.
 * @returns {boolean}
 */
const isRedisReady = () => redis.status === 'ready';

module.exports = {
  redis,
  isRedisReady,
};
