import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

/**
 * Winston logger configuration.
 *
 * Development: colorized, human-readable format
 * Production:  structured JSON format for log aggregation tools
 */
export const loggerConfig = (): WinstonModuleOptions => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const developmentFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, context }) => {
      const ctx = context ? `[${context}]` : '';
      return `${timestamp} ${level} ${ctx} ${message}`;
    }),
  );

  const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  return {
    transports: [
      new winston.transports.Console({
        format: isDevelopment ? developmentFormat : productionFormat,
        // In production, only log warnings and errors to console
        // Debug/info go to file transports
        level: isDevelopment ? 'debug' : 'warn',
      }),
      // File transport — production only
      ...(isDevelopment
        ? []
        : [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: productionFormat,
              maxsize: 10 * 1024 * 1024, // 10MB
              maxFiles: 5,
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: productionFormat,
              maxsize: 10 * 1024 * 1024,
              maxFiles: 10,
            }),
          ]),
    ],
  };
};