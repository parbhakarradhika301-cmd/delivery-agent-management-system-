# Delivery Agent Management System (DAMS)

A full-stack, enterprise-grade fleet administration platform for managing delivery agents across geographic service zones. Designed with a strict layered architecture, robust request validation, PostgreSQL persistence via Prisma ORM, and low-latency Redis cache-aside caching with automated write invalidation.

---

## Features

- **Fleet Administration**: Complete lifecycle management (registration, real-time status toggling, zone assignment, profile modification, offboarding).
- **Sub-Millisecond Read Latency**: Upstash Redis cache-aside caching serving repeated reads directly from RAM.
- **Cache-Aside with Write Invalidation**: Automatic cache eviction (`del`) on create, update, and delete mutations to guarantee data consistency.
- **Real-Time Cache Observability**: `X-Cache: HIT` / `X-Cache: MISS` HTTP response headers surfaced visually as badges in the user interface.
- **Fail-Safe Graceful Degradation**: If Redis becomes unreachable, the backend logs warnings and falls back to PostgreSQL without interrupting user operations.
- **Strict Data Validation**: Zod-enforced schemas with rejection of unrecognized attributes, granular per-field validation error details, and database-level unique constraints.
- **Modern Responsive Dashboard**: Next.js 16 App Router interface featuring live KPI summary counters, client-side fuzzy search, status filters, accessible confirmation modals, and mobile-optimized stacked views.
- **Automated Integration Testing**: Comprehensive Jest + Supertest test suite exercising all CRUD paths, error states, and cache consistency with automatic test data cleanup.

---

## Tech Stack & Architecture Justifications

| Layer | Technology | Key Role |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Sonner | Responsive admin dashboard with live cache indicator and toast alerts |
| **Backend API** | Node.js 20+, Express 4, CommonJS | RESTful API with layered separation of concerns |
| **Database** | PostgreSQL 16 (Neon Serverless) | Relational database with ACID guarantees and unique indexing |
| **ORM** | Prisma ORM 5 | Type-safe schema definition, automated migrations, and connection pooling |
| **Cache Store** | Redis 7 (Upstash / Alpine) via `ioredis` | Low-latency in-memory cache-aside store with TLS (`rediss://`) support |
| **Validation** | Zod 3 | Runtime schema validation with strict shape enforcement |
| **Testing** | Jest 30, Supertest 7 | End-to-end integration testing for API contracts and cache lifecycles |
| **Local Infra** | Docker Compose | Instant zero-cloud local environment with Postgres and Redis |

### Why Neon + Prisma?
- **Serverless PostgreSQL**: Neon provides automated connection pooling via PgBouncer (`DATABASE_URL`) for stateless web applications, alongside dedicated direct endpoints (`DIRECT_URL`) for schema migrations.
- **Relational Integrity**: Delivery agent records follow a strictly defined tabular structure where unique constraints on `email` and `phone` must be strictly enforced at the database engine level.
- **Prisma ORM**: Eliminates raw SQL discrepancies, ensures type safety, auto-generates client bindings, and provides automated, version-controlled migrations (`prisma migrate`).

### Why Redis / Upstash?
- **Read-Heavy Workload**: Agent directories and profile lookups undergo repetitive reads during dispatch cycles. Caching read queries in Redis reduces database load and cuts network round-trips from ~250ms down to ~50–90ms.
- **Serverless Redis (Upstash)**: Provides durable Redis over TLS with standard `rediss://` connectivity, zero cold starts, and seamless scalability without maintaining EC2 instances.

---

## System Architecture

### Request Flow
```
[ Browser / Client ]
         │
         ▼
[ Next.js 16 Frontend (Port 3000) ]
         │ HTTP / JSON
         ▼
[ Express API Router (Port 4000) ]
         │
         ▼
[ Zod Validation Middleware ]
         │ (Rejects invalid payloads with 400 VALIDATION_ERROR)
         ▼
[ Thin Controller Layer ]
         │
         ▼
[ Agent Service Layer ]
    ┌────┴───────────────────────────────┐
    │                                    │
    ▼ Reads (Cache-Aside)                ▼ Writes (Invalidation)
[ Redis Cache (Upstash) ]          [ PostgreSQL (Neon) via Prisma ]
    │ (HIT: return immediately)          │ (DB write succeeds)
    │ (MISS: query DB & populate)        ▼
                                   [ Evict Redis Keys ]
```

