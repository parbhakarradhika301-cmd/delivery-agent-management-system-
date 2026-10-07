/**
 * Express router definitions for /api/agents.
 * Maps endpoints to controllers with attached Zod validation middlewares.
 */
const express = require('express');
const agentController = require('../controllers/agent.controller');
const { validateBody, validateParams } = require('../middleware/validate');
const {
  createAgentSchema,
  updateAgentSchema,
  agentIdParamSchema,
} = require('../validators/agent.validator');

const router = express.Router();

router
  .route('/')
  .post(validateBody(createAgentSchema), agentController.createAgent)
  .get(agentController.getAgents);

router
  .route('/:id')
  .get(validateParams(agentIdParamSchema), agentController.getAgentById)
  .patch(
    validateParams(agentIdParamSchema),
    validateBody(updateAgentSchema),
    agentController.updateAgent
  )
  .delete(validateParams(agentIdParamSchema), agentController.deleteAgent);

module.exports = router;
