import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

type IterableCacheStore = {
  iterator?<T>(): AsyncGenerator<[string, T | undefined] | Array<string | T | undefined>, void>;
};

@Injectable()
export class AppCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async set<T>(key: string, value: T, ttlMs?: number): Promise<T> {
    return this.cacheManager.set(key, value, ttlMs);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async getByPrefix<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
    const cacheManager = this.cacheManager as Cache & { stores?: IterableCacheStore[] };
    const stores = cacheManager.stores ?? [];
    const values: Array<{ key: string; value: T }> = [];

    for (const store of stores) {
      if (!store.iterator) {
        continue;
      }

      for await (const entry of store.iterator<T>()) {
        const [key, value] = entry;

        if (typeof key === 'string' && key.startsWith(prefix) && value !== undefined) {
          values.push({ key, value: value as T });
        }
      }
    }

    return values;
  }

  async del(key: string): Promise<boolean> {
    return this.cacheManager.del(key);
  }

  async delByPrefix(prefix: string): Promise<number> {
    const registros = await this.getByPrefix(prefix);

    await Promise.all(registros.map(({ key }) => this.del(key)));

    return registros.length;
  }

  async remember<T>(
    key: string,
    factory: () => T | Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    return this.cacheManager.wrap<T>(key, factory, ttlMs);
  }
}