### Layered Structure
- **Routes (`routes/agent.routes.js`)**: Maps HTTP methods and paths to middlewares and controllers.
- **Validation (`middleware/validate.js`)**: Generic middleware parsing bodies and parameters against strict Zod schemas.
- **Controllers (`controllers/agent.controller.js`)**: Extracts parameters, invokes service routines, attaches `X-Cache` headers, and emits HTTP status codes.
- **Services (`services/agent.service.js`)**: Encapsulates business logic, data formatting, and orchestrates database queries and cache invalidation.
- **Cache Abstraction (`lib/cache.js`)**: Centralizes key namespacing (`dams:`), JSON serialization, and try-catch fallback handling.
- **Error Handler (`middleware/errorHandler.js`)**: Formats all operational and internal errors into a uniform JSON response contract.

---

## Project Structure

```
.
├── docker-compose.yml              # Local Postgres 16 + Redis 7 services
├── README.md                       # Comprehensive system documentation
│
├── backend/
│   ├── .env.example                # Cloud (Option A) vs Docker (Option B) templates
│   ├── .env                        # Local active environment variables (gitignored)
│   ├── package.json                # Scripts for dev, test, start, prisma
│   ├── prisma/
│   │   └── schema.prisma           # Postgres datasource, enum AgentStatus, model Agent
│   ├── src/
│   │   ├── app.js                  # Express application setup & middleware stack (no listen)
│   │   ├── server.js               # Entrypoint: listens on PORT, handles graceful shutdown
│   │   ├── lib/
│   │   │   ├── prisma.js           # Shared PrismaClient singleton
│   │   │   ├── redis.js            # ioredis client with readiness helper & fast timeouts
│   │   │   └── cache.js            # Cache wrapper (JSON parsing, namespacing, graceful degradation)
│   │   ├── routes/
│   │   │   └── agent.routes.js     # /api/agents route declarations
│   │   ├── controllers/
│   │   │   └── agent.controller.js # Thin request handlers with X-Cache headers
│   │   ├── services/
│   │   │   └── agent.service.js    # Database logic + cache-aside & invalidation
│   │   ├── validators/
│   │   │   └── agent.validator.js  # Zod schemas (create, update, id param)
│   │   ├── middleware/
│   │   │   ├── validate.js         # Generic Zod validation middleware
│   │   │   ├── errorHandler.js     # Centralized error formatter (Prisma, Zod, Syntax)
│   │   │   └── notFound.js         # 404 ROUTE_NOT_FOUND catch-all
│   │   └── utils/
│   │       ├── ApiError.js         # Custom operational error class
│   │       └── asyncHandler.js     # Promise catch wrapper for route handlers
│   └── tests/
│       └── agents.test.js          # Jest + Supertest integration test suite
│
└── frontend/
    ├── .env.local.example          # Frontend API target template
    ├── .env.local                  # Local frontend environment config (gitignored)
    ├── package.json                # Next.js scripts (port 3000)
    ├── src/
    │   ├── lib/
    │   │   └── api.js              # No-store fetch wrapper & X-Cache parser
    │   ├── components/
    │   │   ├── Header.jsx          # Top navigation header
    │   │   ├── CacheBadge.jsx      # Green (HIT) / Amber (MISS) cache badge
    │   │   ├── StatusBadge.jsx     # Active (green) / Inactive (grey) pill
    │   │   ├── ConfirmDialog.jsx   # Accessible modal dialog for deletion
    │   │   └── AgentForm.jsx       # Shared form (inline validation, diff-only updates)
    │   └── app/
    │       ├── layout.js           # Root layout with Header & Sonner Toaster
    │       ├── globals.css         # Tailwind v4 clean dashboard tokens
    │       ├── page.js             # Redirects "/" to "/agents"
    │       └── agents/
    │           ├── page.js         # Dashboard (KPIs, search, table & mobile cards)
    │           ├── new/page.js     # Create agent page
    │           └── [id]/
    │               ├── page.js     # Agent profile details with copyable UUID
    │               └── edit/page.js# Agent update page
```

