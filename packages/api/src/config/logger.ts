import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  const metaStr = Object.keys(metadata).length > 0
    ? `\n${JSON.stringify(metadata, null, 2)}`
    : '';

  // Add stack trace if error
  const stackStr = stack ? `\n${stack}` : '';

  return msg + metaStr + stackStr;
});

// Custom format for production (JSON)
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    devFormat
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Add file transport in production
if (env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}

export { logger };
