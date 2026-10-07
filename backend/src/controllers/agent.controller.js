/**
 * Thin HTTP controller layer for agent resource operations.
 * Extracts parameters from request, invokes service methods, sets X-Cache headers, and formats HTTP responses.
 */
const agentService = require('../services/agent.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new delivery agent.
 * Responds with 201 Created and the new agent object in { data: ... }.
 */
const createAgent = asyncHandler(async (req, res) => {
  const agent = await agentService.createAgent(req.body);
  res.status(201).json({
    data: agent,
  });
});

/**
 * List all delivery agents, newest first.
 * Sets X-Cache: HIT | MISS header and responds with 200 OK and { data: [...], count: n }.
 */
const getAgents = asyncHandler(async (req, res) => {
  const { data, cacheHit } = await agentService.getAllAgents();
  res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
  res.status(200).json({
    data,
    count: data.length,
  });
});

/**
 * Retrieve a specific delivery agent by ID.
 * Sets X-Cache: HIT | MISS header and responds with 200 OK and { data: ... }.
 */
const getAgentById = asyncHandler(async (req, res) => {
  const { data, cacheHit } = await agentService.getAgentById(req.params.id);
  res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
  res.status(200).json({
    data,
  });
});

/**
 * Partially update a delivery agent by ID.
 * Responds with 200 OK and { data: ... }.
 */
const updateAgent = asyncHandler(async (req, res) => {
  const agent = await agentService.updateAgent(req.params.id, req.body);
  res.status(200).json({
    data: agent,
  });
});

/**
 * Delete a delivery agent by ID.
 * Responds with 204 No Content and an empty response body.
 */
const deleteAgent = asyncHandler(async (req, res) => {
  await agentService.deleteAgent(req.params.id);
  res.status(204).send();
});

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
};
