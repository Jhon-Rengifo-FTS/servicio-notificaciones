import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';
import {
  ExponentialRetryPolicy,
  RetryResult,
} from '../utils/global.interface';

@Injectable()
export class RmqService {
  private readonly logger = new Logger(RmqService.name);
  constructor(private readonly configService: ConfigService) {}

  getOptions(queue: string, noAck = false, prefetchCount = 1): RmqOptions {
    const queueKey = `RABBIT_MQ_${queue}_QUEUE`;
    const queueName = this.configService.get<string>(queueKey);
    const rabbitMqUri = this.configService.get<string>('RABBIT_MQ_URI');

    if (!rabbitMqUri) {
      throw new Error('Missing required config: RABBIT_MQ_URI');
    }

    if (!queueName) {
      throw new Error(`Missing required config: ${queueKey}`);
    }

    return {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitMqUri],
        queue: queueName,
        noAck,
        prefetchCount,
        persistent: true,
      },
    };
  }

  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.ack(originalMessage);
  }

  nack(context: RmqContext, requeue: boolean = true) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    const deliveryTag = originalMessage.properties.deliveryTag;
    channel.nack(deliveryTag, false, requeue);
  }

  // traduce los mensajes a español
  retryExponentialOrAck(
    context: RmqContext,
    policy: ExponentialRetryPolicy,
  ): RetryResult {
    const channel = context.getChannelRef();
    const msg = context.getMessage();

    const headers = msg.properties.headers ?? {};
    const retryHeader = policy.retryHeader ?? 'x-retry-count';
    const currentRetry = Number(headers[retryHeader] ?? 0); // 0 = aún sin reintentos

    const nextRetry = currentRetry + 1;

    // Si ya excedió el máximo, ACK y terminar
    if (nextRetry > policy.maxRetries) {
      channel.ack(msg);
      return { action: 'acked_stop', retry: currentRetry };
    }

    // Exponencial real: base * 2^(retry-1)
    let delayMs = policy.baseDelayMs * Math.pow(2, nextRetry - 1);

    if (policy.maxDelayMs != null) {
      delayMs = Math.min(delayMs, policy.maxDelayMs);
    }

    const jitterRatio = Math.max(0, Math.min(policy.jitterRatio ?? 0, 1));
    if (jitterRatio > 0) {
      const minFactor = 1 - jitterRatio;
      const maxFactor = 1 + jitterRatio;
      const factor = minFactor + Math.random() * (maxFactor - minFactor);
      delayMs = Math.max(1, Math.round(delayMs * factor));
    }

    // Re-publicar con delay y contador incrementado
    channel.publish(policy.delayedExchange, policy.routingKey, msg.content, {
      persistent: true,
      headers: {
        ...headers,
        [retryHeader]: nextRetry,
        'x-delay': delayMs,
        'x-last-failure-at': new Date().toISOString(),
        'x-first-failure-at':
          headers['x-first-failure-at'] ?? new Date().toISOString(),
      },
    });

    // ACK al original para evitar bloquear la cola
    channel.ack(msg);

    return { action: 'republished', retry: nextRetry, delayMs };
  }

  logRetryAction(result: RetryResult): void {
    const { action, retry, delayMs } = result;
    const message = `Accion de reintento: ${action} | Intento: ${retry} | Retraso: ${
      delayMs ?? 0
    }ms`;

    if (action === 'acked_stop') {
      // traduce a español
      this.logger.error(`Max intentos alcanzados. ${message}`);
    } else {
      // traduce a español
      this.logger.log(`Re-encolado transaccion. ${message}`);
    }
  }
}
