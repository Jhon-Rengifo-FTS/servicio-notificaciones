import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { NotificacionesPushService } from '../services/notificaciones_push.service';
import { EVENT_PATTERN_NOTIFICADOR_PUSH, PushInterface, RmqService } from '@app/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class NotificacionesPushController {
  constructor(
    private readonly notificacionesPushService: NotificacionesPushService,
    private readonly rmqService: RmqService,
  ) {}

  @EventPattern(EVENT_PATTERN_NOTIFICADOR_PUSH)
  async consumirPush(
    @Payload() job: { id: string; data: PushInterface },
    @Ctx() context: RmqContext,
  ) {
    await this.notificacionesPushService.enviarPush(job.data, job.id);
    this.rmqService.ack(context);
  }

  @Get('obtener-notificaciones/:usuarioId')
  obtenerNotificaciones(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesPushService.obtenerNotificaciones(usuarioId);
  }

  @Patch('notificaciones/:usuarioId/leida')
  marcarComoLeida(
    @Param('usuarioId') usuarioId: string,
    @Body('cacheKey') cacheKey: string,
  ) {
    return this.notificacionesPushService.marcarComoLeida(usuarioId, cacheKey);
  }

  @Delete('notificaciones/:usuarioId')
  limpiarNotificaciones(@Param('usuarioId') usuarioId: string) {
    return this.notificacionesPushService.limpiarNotificaciones(usuarioId);
  }
}
