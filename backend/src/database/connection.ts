import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('Database');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const isMemory = config.dbPath === ':memory:';
    if (!isMemory) {
      const dbDir = path.dirname(path.resolve(config.dbPath));
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }
    db = new Database(isMemory ? ':memory:' : path.resolve(config.dbPath));
    if (!isMemory) {
      db.pragma('journal_mode = WAL');
    }
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    log.info(`Connected to SQLite at ${config.dbPath}`);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    log.info('Database connection closed');
  }
}

/** Reset connection — used by tests to get a fresh in-memory DB */
export function resetDb(newPath?: string): Database.Database {
  closeDb();
  if (newPath) {
    (config as any).dbPath = newPath;
  }
  return getDb();
}
