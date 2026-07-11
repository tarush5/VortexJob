import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { runMigrations } from './database/migrations';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { setupWebSocket, broadcast } from './services/websocket.service';
import { schedulerService } from './services/scheduler.service';
import { reaperService } from './services/reaper.service';
import { createLogger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import organizationsRoutes from './routes/organizations.routes';
import projectsRoutes from './routes/projects.routes';
import queuesRoutes from './routes/queues.routes';
import jobsRoutes from './routes/jobs.routes';
import workersRoutes from './routes/workers.routes';
import dlqRoutes from './routes/dlq.routes';
import statsRoutes from './routes/stats.routes';

const log = createLogger('Server');

// Initialize database
runMigrations();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  log.debug(`${req.method} ${req.path}`);
  next();
});

// Public routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'healthy', uptime: process.uptime() } });
});

// Protected routes
app.use('/api/organizations', authMiddleware, organizationsRoutes);
app.use('/api/projects', authMiddleware, projectsRoutes);
app.use('/api', authMiddleware, queuesRoutes);
app.use('/api', authMiddleware, jobsRoutes);
app.use('/api/workers', authMiddleware, workersRoutes);
app.use('/api', authMiddleware, dlqRoutes);
app.use('/api', authMiddleware, statsRoutes);

// Serve frontend static assets in production if they exist
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Fallback to index.html for single-page app behavior
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  log.info(`Serving frontend static files from ${frontendDist}`);
} else {
  log.warn(`Frontend build directory not found at ${frontendDist}. Running in API-only mode.`);
}

// Error handler
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
setupWebSocket(server);

// Background: Scheduler service (promote scheduled jobs + process cron)
const schedulerInterval = setInterval(() => {
  try {
    schedulerService.promoteScheduledJobs();
    schedulerService.processCronJobs();
  } catch (err: any) {
    log.error(`Scheduler error: ${err.message}`);
  }
}, config.cronSchedulerIntervalMs);

// Background: Reaper service (detect dead workers)
const reaperInterval = setInterval(() => {
  try {
    const result = reaperService.reap();
    if (result.staleWorkers > 0) {
      broadcast('reaper:cycle', result);
    }
  } catch (err: any) {
    log.error(`Reaper error: ${err.message}`);
  }
}, config.reaperIntervalMs);

// Periodic stats broadcast
const statsBroadcastInterval = setInterval(() => {
  try {
    const { getDb } = require('./database/connection');
    const db = getDb();
    const activeWorkers = (db.prepare(`SELECT COUNT(*) as count FROM workers WHERE status = 'active'`).get() as any).count;
    const runningJobs = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status IN ('claimed', 'running')`).get() as any).count;
    const queuedJobs = (db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'queued'`).get() as any).count;
    broadcast('stats:update', { activeWorkers, runningJobs, queuedJobs, timestamp: new Date().toISOString() });
  } catch {
    // Silently ignore broadcast errors
  }
}, 5000);

// Start server
server.listen(config.port, () => {
  log.info(`🚀 VortexJob - Distributed Job Scheduler API running on http://localhost:${config.port}`);
  log.info(`📡 WebSocket available at ws://localhost:${config.port}/ws`);
});

// Graceful shutdown
function shutdown() {
  log.info('Shutting down gracefully...');
  clearInterval(schedulerInterval);
  clearInterval(reaperInterval);
  clearInterval(statsBroadcastInterval);
  server.close(() => {
    const { closeDb } = require('./database/connection');
    closeDb();
    log.info('Server shut down complete');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
