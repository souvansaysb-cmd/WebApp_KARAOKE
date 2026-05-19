import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';
import { Logger, ValidationPipe } from '@nestjs/common';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment variables at startup
  validateEnv();

  // Fail fast in production if Firebase credentials are missing
  const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!firebaseServiceAccount && process.env.NODE_ENV === 'production') {
    logger.error('FIREBASE_SERVICE_ACCOUNT is not defined. Application cannot start in production mode.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    try {
      if (firebaseServiceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(firebaseServiceAccount)),
        });
      } else {
        logger.warn('Firebase Service Account not found. Initializing without credentials for local development.');
        admin.initializeApp();
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('Failed to initialize Firebase:', error);
        process.exit(1);
      }
      logger.warn('Failed to initialize Firebase with credentials. Running in limited mode.');
      admin.initializeApp();
    }
  }

  const app = await NestFactory.create(AppModule);

  // Global Validation Pipe — validates incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Strip properties that don't have decorators
      transform: true,        // Auto-transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error on unknown properties
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();