import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow', 
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Choose the aspect of your log customizing the log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple()
    ),
  }),
  
  // File transports for production
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '14d', // Keep logs for 14 days
    maxSize: '20m',  // Max 20MB per file
  }),
  
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '20m',
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
  exitOnError: false, // Do not exit on handled exceptions
});

// Log unhandled promise rejections and exceptions
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' }),
);

logger.rejections.handle(
  new winston.transports.File({ filename: 'logs/rejections.log' }),
);

// Helper functions for different log levels
export const logError = (error: any, context?: string, userIdOrMeta?: number | Record<string, any>) => {
  if (error === null || error === undefined) {
    logger.error({
      message: 'Null or undefined error',
      context,
      ...(typeof userIdOrMeta === 'object' ? userIdOrMeta : { userId: userIdOrMeta }),
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  logger.error({
    message: error.message || error,
    stack: error.stack,
    context,
    ...(typeof userIdOrMeta === 'object' ? userIdOrMeta : { userId: userIdOrMeta }),
    timestamp: new Date().toISOString(),
    ...(typeof error === 'object' ? error : {})
  });
};

export const logWarning = (message: string, meta?: any) => {
  logger.warn({ message, ...meta, timestamp: new Date().toISOString() });
};

export const logInfo = (message: string, meta?: any) => {
  logger.info({ message, ...meta, timestamp: new Date().toISOString() });
};

export const logHttp = (method: string, url: string, status: number, duration: number, meta?: any) => {
  logger.http({
    method,
    url,
    status,
    duration,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug({ message, ...meta, timestamp: new Date().toISOString() });
};

// Export logger for direct use if needed
export default logger;