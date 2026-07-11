# VortexJob — API Documentation

The VortexJob Scheduler exposes clean REST APIs for managing projects, queues, jobs, and worker pools, alongside a WebSocket server for live status streams.

---

## 🔐 Authentication

All routes except `/api/auth/register`, `/api/auth/login`, and `/api/health` require a valid JWT passed in the `Authorization` header:
`Authorization: Bearer <token>`

### Register User
*   **Endpoint:** `POST /api/auth/register`
*   **Payload:**
    ```json
    {
      "email": "dev@vortexjob.dev",
      "password": "securepassword",
      "full_name": "Dev Engineer"
    }
    ```
*   **Response (201):**
    ```json
    {
      "success": true,
      "data": { "token": "eyJhbGciOiJIUzI1NiIs..." }
    }
    ```

### Login User
*   **Endpoint:** `POST /api/auth/login`
*   **Payload:**
    ```json
    {
      "email": "dev@vortexjob.dev",
      "password": "securepassword"
    }
    ```
*   **Response (200):** Same as register.

### Get Current User
*   **Endpoint:** `GET /api/auth/me`
*   **Response (200):** User profile details.

---

## 📁 Organizations & Projects

### Create Organization
*   **Endpoint:** `POST /api/organizations`
*   **Payload:** `{ "name": "VortexJob Core" }`

### List Organizations
*   **Endpoint:** `GET /api/organizations`

### Create Project
*   **Endpoint:** `POST /api/projects`
*   **Payload:** `{ "organization_id": "<uuid>", "name": "API Service" }`

---

## 🚦 Queues

### Create Queue
*   **Endpoint:** `POST /api/projects/:projectId/queues`
*   **Payload:**
    ```json
    {
      "name": "email-delivery",
      "description": "Outbound system emails",
      "priority": 10,
      "concurrency_limit": 5,
      "rate_limit_count": 50,
      "rate_limit_window_seconds": 60
    }
    ```

### Update Queue
*   **Endpoint:** `PUT /api/queues/:id`
*   **Payload:** Allows partial updates of queue priority, limits, and rate limits.

### Pause / Resume Queue
*   **Endpoints:**
    *   `POST /api/queues/:id/pause`
    *   `POST /api/queues/:id/resume`

### Get Queue Stats
*   **Endpoint:** `GET /api/queues/:id/stats`

---

## 📋 Jobs

### Create Job
*   **Endpoint:** `POST /api/queues/:queueId/jobs`
*   **Payload (Immediate):**
    ```json
    {
      "name": "send-welcome-email",
      "payload": { "userId": 123 },
      "type": "immediate"
    }
    ```
*   **Payload (Delayed):**
    ```json
    {
      "name": "send-followup-email",
      "payload": { "userId": 123 },
      "type": "delayed",
      "run_at": "2026-07-15T12:00:00.000Z"
    }
    ```
*   **Payload (Cron/Recurring):**
    ```json
    {
      "name": "nightly-cleanup",
      "type": "cron",
      "cron_expression": "0 0 * * *"
    }
    ```
*   **Payload (DAG Workflow Dependency):**
    ```json
    {
      "name": "process-report",
      "type": "immediate",
      "depends_on": ["parent-job-uuid-1", "parent-job-uuid-2"]
    }
    ```

### List Jobs (Paginated + Filterable)
*   **Endpoint:** `GET /api/queues/:queueId/jobs`
*   **Query Params:** `status` (queued/running/completed/failed), `search` (name/ID match), `page`, `limit`

### Job Control
*   `POST /api/jobs/:id/retry` (Retry failed/dead job)
*   `POST /api/jobs/:id/cancel` (Cancel active or scheduled job)
*   `GET /api/jobs/:id/ai-summary` (Request Gemini failure diagnostic analysis)

---

## 📡 WebSockets (Live Metrics)

*   **Endpoint:** `ws://localhost:3000/ws`
*   **Message Format (Received):**
    ```json
    {
      "type": "stats:update",
      "data": {
        "activeWorkers": 3,
        "runningJobs": 2,
        "queuedJobs": 5,
        "timestamp": "2026-07-10T12:00:00.000Z"
      }
    }
    ```
