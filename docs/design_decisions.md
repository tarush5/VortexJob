# VortexJob — Design Decisions & Trade-offs

This document outlines the major technical decisions, architectural patterns, and trade-offs made during the design and implementation of the VortexJob Distributed Job Scheduler.

---

## 🗄️ 1. Relational Database & Concurrency Model

### Dual-Database Compatibility (SQLite / PostgreSQL)
*   **Decision:** The system operates on SQLite by default (running out-of-the-box with zero configuration) but supports an adapter pattern to plug in PostgreSQL.
*   **Trade-off:** Writing raw SQL instead of using an ORM (like Prisma or Drizzle) was selected to maintain absolute control over transaction levels, concurrency locks, and database behavior.

### WAL Mode & Busy Timeout in SQLite
*   **Decision:** SQLite is configured to run in **Write-Ahead Logging (WAL)** mode with a `busy_timeout` set to 5000ms.
*   **Rationale:** Standard SQLite locks the entire database for writes. WAL mode allows concurrent readers to read while a writer is writing, dramatically improving concurrent throughput. The 5000ms busy timeout ensures concurrent write connections wait for locks to clear rather than throwing immediate `SQLITE_BUSY` exceptions.

---

## 🔒 2. Transaction-Safe Atomic Job Claiming

To prevent duplicate execution (multiple workers claiming the same job), we implement database-level atomic row claiming:

### SQLite Strategy (`BEGIN IMMEDIATE`)
*   SQLite does not support `SKIP LOCKED`. Instead, we use `BEGIN IMMEDIATE` transactions.
*   `BEGIN IMMEDIATE` reserves the write lock immediately. Any concurrent worker trying to start a claim transaction will block until the first worker completes. Once the lock is acquired, the worker queries the highest priority eligible job, updates its status to `claimed`, and commits the transaction.

### PostgreSQL Strategy (`SELECT FOR UPDATE SKIP LOCKED`)
*   In PostgreSQL, workers query:
    ```sql
    UPDATE jobs SET status = 'claimed' ...
    WHERE id = (
      SELECT id FROM jobs
      WHERE status = 'queued'
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    ```
*   `FOR UPDATE` locks the matching rows, and `SKIP LOCKED` skips already locked rows instead of blocking, allowing workers to fetch jobs in parallel with zero lock contention.

---

## 🕸️ 3. Workflow Dependencies (DAG)

*   **Requirement:** Allow jobs to depend on the successful completion of parent jobs.
*   **Design:** Modeled as a Directed Acyclic Graph (DAG) using a `job_dependencies` table joining `job_id` and `depends_on_job_id`.
*   **Claiming Logic:** A job is only eligible for claiming if it has no incomplete parent jobs. We resolve this directly inside the database query using a subquery check:
    ```sql
    SELECT id FROM jobs WHERE ...
      AND NOT EXISTS (
        SELECT 1 FROM job_dependencies jd
        JOIN jobs parent ON jd.depends_on_job_id = parent.id
        WHERE jd.job_id = jobs.id AND parent.status != 'completed'
      )
    ```
*   **Rationale:** Resolving dependencies in the database query avoids reading job trees into application memory and prevents race conditions where dependencies complete between the read and write phases.

---

## 🚦 4. Queue-Level Rate Limiting

*   **Requirement:** Limit the number of jobs processed in a queue over a time window.
*   **Design:** Added `rate_limit_count` and `rate_limit_window_seconds` columns to `queues`.
*   **Enforcement:** Before claiming a job, the system queries the `job_executions` table to count executions started in the last `window_seconds`. If the count meets or exceeds the limit, the worker skips claiming jobs from that queue.
*   **Trade-off:** Counting executions from the database adds a small read overhead but provides a distributed rate limit across all worker processes without requiring a centralized coordinator like Redis.

---

## 🩺 5. Worker Resiliency & Reaper Engine

*   **Heartbeat Loop:** Workers register themselves in the database and write CPU/memory utilization and active job count metrics to `worker_heartbeats` every 5 seconds.
*   **Reaper Cycle:** A background daemon runs every 10 seconds checking for workers whose last heartbeat is older than 30 seconds.
*   **Recovery:** If a worker is deemed dead, the Reaper automatically transitions the worker status to `inactive` and re-queues all jobs claimed by that worker, incrementing their retry counts. If a job has exhausted its max retries, it is moved to the Dead Letter Queue (DLQ).
*   **Graceful Shutdown:** Workers intercept `SIGTERM` and `SIGINT` signals. Upon interception, they stop polling for new jobs, finish executing active jobs (draining), and notify the server to de-register themselves cleanly.

---

## 🤖 6. AI-Generated Failure Summaries

*   **Design:** Failed jobs collect their runtime logs and send them to Google Gemini 1.5 Flash via native HTTP `fetch` to summarize the root cause and provide developer-focused troubleshooting tips.
*   **Fallback:** If `GEMINI_API_KEY` is not present, a local rules-based engine scans log strings for common keywords (e.g., connection timed out, out of memory, SQL lock, JSON parse error) and displays formatted advice, ensuring the UI remains robust.
