import { Controller } from '@nestjs/common';
import { NotificacionesTelegramService } from '../services/notificaciones_telegram.service';
import { EVENT_PATTERN_NOTIFICADOR_TELEGRAM, TelegramInterface } from '@app/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '@app/common';

@Controller()
export class NotificacionesTelegramController {
  constructor(
    private readonly notificacionesTelegramService: NotificacionesTelegramService,
    private readonly rmqService: RmqService,
  ) {}

  @EventPattern(EVENT_PATTERN_NOTIFICADOR_TELEGRAM)
  async consumirTelegram(
    @Payload() job: { id: string; data: TelegramInterface },
    @Ctx() context: RmqContext,
  ) {
    await this.notificacionesTelegramService.enviarTelegram(job.data);
    this.rmqService.ack(context);
  }
}
