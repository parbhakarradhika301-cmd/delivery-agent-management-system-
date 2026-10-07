/**
 * Automated integration test suite for Delivery Agent Management System.
 * Tests CRUD operations, error handling, input validation, and Redis cache consistency
 * against live PostgreSQL (Neon) and Redis (Upstash) databases.
 *
 * All tests track created entity IDs and clean them up in afterAll without touching other data.
 */

const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { redis, isRedisReady } = require('../src/lib/redis');
const cache = require('../src/lib/cache');

// Track all IDs created during this test run for guaranteed cleanup
const createdAgentIds = new Set();

/**
 * Generates collision-free agent payloads for testing.
 */
const generateAgentPayload = (overrides = {}) => {
  const nonce = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
  return {
    fullName: `Test Agent ${nonce}`,
    phone: `9${randomDigits}`,
    email: `test+${nonce}@example.com`,
    serviceArea: 'Koramangala Zone',
    status: 'active',
    ...overrides,
  };
};

let isRedisAvailable = false;

beforeAll(async () => {
  // Wait up to 5 seconds for Redis to establish connection
  const startTime = Date.now();
  while (Date.now() - startTime < 5000) {
    if (isRedisReady()) {
      isRedisAvailable = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
});

afterAll(async () => {
  try {
    // 1. Delete all records created during the test run
    if (createdAgentIds.size > 0) {
      await prisma.agent.deleteMany({
        where: {
          id: { in: Array.from(createdAgentIds) },
        },
      });

      // 2. Clear test-specific keys from Redis
      for (const id of createdAgentIds) {
        await cache.del(cache.keys.agent(id));
      }
    }

    // 3. Invalidate list cache
    await cache.del(cache.keys.agentList());
  } catch (err) {
    console.warn('Error during test cleanup:', err.message);
  } finally {
    // 4. Close database and Redis connections cleanly
    await prisma.$disconnect();
    if (redis && redis.status !== 'end') {
      await redis.quit();
    }
  }
});

describe('Delivery Agent API - CRUD & Error Handling', () => {
  test('GET /health -> 200 with status "ok"', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('redis');
  });

  test('POST /api/agents valid -> 201, returns id (uuid), lowercase status "active", createdAt/updatedAt', async () => {
    const payload = generateAgentPayload();
    const res = await request(app)
      .post('/api/agents')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    const { data } = res.body;

    expect(data).toHaveProperty('id');
    expect(data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(data.fullName).toBe(payload.fullName);
    expect(data.phone).toBe(payload.phone);
    expect(data.email).toBe(payload.email.toLowerCase());
    expect(data.serviceArea).toBe(payload.serviceArea);
    expect(data.status).toBe('active');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');

    createdAgentIds.add(data.id);
  });

  test('POST /api/agents missing/invalid fields -> 400 VALIDATION_ERROR with per-field details', async () => {
    const res = await request(app)
      .post('/api/agents')
      .send({
        fullName: 'A', // too short (< 2)
        phone: 'invalid-phone',
        email: 'not-an-email',
        // missing serviceArea
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);

    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toContain('fullName');
    expect(fields).toContain('phone');
    expect(fields).toContain('email');
    expect(fields).toContain('serviceArea');
  });

  test('POST /api/agents unknown field -> 400 VALIDATION_ERROR', async () => {
    const payload = generateAgentPayload({ extraUnknownField: 'hacker-input' });
    const res = await request(app)
      .post('/api/agents')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/agents duplicate email -> 409 DUPLICATE_AGENT; duplicate phone -> 409 DUPLICATE_AGENT', async () => {
    // 1. Create a primary agent
    const initialPayload = generateAgentPayload();
    const createRes = await request(app)
      .post('/api/agents')
      .send(initialPayload);
    expect(createRes.status).toBe(201);
    createdAgentIds.add(createRes.body.data.id);

    // 2. Try creating with identical email
    const duplicateEmailPayload = generateAgentPayload({
      email: initialPayload.email,
    });
    const emailRes = await request(app)
      .post('/api/agents')
      .send(duplicateEmailPayload);

    expect(emailRes.status).toBe(409);
    expect(emailRes.body.error.code).toBe('DUPLICATE_AGENT');
    expect(emailRes.body.error.message.toLowerCase()).toContain('email');

    // 3. Try creating with identical phone
    const duplicatePhonePayload = generateAgentPayload({
      phone: initialPayload.phone,
    });
    const phoneRes = await request(app)
      .post('/api/agents')
      .send(duplicatePhonePayload);

    expect(phoneRes.status).toBe(409);
    expect(phoneRes.body.error.code).toBe('DUPLICATE_AGENT');
    expect(phoneRes.body.error.message.toLowerCase()).toContain('phone');
  });

  test('POST /api/agents malformed JSON -> 400 INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Content-Type', 'application/json')
      .send('{"fullName": "broken JSON, missing bracket');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('GET /api/agents -> 200, data is array, includes created agent, count matches length', async () => {
    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    expect(postRes.status).toBe(201);
    const agentId = postRes.body.data.id;
    createdAgentIds.add(agentId);

    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBe(res.body.data.length);

    const found = res.body.data.find((a) => a.id === agentId);
    expect(found).toBeDefined();
    expect(found.fullName).toBe(payload.fullName);
  });

  test('GET /api/agents/:id -> 200; invalid uuid -> 400 INVALID_ID; random valid uuid -> 404 AGENT_NOT_FOUND', async () => {
    // Valid agent
    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    expect(postRes.status).toBe(201);
    const agentId = postRes.body.data.id;
    createdAgentIds.add(agentId);

    const getRes = await request(app).get(`/api/agents/${agentId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(agentId);

    // Invalid UUID
    const invalidIdRes = await request(app).get('/api/agents/not-a-valid-uuid');
    expect(invalidIdRes.status).toBe(400);
    expect(invalidIdRes.body.error.code).toBe('INVALID_ID');

    // Non-existent UUID
    const nonExistentId = randomUUID();
    const notFoundRes = await request(app).get(`/api/agents/${nonExistentId}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe('AGENT_NOT_FOUND');
  });

  test('PATCH partial -> 200, field changed, updatedAt changed; empty body -> 400; non-existent id -> 404', async () => {
    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    expect(postRes.status).toBe(201);
    const agentId = postRes.body.data.id;
    const originalUpdatedAt = postRes.body.data.updatedAt;
    createdAgentIds.add(agentId);

    // Small delay to ensure timestamp change
    await new Promise((r) => setTimeout(r, 20));

    // Valid partial PATCH
    const patchRes = await request(app)
      .patch(`/api/agents/${agentId}`)
      .send({ serviceArea: 'Whitefield Tech Park' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.serviceArea).toBe('Whitefield Tech Park');
    expect(patchRes.body.data.updatedAt).not.toBe(originalUpdatedAt);

    // Empty body -> 400 VALIDATION_ERROR
    const emptyPatchRes = await request(app)
      .patch(`/api/agents/${agentId}`)
      .send({});
    expect(emptyPatchRes.status).toBe(400);
    expect(emptyPatchRes.body.error.code).toBe('VALIDATION_ERROR');

    // Non-existent UUID -> 404
    const nonExistentId = randomUUID();
    const nonExistentPatch = await request(app)
      .patch(`/api/agents/${nonExistentId}`)
      .send({ serviceArea: 'Anywhere' });
    expect(nonExistentPatch.status).toBe(404);
    expect(nonExistentPatch.body.error.code).toBe('AGENT_NOT_FOUND');
  });

  test('DELETE -> 204 with empty body; then GET -> 404; DELETE again -> 404', async () => {
    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    expect(postRes.status).toBe(201);
    const agentId = postRes.body.data.id;
    createdAgentIds.add(agentId);

    // First DELETE -> 204
    const deleteRes = await request(app).delete(`/api/agents/${agentId}`);
    expect(deleteRes.status).toBe(204);
    expect(deleteRes.text).toBe('');

    // Follow-up GET -> 404
    const getRes = await request(app).get(`/api/agents/${agentId}`);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('AGENT_NOT_FOUND');

    // Second DELETE -> 404
    const secondDeleteRes = await request(app).delete(`/api/agents/${agentId}`);
    expect(secondDeleteRes.status).toBe(404);
    expect(secondDeleteRes.body.error.code).toBe('AGENT_NOT_FOUND');
  });

  test('Unknown route -> 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/unsupported-endpoint-path');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('Redis Cache Consistency', () => {
  test('GET agent by id twice -> X-Cache MISS then HIT', async () => {
    if (!isRedisAvailable) {
      console.warn('Skipping test: Redis is not ready');
      return;
    }

    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    expect(postRes.status).toBe(201);
    const agentId = postRes.body.data.id;
    createdAgentIds.add(agentId);

    // 1st GET: Cache MISS
    const get1 = await request(app).get(`/api/agents/${agentId}`);
    expect(get1.status).toBe(200);
    expect(get1.headers['x-cache']).toBe('MISS');

    // 2nd GET: Cache HIT
    const get2 = await request(app).get(`/api/agents/${agentId}`);
    expect(get2.status).toBe(200);
    expect(get2.headers['x-cache']).toBe('HIT');
    expect(get2.body.data.id).toBe(agentId);
  });

  test('PATCH that agent -> next GET by id is MISS and shows the new value', async () => {
    if (!isRedisAvailable) {
      console.warn('Skipping test: Redis is not ready');
      return;
    }

    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    const agentId = postRes.body.data.id;
    createdAgentIds.add(agentId);

    // Prime the cache
    await request(app).get(`/api/agents/${agentId}`);

    // Update agent
    const patchRes = await request(app)
      .patch(`/api/agents/${agentId}`)
      .send({ serviceArea: 'HSR Layout Sector 2' });
    expect(patchRes.status).toBe(200);

    // Cache must have been invalidated: Next GET must be MISS with updated value
    const getAfterPatch = await request(app).get(`/api/agents/${agentId}`);
    expect(getAfterPatch.status).toBe(200);
    expect(getAfterPatch.headers['x-cache']).toBe('MISS');
    expect(getAfterPatch.body.data.serviceArea).toBe('HSR Layout Sector 2');
  });

  test('GET list twice -> second is HIT', async () => {
    if (!isRedisAvailable) {
      console.warn('Skipping test: Redis is not ready');
      return;
    }

    // Invalidate list first to ensure clean state
    await cache.del(cache.keys.agentList());

    // 1st GET: Cache MISS
    const list1 = await request(app).get('/api/agents');
    expect(list1.status).toBe(200);
    expect(list1.headers['x-cache']).toBe('MISS');

    // 2nd GET: Cache HIT
    const list2 = await request(app).get('/api/agents');
    expect(list2.status).toBe(200);
    expect(list2.headers['x-cache']).toBe('HIT');
  });

  test('POST new agent -> next GET list is MISS and contains the new agent', async () => {
    if (!isRedisAvailable) {
      console.warn('Skipping test: Redis is not ready');
      return;
    }

    // Prime the list cache
    await request(app).get('/api/agents');

    // POST a new agent
    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    expect(postRes.status).toBe(201);
    const agentId = postRes.body.data.id;
    createdAgentIds.add(agentId);

    // Invalidation check: Next list query must be MISS and contain newly created agent
    const listAfterPost = await request(app).get('/api/agents');
    expect(listAfterPost.status).toBe(200);
    expect(listAfterPost.headers['x-cache']).toBe('MISS');

    const found = listAfterPost.body.data.find((a) => a.id === agentId);
    expect(found).toBeDefined();
  });

  test('DELETE an agent -> next GET list is MISS and does not contain it; GET by id -> 404', async () => {
    if (!isRedisAvailable) {
      console.warn('Skipping test: Redis is not ready');
      return;
    }

    const payload = generateAgentPayload();
    const postRes = await request(app)
      .post('/api/agents')
      .send(payload);
    const agentId = postRes.body.data.id;
    createdAgentIds.add(agentId);

    // Prime both list and single agent cache
    await request(app).get('/api/agents');
    await request(app).get(`/api/agents/${agentId}`);

    // DELETE agent
    const deleteRes = await request(app).delete(`/api/agents/${agentId}`);
    expect(deleteRes.status).toBe(204);

    // Invalidation check: Next list query must be MISS and NOT contain deleted agent
    const listAfterDelete = await request(app).get('/api/agents');
    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.headers['x-cache']).toBe('MISS');
    const found = listAfterDelete.body.data.find((a) => a.id === agentId);
    expect(found).toBeUndefined();

    // GET by id must return 404
    const getDeleted = await request(app).get(`/api/agents/${agentId}`);
    expect(getDeleted.status).toBe(404);
  });
});
