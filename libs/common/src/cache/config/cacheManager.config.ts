import { createKeyv } from '@keyv/redis';
import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

export const CacheManagerAsyncConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    const ttl = configService.get<string | number>('EMAIL_CACHE_TTL_MS') ??
      configService.get<string | number>('EMAIL_SENT_CACHE_TTL_MS');

    return {
      stores: [
        createKeyv(
          {
            url: `redis://${configService.get<string>('REDIS_HOST')}:${configService.get<string>('REDIS_PORT')}`,
            password: configService.get<string>('REDIS_PASSWORD'),
          },
          {
            throwOnErrors: true,
            throwOnConnectError: true,
          },
        ),
      ],
      ttl: ttl === undefined ? undefined : Number(ttl),
    };
  },
  inject: [ConfigService],
};