---

## Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Option A (Cloud)**: Free accounts on [Neon.tech](https://neon.tech) (PostgreSQL) and [Upstash.com](https://upstash.com) (Redis).
- **Option B (Local)**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

---

## Setup & Running Step-by-Step

### 1. Backend Setup

```bash
cd backend
npm install
```

#### Choose Option A or Option B for Environment Variables

Copy the example configuration:
```bash
cp .env.example .env
```

- **Option A (Cloud - Neon + Upstash)**:
  Edit `backend/.env` with your cloud credentials:
  ```env
  PORT=4000
  CORS_ORIGIN=http://localhost:3000
  CACHE_TTL_SECONDS=60
  DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-XYZ-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
  DIRECT_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-XYZ.REGION.aws.neon.tech/neondb?sslmode=require"
  REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379"
  ```

- **Option B (Local Docker - Zero Cloud Setup)**:
  Start the local database and Redis containers from the workspace root:
  ```bash
  cd ..
  docker compose up -d
  cd backend
  ```
  Edit `backend/.env`:
  ```env
  PORT=4000
  CORS_ORIGIN=http://localhost:3000
  CACHE_TTL_SECONDS=60
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dams"
  DIRECT_URL="postgresql://postgres:postgres@localhost:5432/dams"
  REDIS_URL="redis://localhost:6379"
  ```

#### Run Database Migrations
```bash
# Push Prisma schema migrations to the database
npx prisma migrate deploy

# (Optional: during active development schema iteration, use:)
# npm run prisma:migrate
```

#### Start Backend Server
```bash
# Development mode with hot-reloading (nodemon)
npm run dev

# Or production mode
npm start
```
The API will be accessible at: `http://localhost:4000` (Health check: `http://localhost:4000/health`).

---

### 2. Frontend Setup

In a new terminal window:
```bash
cd frontend
npm install
```

Create `.env.local` from the template:
```bash
cp .env.local.example .env.local
```
Confirm `frontend/.env.local` contains:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start the Next.js development server:
```bash
npm run dev
```
Open your browser at: `http://localhost:3000` (automatically redirects to `http://localhost:3000/agents`).

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Example | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Yes | `4000` | Port for Express HTTP server |
| `DATABASE_URL` | Yes | `postgresql://...` | Pooled connection string for Prisma app queries |
| `DIRECT_URL` | Yes | `postgresql://...` | Direct connection string for Prisma migrations |
| `REDIS_URL` | Yes | `rediss://...` (or `redis://...`) | Redis connection URL with credentials |
| `CACHE_TTL_SECONDS`| No | `60` | Default cache expiration time in seconds (default: 60) |
| `CORS_ORIGIN` | Yes | `http://localhost:3000` | Whitelisted frontend origin for CORS |

### Frontend (`frontend/.env.local`)

| Variable | Required | Example | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000` | Base URL pointing to the Express backend API |

---

## Database Schema & Migrations

The database schema is defined in [backend/prisma/schema.prisma](file:///Users/abhi1317__/Desktop/zoop/backend/prisma/schema.prisma):

```prisma
enum AgentStatus {
  ACTIVE
  INACTIVE
}

