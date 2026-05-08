import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { CacheManagerAsyncConfig } from './config/cacheManager.config';
import { AppCacheService } from './cache.service';

@Global()
@Module({
  imports: [CacheModule.registerAsync(CacheManagerAsyncConfig)],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
