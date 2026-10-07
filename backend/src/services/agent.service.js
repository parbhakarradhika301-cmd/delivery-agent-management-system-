/**
 * Agent Service layer handling business logic, database queries, and Redis caching.
 *
 * CACHING STRATEGY:
 * - Pattern: Cache-Aside (Lazy Loading) with Write Invalidation.
 * - Reads:
 *   1. Check Redis first. If key exists, return cached data immediately (Cache HIT).
 *   2. On miss, query PostgreSQL via Prisma, write to Redis with a TTL (default 60s),
 *      and return data (Cache MISS).
 *   3. If an agent record is not found (404), do NOT cache the null result.
 * - Writes (create, update, delete):
 *   1. Execute database mutation directly in single round-trip.
 *   2. After database mutation succeeds, invalidate relevant cache keys:
 *      - create: invalidate dams:agents:list
 *      - update: invalidate dams:agent:{id} and dams:agents:list
 *      - delete: invalidate dams:agent:{id} and dams:agents:list
 *   3. If record does not exist on update/delete, Prisma P2025 error maps to 404 AGENT_NOT_FOUND.
 * - Resilience:
 *   All cache operations gracefully degrade: if Redis is offline or fails,
 *   the system continues serving requests directly from PostgreSQL.
 */
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const ApiError = require('../utils/ApiError');

/**
 * Transforms a Prisma database model instance into the external API representation.
 * Maps uppercase enum status (ACTIVE/INACTIVE) to lowercase ("active"/"inactive").
 *
 * @param {object|null} agent - Raw database agent record
 * @returns {object|null} Formatted agent object for API consumers
 */
const formatAgentResponse = (agent) => {
  if (!agent) return null;
  return {
    id: agent.id,
    fullName: agent.fullName,
    phone: agent.phone,
    email: agent.email,
    serviceArea: agent.serviceArea,
    status: agent.status.toLowerCase(),
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
};

/**
 * Create a new delivery agent.
 * Invalidates the cached agent list upon successful DB insertion.
 *
 * @param {object} agentData - Validated agent attributes
 * @returns {Promise<object>} Created agent formatted for API
 */
const createAgent = async (agentData) => {
  const data = {
    fullName: agentData.fullName,
    phone: agentData.phone,
    email: agentData.email,
    serviceArea: agentData.serviceArea,
    status: agentData.status ? agentData.status.toUpperCase() : 'ACTIVE',
  };

  const agent = await prisma.agent.create({
    data,
  });

  // Invalidate agent list cache after DB write succeeds
  await cache.del(cache.keys.agentList());

  return formatAgentResponse(agent);
};

/**
 * Retrieve all delivery agents sorted by newest first with cache-aside.
 *
 * @returns {Promise<{ data: Array<object>, cacheHit: boolean }>} List of agents and hit indicator
 */
const getAllAgents = async () => {
  const cacheKey = cache.keys.agentList();

  // 1. Try reading from cache
  const cachedList = await cache.getJSON(cacheKey);
  if (cachedList) {
    return { data: cachedList, cacheHit: true };
  }

  // 2. Fetch from database on cache miss
  const agents = await prisma.agent.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedAgents = agents.map(formatAgentResponse);

  // 3. Store formatted list in cache with TTL
  await cache.setJSON(cacheKey, formattedAgents);

  return { data: formattedAgents, cacheHit: false };
};

/**
 * Retrieve a single delivery agent by unique ID with cache-aside.
 *
 * @param {string} id - Agent UUID
 * @returns {Promise<{ data: object, cacheHit: boolean }>} Found agent and hit indicator
 * @throws {ApiError} 404 AGENT_NOT_FOUND if no agent matches id (never cached)
 */
const getAgentById = async (id) => {
  const cacheKey = cache.keys.agent(id);

  // 1. Try reading from cache
  const cachedAgent = await cache.getJSON(cacheKey);
  if (cachedAgent) {
    return { data: cachedAgent, cacheHit: true };
  }

  // 2. Query database on cache miss
  const agent = await prisma.agent.findUnique({
    where: { id },
  });

  // Throw 404 and DO NOT cache missing records
  if (!agent) {
    throw new ApiError(404, 'AGENT_NOT_FOUND', 'Agent not found');
  }

  const formatted = formatAgentResponse(agent);

  // 3. Store in cache with TTL
  await cache.setJSON(cacheKey, formatted);

  return { data: formatted, cacheHit: false };
};

/**
 * Partially update an existing agent.
 * Eliminates extra findUnique query; directly executes update and lets Prisma P2025 map to 404.
 * Invalidates both the specific agent cache and list cache after successful DB update.
 *
 * @param {string} id - Agent UUID
 * @param {object} updateData - Validated partial fields to update
 * @returns {Promise<object>} Updated agent formatted for API
 */
const updateAgent = async (id, updateData) => {
  // Construct payload mapping lowercase status to uppercase Prisma enum
  const dataToUpdate = {};
  if (updateData.fullName !== undefined) dataToUpdate.fullName = updateData.fullName;
  if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone;
  if (updateData.email !== undefined) dataToUpdate.email = updateData.email;
  if (updateData.serviceArea !== undefined) dataToUpdate.serviceArea = updateData.serviceArea;
  if (updateData.status !== undefined) dataToUpdate.status = updateData.status.toUpperCase();

  // Single round-trip mutation: throws P2025 if record does not exist
  const updatedAgent = await prisma.agent.update({
    where: { id },
    data: dataToUpdate,
  });

  // Invalidate both agent cache and list cache after DB update succeeds
  await cache.del(cache.keys.agent(id), cache.keys.agentList());

  return formatAgentResponse(updatedAgent);
};

/**
 * Delete a delivery agent by ID.
 * Eliminates extra findUnique query; directly executes delete and lets Prisma P2025 map to 404.
 * Invalidates both the specific agent cache and list cache after successful DB delete.
 *
 * @param {string} id - Agent UUID
 * @returns {Promise<void>}
 */
const deleteAgent = async (id) => {
  // Single round-trip mutation: throws P2025 if record does not exist
  await prisma.agent.delete({
    where: { id },
  });

  // Invalidate both agent cache and list cache after DB delete succeeds
  await cache.del(cache.keys.agent(id), cache.keys.agentList());
};

module.exports = {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
};
