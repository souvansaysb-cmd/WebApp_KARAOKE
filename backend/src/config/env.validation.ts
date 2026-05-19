import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvConfig {
  DATABASE_URL: string;
  REDIS_URL: string;
  YOUTUBE_API_KEY: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  NODE_ENV: string;
}

/**
 * Validates required environment variables at startup.
 * Fails fast if critical variables are missing.
 */
export function validateEnv(): EnvConfig {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'YOUTUBE_API_KEY',
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(
        `Missing required environment variables: ${missingVars.join(', ')}` +
        '\nApplication cannot start. Please check your .env file.',
      );
      process.exit(1);
    } else {
      logger.warn(
        `Missing environment variables: ${missingVars.join(', ')}` +
        '\nUsing fallback values for local development.',
      );
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/karaoke_db',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-insecure-secret-key',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}