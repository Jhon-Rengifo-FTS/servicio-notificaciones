import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AppCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async set<T>(key: string, value: T, ttlMs?: number): Promise<T> {
    return this.cacheManager.set(key, value, ttlMs);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async del(key: string): Promise<boolean> {
    return this.cacheManager.del(key);
  }

  async remember<T>(
    key: string,
    factory: () => T | Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    return this.cacheManager.wrap<T>(key, factory, ttlMs);
  }
}
