/**
 * Agent Service layer handling all business logic and database interactions.
 *
 * NOTE FOR FUTURE CACHING (REDIS):
 * This service layer is isolated from HTTP controllers. When Redis is introduced in the next step,
 * caching logic (e.g., cache-aside in getAgentById / list, and invalidation in create / update / delete)
 * can be implemented directly within this service without modifying any controllers.
 */
const prisma = require('../lib/prisma');
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

  // [Cache Hook]: Invalidate agent list cache here when Redis is integrated

  return formatAgentResponse(agent);
};

/**
 * Retrieve all delivery agents sorted by newest first.
 *
 * @returns {Promise<Array<object>>} List of all agents
 */
const getAllAgents = async () => {
  // [Cache Hook]: Check Redis for cached list before querying DB

  const agents = await prisma.agent.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedAgents = agents.map(formatAgentResponse);

  // [Cache Hook]: Store formatted list in Redis with TTL

  return formattedAgents;
};

/**
 * Retrieve a single delivery agent by unique ID.
 *
 * @param {string} id - Agent UUID
 * @returns {Promise<object>} Found agent formatted for API
 * @throws {ApiError} 404 AGENT_NOT_FOUND if no agent matches id
 */
const getAgentById = async (id) => {
  // [Cache Hook]: Check Redis cache for agent by id before querying DB

  const agent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!agent) {
    throw new ApiError(404, 'AGENT_NOT_FOUND', 'Agent not found');
  }

  const formatted = formatAgentResponse(agent);

  // [Cache Hook]: Store agent in Redis with key `agent:${id}`

  return formatted;
};

/**
 * Partially update an existing agent.
 *
 * @param {string} id - Agent UUID
 * @param {object} updateData - Validated partial fields to update
 * @returns {Promise<object>} Updated agent formatted for API
 * @throws {ApiError} 404 AGENT_NOT_FOUND if agent does not exist
 */
const updateAgent = async (id, updateData) => {
  // Verify agent exists
  const existingAgent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!existingAgent) {
    throw new ApiError(404, 'AGENT_NOT_FOUND', 'Agent not found');
  }

  // Construct payload mapping lowercase status to uppercase Prisma enum
  const dataToUpdate = {};
  if (updateData.fullName !== undefined) dataToUpdate.fullName = updateData.fullName;
  if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone;
  if (updateData.email !== undefined) dataToUpdate.email = updateData.email;
  if (updateData.serviceArea !== undefined) dataToUpdate.serviceArea = updateData.serviceArea;
  if (updateData.status !== undefined) dataToUpdate.status = updateData.status.toUpperCase();

  const updatedAgent = await prisma.agent.update({
    where: { id },
    data: dataToUpdate,
  });

  // [Cache Hook]: Invalidate/update Redis cache for `agent:${id}` and list cache

  return formatAgentResponse(updatedAgent);
};

/**
 * Delete a delivery agent by ID.
 *
 * @param {string} id - Agent UUID
 * @returns {Promise<void>}
 * @throws {ApiError} 404 AGENT_NOT_FOUND if agent does not exist
 */
const deleteAgent = async (id) => {
  // Verify agent exists
  const existingAgent = await prisma.agent.findUnique({
    where: { id },
  });

  if (!existingAgent) {
    throw new ApiError(404, 'AGENT_NOT_FOUND', 'Agent not found');
  }

  await prisma.agent.delete({
    where: { id },
  });

  // [Cache Hook]: Remove `agent:${id}` from Redis and invalidate list cache
};

module.exports = {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
};
