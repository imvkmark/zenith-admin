import { drizzle } from 'drizzle-orm/postgres-js';
import type { Logger } from 'drizzle-orm/logger';
import postgres from 'postgres';
import { config } from '../config';
import logger from '../lib/logger';
import * as schema from './schema';

class DrizzleLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    logger.debug('SQL', { query, params });
  }
}

const client = postgres(config.databaseUrl);
export const db = drizzle(client, {
  schema,
  logger: config.log.level === 'debug' ? new DrizzleLogger() : false,
});
