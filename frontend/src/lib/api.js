/**
 * API client wrapper for the Delivery Agent Management System backend.
 * Handles network requests, error parsing, and extracts caching metadata (X-Cache header).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Custom error class capturing backend HTTP status, application error code, message, and field details.
 */
export class ApiRequestError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Core HTTP request handler with no-store caching and structured error handling.
 *
 * @param {string} path - Endpoint path (e.g., '/api/agents')
 * @param {RequestInit} [options={}] - Fetch configuration options
 * @returns {Promise<{ data: any, count?: number, cacheStatus?: string|null }>}
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  let response;

  try {
    response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (err) {
    // Catch fetch/network connection failures
    throw new ApiRequestError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Please verify that the backend is running on ' + BASE_URL
    );
  }

  // Extract X-Cache response header set by Redis cache-aside layer
  const cacheStatus =
    response.headers.get('X-Cache') ||
    response.headers.get('x-cache') ||
    null;

  // Handle 204 No Content
  if (response.status === 204) {
    return { data: null, cacheStatus };
  }

  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    // Non-JSON response body
  }

  if (!response.ok) {
    const errorPayload = body?.error || {};
    throw new ApiRequestError(
      response.status,
      errorPayload.code || 'UNKNOWN_ERROR',
      errorPayload.message || `Request failed with status ${response.status}`,
      errorPayload.details || []
    );
  }

  return {
    data: body?.data,
    count: body?.count,
    cacheStatus,
  };
}

/**
 * Fetch all delivery agents.
 * @returns {Promise<{ data: Array<object>, count: number, cacheStatus: string|null }>}
 */
export async function listAgents() {
  return request('/api/agents');
}

/**
 * Fetch a single delivery agent by UUID.
 * @param {string} id - Agent UUID
 * @returns {Promise<{ data: object, cacheStatus: string|null }>}
 */
export async function getAgent(id) {
  return request(`/api/agents/${id}`);
}

/**
 * Create a new delivery agent.
 * @param {object} body - Agent attributes
 * @returns {Promise<{ data: object }>}
 */
export async function createAgent(body) {
  return request('/api/agents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Partially update an existing agent.
 * @param {string} id - Agent UUID
 * @param {object} body - Changed attributes
 * @returns {Promise<{ data: object }>}
 */
export async function updateAgent(id, body) {
  return request(`/api/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Delete an agent by UUID.
 * @param {string} id - Agent UUID
 * @returns {Promise<void>}
 */
export async function deleteAgent(id) {
  await request(`/api/agents/${id}`, {
    method: 'DELETE',
  });
}