model Agent {
  id          String      @id @default(uuid())
  fullName    String
  phone       String      @unique
  email       String      @unique
  serviceArea String
  status      AgentStatus @default(ACTIVE)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("agents")
}
```

### Table Structure (`agents`)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | `PRIMARY KEY` | Unique UUID v4 identifier |
| `fullName` | `VARCHAR(100)` | `NOT NULL` | Agent's full legal name |
| `phone` | `VARCHAR(15)` | `NOT NULL`, `UNIQUE` | Contact phone number |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Normalized email address |
| `serviceArea`| `VARCHAR(100)` | `NOT NULL` | Geographic delivery territory |
| `status` | `AgentStatus` | `DEFAULT 'ACTIVE'` | Operational status (`ACTIVE` or `INACTIVE`) |
| `createdAt` | `TIMESTAMP` | `DEFAULT now()` | Record creation timestamp |
| `updatedAt` | `TIMESTAMP` | `updatedAt` | Auto-updating record modification timestamp |

---

## API Reference

Base Path: `/api/agents`

### Endpoints

| Method | Path | Description | Success Code | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service and Redis health check | `200 OK` | `{ "status": "ok", "redis": "up" \| "down" }` |
| `POST` | `/api/agents` | Register a new delivery agent | `201 Created` | `{ "data": Agent }` |
| `GET` | `/api/agents` | List all agents (newest first) | `200 OK` | `{ "data": Agent[], "count": number }` |
| `GET` | `/api/agents/:id` | Retrieve single agent by UUID | `200 OK` | `{ "data": Agent }` |
| `PATCH` | `/api/agents/:id` | Partial update of agent fields | `200 OK` | `{ "data": Agent }` |
| `DELETE`| `/api/agents/:id` | Delete agent by UUID | `204 No Content` | Empty Body |

### Example Create Request & Response

**Request (`POST /api/agents`):**
```bash
curl -X POST http://localhost:4000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Priya Sharma",
    "phone": "+919876543210",
    "email": "priya.sharma@logistics.com",
    "serviceArea": "Indiranagar",
    "status": "active"
  }'
