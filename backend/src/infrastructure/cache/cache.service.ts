import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url')!;
    this.client = new Redis(redisUrl);

    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Retrieve a cached value. Returns null on cache miss or any error —
   * a cache failure should never break the request, just skip the cache.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logger.warn(`Cache GET failed for key "${key}"`, error);
      return null;
    }
  }

  /**
   * Store a value with a TTL (in seconds).
   * Silently fails if Redis is unavailable — caching is an optimization,
   * never a hard dependency for the request to succeed.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache SET failed for key "${key}"`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache DEL failed for key "${key}"`, error);
    }
  }

  /** Delete all keys matching a pattern, e.g. "search:*" — used for bulk invalidation. */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.warn(`Cache DEL by pattern failed for "${pattern}"`, error);
    }
  }
}