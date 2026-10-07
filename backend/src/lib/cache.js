/**
 * Cache abstraction layer on top of ioredis.
 * Provides namespaced key helpers, JSON serialization, and graceful degradation:
 * If Redis is unavailable, operations fail silently with a warning and fall back to database queries.
 */
const { redis } = require('./redis');

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 60;

/**
 * Predefined key generators to namespace and centralize cache keys.
 */
const keys = {
  agentList: () => 'dams:agents:list',
  agent: (id) => `dams:agent:${id}`,
};

/**
 * Retrieve and deserialize a JSON-encoded value from Redis.
 *
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed value or null on miss/error
 */
const getJSON = async (key) => {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Cache Warning] Failed to get key "${key}":`, err.message);
    return null;
  }
};

/**
 * Serialize and store a value as JSON in Redis with expiration TTL.
 *
 * @param {string} key - Cache key
 * @param {any} value - Value to serialize and store
 * @param {number} [ttlSeconds=DEFAULT_TTL] - Time-to-live in seconds
 * @returns {Promise<void>}
 */
const setJSON = async (key, value, ttlSeconds = DEFAULT_TTL) => {
  try {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`[Cache Warning] Failed to set key "${key}":`, err.message);
  }
};

/**
 * Delete one or more keys from Redis.
 *
 * @param {...string} keysToDelete - Keys to invalidate
 * @returns {Promise<void>}
 */
const del = async (...keysToDelete) => {
  try {
    const flattened = keysToDelete.flat().filter(Boolean);
    if (flattened.length > 0) {
      await redis.del(...flattened);
    }
  } catch (err) {
    console.warn(`[Cache Warning] Failed to delete keys [${keysToDelete.join(', ')}]:`, err.message);
  }
};

module.exports = {
  keys,
  getJSON,
  setJSON,
  del,
  DEFAULT_TTL,
};
