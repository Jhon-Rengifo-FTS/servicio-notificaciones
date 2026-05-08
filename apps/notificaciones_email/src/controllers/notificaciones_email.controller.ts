import { Controller, Get } from '@nestjs/common';
import { NotificacionesEmailService } from '../services/notificaciones_email.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  EVENT_PATTERN_NOTIFICADOR_EMAIL,
  RmqService,
  EmailInterface,
} from '@app/common';

@Controller()
export class NotificacionesEmailController {
  constructor(
    private readonly notificacionesEmailService: NotificacionesEmailService,
    private readonly rmqService: RmqService,
  ) {}

  @EventPattern(EVENT_PATTERN_NOTIFICADOR_EMAIL)
  async consumirEmail(
    @Payload() job: { id: string; data: EmailInterface },
    @Ctx() context: RmqContext,
  ) {
    await this.notificacionesEmailService.enviarEmail(job.data, job.id);
    this.rmqService.ack(context);
  }
}
