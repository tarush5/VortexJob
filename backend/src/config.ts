import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  dbPath: process.env.DB_PATH || './data/dev.db',
  workerPollIntervalMs: 1000,
  heartbeatIntervalMs: 5000,
  reaperIntervalMs: 15000,
  cronSchedulerIntervalMs: 10000,
  heartbeatTimeoutMs: 30000,
  defaultConcurrency: 5,
  defaultMaxRetries: 3,
  defaultPageLimit: 20,
};
