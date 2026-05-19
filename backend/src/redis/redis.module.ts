import { Module, Global, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const logger = new Logger('RedisModule');
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        const client = new Redis(redisUrl, {
          lazyConnect: true,
          retryStrategy: (times: number) => {
            if (times > 2) {
              logger.warn('Redis unavailable (after 3 retries). Running without cache.');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          maxRetriesPerRequest: 1,
        });

        client.on('connect', () => logger.log('Connected to Redis'));
        client.on('error', (err: Error) => {
          if (err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
            // Silent fail for connection refused
          } else {
            logger.error(`Redis error: ${err.message}`);
          }
        });

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async onApplicationShutdown(signal?: string) {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.logger.log('Redis connection closed');
      } catch {
        // Ignore errors on shutdown
      }
    }
  }
}