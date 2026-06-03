import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const logger = new Logger('Globalfunctions');

export async function registrarEnvioEnCache(
  cacheService: any,
  data: any,
  key: string,
  ttlMs?: number,
): Promise<string> {
  try {
    const to = data?.to || data?.data?.cuentaId || 'unknown';
    const cacheKey = buildSentCacheKey(key, to);
    await cacheService.set(cacheKey, data, ttlMs);
    logger.log(`El evento ${cacheKey} se ha registrado exitosamente en Redis`);
    return cacheKey;
  } catch (error) {
    logger.warn('Error al intentar guardar en Redis.');
    logger.error(error);
    throw error;
  }
}

export function buildSentCacheKey(key: string, to: string): string {
  return `notificaciones:${key}:${to}:${Date.now()}`;
}

export function getTTLConfig(
  configService: ConfigService,
  key: string,
): number | undefined {
  const value = configService.get<string | number>(key);
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    logger.warn(`La variable ${key} debe ser un número en milisegundos.`);
    return undefined;
  }

  return parsedValue;
}