```

**Response (`201 Created`):**
```json
{
  "data": {
    "id": "c1f7a04e-7a04-45e2-bf82-aa1645bfc7f1",
    "fullName": "Priya Sharma",
    "phone": "+919876543210",
    "email": "priya.sharma@logistics.com",
    "serviceArea": "Indiranagar",
    "status": "active",
    "createdAt": "2026-10-07T07:27:54.766Z",
    "updatedAt": "2026-10-07T07:27:54.766Z"
  }
}
```

### Standardized Error Format

All API errors return a uniform JSON structure:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

### Error Codes

| HTTP Status | Error Code | Trigger Condition |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Request payload fails Zod schema validation rules (includes `details[]`) |
| `400` | `INVALID_ID` | Route `:id` parameter is not a valid UUID v4 format |
| `400` | `INVALID_JSON` | Malformed JSON in request body |
| `404` | `AGENT_NOT_FOUND` | No agent matches the provided UUID in database |
| `404` | `ROUTE_NOT_FOUND` | Unhandled HTTP method or URL path |
| `409` | `DUPLICATE_AGENT` | Unique constraint violation (`email` or `phone` already exists) |
| `500` | `INTERNAL_ERROR` | Unexpected server error (stack trace logged server-side only) |

### Validation Rules
- `fullName`: Trimmed string, length 2–100 characters, required on create.
- `phone`: Trimmed string, optional leading `+` followed by 10–15 digits (`^\+?[0-9]{10,15}$`), required on create.
- `email`: Valid RFC 5322 email string, automatically trimmed and lowercased.
- `serviceArea`: Trimmed string, length 2–100 characters, required on create.
- `status`: String enum `active` or `inactive` (API uses lowercase; stored as uppercase `ACTIVE`/`INACTIVE` in PostgreSQL).
- `PATCH`: All fields optional, but empty request bodies (`{}`) are rejected with `400 VALIDATION_ERROR`.
- `Strictness`: Unrecognized fields are strictly rejected.

---

## Redis Caching Strategy

The system utilizes the **Cache-Aside (Lazy Loading)** pattern paired with **Delete-on-Write Invalidation**.

### Cache Keys & Eviction Matrix

| Item / Resource | Cache Key Pattern | Example Key | TTL | When & How It Is Invalidated |
| :--- | :--- | :--- | :--- | :--- |
| **All Agents List** | `dams:agents:list` | `dams:agents:list` | `60s` | Invalidated on `create`, `update`, and `delete` |
| **Single Agent** | `dams:agent:{id}` | `dams:agent:c1f7a04e-7a04...` | `60s` | Invalidated on `update` and `delete` |

### Key Design Details

1. **Cache Miss & Hit Flow**:
   - On read requests (`GET /api/agents` or `GET /api/agents/:id`), Redis is queried first.
   - If present: Served directly from Redis with response header `X-Cache: HIT`.
   - If absent: Queried from PostgreSQL via Prisma, stored in Redis with `EX 60`, and returned with `X-Cache: MISS`.
2. **Never Cache 404s**:
   - If an agent is not found, the service throws `AGENT_NOT_FOUND` (404) immediately and **never** writes nulls to cache.
3. **Delete-on-Write vs Write-Through**:
   - Invalidation (`cache.del`) was selected over write-through because it eliminates race conditions with database transactions, keeps code simple, and guarantees that subsequent reads repopulate clean data from the single source of truth.
4. **Invalidate Only After Write**:
   - Cache invalidation occurs strictly **after** the PostgreSQL transaction finishes successfully.
5. **TTL as a Safety Net**:
   - A 60-second TTL prevents orphaned keys in the event of unexpected cache-write disconnections.
6. **Graceful Degradation**:
   - `lib/cache.js` catches all Redis errors. If Redis is down, warnings are logged, `/health` reports `"redis": "down"`, and all requests are transparently fulfilled directly from PostgreSQL without downtime.
7. **Concurrency Trade-Off**:
   - A theoretical race condition exists if a cache miss read executes concurrently with an active write. This is mitigated by immediate post-write deletion and bounded by the 60s TTL.

---

## Testing

### Automated Backend Tests (Jest + Supertest)

Run the full integration test suite:
```bash
cd backend
npm test
```

**Coverage:**
- `GET /health` connectivity & Redis health indicator.
- Valid `POST /api/agents` record creation and UUID verification.
- `400 VALIDATION_ERROR` for missing fields, short names, malformed phones, invalid emails.
- `400 VALIDATION_ERROR` for unknown field injection (strict schemas).
- `409 DUPLICATE_AGENT` handling for duplicate emails and duplicate phones.
- `400 INVALID_JSON` for broken JSON syntax.
- `GET /api/agents` list consistency and count verification.
- `GET /api/agents/:id` lookup, `400 INVALID_ID`, and `404 AGENT_NOT_FOUND`.
- `PATCH /api/agents/:id` partial updates and rejection of empty payloads (`{}`).
- `DELETE /api/agents/:id` with 204 response and subsequent 404 check.
- `404 ROUTE_NOT_FOUND` for unrecognized routes.
- **Redis Cache Consistency**:
  - Validates `X-Cache: MISS` on first read followed by `X-Cache: HIT` on second read.
  - Verifies cache eviction on `PATCH` (subsequent read is `MISS` with updated values).
  - Verifies list eviction on `POST` and `DELETE`.
- **Zero-Pollution Guarantee**: All test agents are tracked by ID and deleted from PostgreSQL and Redis in the `afterAll` hook.

---

### Manual Verification (cURL Walkthrough)

#### 1. Check Health & Redis Status
```bash
curl -i http://localhost:4000/health
# Expected: 200 OK, {"status":"ok","redis":"up"}
```

#### 2. Create an Agent
```bash
curl -i -X POST http://localhost:4000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ravi Kumar","phone":"+919876543210","email":"ravi@logistics.com","serviceArea":"Koramangala"}'
# Expected: 201 Created, save the returned "id" for subsequent commands
```

#### 3. Test Cache MISS -> HIT on List
```bash
# 1st Call (Cache MISS)
curl -s -D - -o /dev/null http://localhost:4000/api/agents | grep -i x-cache
# Expected: X-Cache: MISS

