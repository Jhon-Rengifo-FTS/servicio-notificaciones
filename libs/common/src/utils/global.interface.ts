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
}