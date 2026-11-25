import pino from 'pino';
import pretty from 'pino-pretty';

// pino's `transport` option runs in a worker thread, which Next.js's bundler cannot resolve;
// in development the pretty printer runs in-process instead.
export const logger =
  process.env.NODE_ENV === 'development'
    ? pino({ level: process.env.LOG_LEVEL || 'info' }, pretty({ sync: true, colorize: true, ignore: 'pid,hostname' }))
    : pino({ level: process.env.LOG_LEVEL || 'info' });