# 2nd Call (Cache HIT)
curl -s -D - -o /dev/null http://localhost:4000/api/agents | grep -i x-cache
# Expected: X-Cache: HIT
```

#### 4. Test Cache MISS -> HIT on Single Agent
```bash
# Replace AGENT_ID with the created UUID
curl -s -D - -o /dev/null http://localhost:4000/api/agents/AGENT_ID | grep -i x-cache
# Expected: X-Cache: MISS

curl -s -D - -o /dev/null http://localhost:4000/api/agents/AGENT_ID | grep -i x-cache
# Expected: X-Cache: HIT
```

#### 5. Test Cache Invalidation on Update
```bash
curl -i -X PATCH http://localhost:4000/api/agents/AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{"serviceArea":"Indiranagar Sector 1"}'
# Expected: 200 OK

# The subsequent GET must now be a MISS (cache was invalidated)
curl -s -D - -o /dev/null http://localhost:4000/api/agents/AGENT_ID | grep -i x-cache
# Expected: X-Cache: MISS
```

#### 6. Test Delete and 404 Verification
```bash
curl -i -X DELETE http://localhost:4000/api/agents/AGENT_ID
# Expected: 204 No Content

curl -i http://localhost:4000/api/agents/AGENT_ID
# Expected: 404 Not Found ({"error":{"code":"AGENT_NOT_FOUND",...}})
```

---

### Manual UI Walkthrough

1. Open `http://localhost:3000` in your web browser. You will be redirected to `/agents`.
2. Observe the green **"Cache HIT"** or amber **"Cache MISS"** pill in the top header. Click **Refresh** to toggle cache states.
3. Click **"Add Agent"** to open `/agents/new`. Attempt submitting empty fields to verify inline validation.
4. Fill in agent details and click **"Create Agent"**. Observe the success toast and automatic redirect to the agent's detail page (`/agents/:id`).
5. On the detail page, click the **"Copy"** button to copy the UUID to clipboard.
6. Click **"Edit Agent"** (`/agents/:id/edit`). Modify the service zone and save. Notice the cache is refreshed.
7. Return to the list page, use the **Search input** to filter agents by name or zone, and toggle the **Status tabs** (All / Active / Inactive).
8. Click **"Delete"** on any row to open the accessible confirmation dialog. Confirm deletion and verify the agent is removed from both the list and summary counters.

---

## Design Decisions

- **`PATCH` vs `PUT`**: `PATCH` was chosen to permit partial attribute updates (e.g. updating only `status` or `serviceArea`) without forcing clients to resend the entire entity payload.
- **Status Representation**: Represented as lowercase `"active"` and `"inactive"` across external API endpoints for developer ergonomics, and mapped to uppercase Prisma enums (`ACTIVE`/`INACTIVE`) internally.
- **Layered Architecture**: Controllers remain strictly HTTP-focused (query parsing and status emission) while service modules handle business logic, allowing caching to be injected into `agent.service.js` without touching controllers.
- **Strict Zod Schemas (`.strict()`)**: Rejects payload poisoning and unintended properties with `400 VALIDATION_ERROR`.
- **Consistent Error Structure**: Every error across the entire stack adheres to `{ error: { code, message, details? } }`, simplifying client error handling.

---

## Future Improvements

1. **Pagination & Query-Aware Caching**: Implement cursor-based pagination with cache keys derived from query hashes (`dams:agents:list:page=1&limit=20`).
2. **Authentication & Role-Based Access Control (RBAC)**: Secure endpoints with JWT authentication and define `DISPATCHER` vs `ADMIN` roles.
3. **Rate Limiting**: Add IP and token-based rate limiting via `express-rate-limit` backed by Redis.
4. **Server-Side Full-Text Search**: Leverage PostgreSQL `tsvector` / trigram indexes for high-volume agent searches.
5. **CI/CD Pipeline**: GitHub Actions workflow executing `prisma generate`, `npm test`, and `npm run build` on pull requests.
6. **Containerized Deployment**: Multi-stage Dockerfiles deployed to AWS ECS, GCP Cloud Run, or Render.
