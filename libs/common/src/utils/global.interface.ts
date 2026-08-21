export interface RmqModuleOptions {
  name: string;
  prefetchCount: number;
}

export type ExponentialRetryPolicy = {
  maxRetries: number; // ej: 3
  baseDelayMs: number; // ej: 3000 (3s)
  maxDelayMs?: number; // opcional: tope, ej: 60000
  jitterRatio?: number; // opcional: 0.2 => +/-20%
  delayedExchange: string; // 'jasper.delayed.exchange'
  routingKey: string; // 'jasper_trigger'
  retryHeader?: string; // default: 'x-retry-count'
};

export interface RetryResult {
  action: 'acked_stop' | 'republished';
  retry: number;
  delayMs?: number;
}

export interface EmailInterface {
  to: string;
  subject: string;
  template: string;
  attachments?: any[];
  context: Record<any, any>;
  correos: string[];
}
export interface PushInterface {
  token?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}
export interface TelegramInterface {
  chatId: string;
  message: string;
  jobId: string;
}

export type PushSocketPayload = {
  cacheKey?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  status?: string;
  read?: boolean;
  jobId?: string;
  sentAt?: string;
};

export type JoinRoomPayload = {
  room?: string;
  cuentaId?: string | number;
  usuarioId?: string | number;
};