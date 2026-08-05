import {
  AppCacheService,
  getTTLConfig,
  registrarEnvioEnCache,
} from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NotificacionesPushGateway } from '../gateway/notificaciones_push.gateway';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

const PUSH_SENT_CACHE_KEY = 'push';
const PUSH_ERROR_CACHE_KEY = 'push:error';
const PUSH_SENT_CACHE_PREFIX = 'notificaciones:push';

@Injectable()
export class NotificacionesPushService {
  private readonly logger = new Logger(NotificacionesPushService.name);

  constructor(
    private readonly cacheService: AppCacheService,
    private readonly configService: ConfigService,
    private readonly notificacionesPushGateway: NotificacionesPushGateway,
  ) {}

  async enviarPush(data: any, id: string): Promise<void> {
    const esGlobal =
      data.data?.global === true ||
      data.data?.global === 'true' ||
      data.data?.global === '1' ||
      data.data?.global === 1;

    const perfiles = this.getProfileRooms(data);
    const esNotificacionPorPerfil = !esGlobal && perfiles.length > 0;
    const destinoNotificacion = data.data?.destinoNotificacion?.toString();
    const notificacion = {
      token: data.token,
      title: data.title,
      body: data.body,
      data: {
        ...data.data,
        cuentaId: data.data?.cuentaId,
        usuarioId: data.data?.usuarioId,
        saldo: data.data?.saldo,
        valorAlarmaSaldoBajo: data.data?.valorAlarmaSaldoBajo,
      },
      status: 'sent',
      read: false,
      jobId: id,
      sentAt: new Date().toISOString(),
    };

    try {
      if (esNotificacionPorPerfil) {
        const cacheKeys = await Promise.all(
          perfiles.map((room) =>
            this.registrarEnvioRoomEnCache(room, notificacion),
          ),
        );

        cacheKeys.forEach((cacheKey, index) => {
          this.logger.log('Push registrado en redis: ' + cacheKey);
          this.notificacionesPushGateway.enviarNotificacion(
            { ...notificacion, cacheKey },
            perfiles[index],
          );
        });
        return;
      }

      const cacheKey =
        esGlobal && destinoNotificacion
          ? await this.registrarEnvioGlobalEnCache(
              notificacion,
              destinoNotificacion,
            )
          : await registrarEnvioEnCache(
              this.cacheService,
              notificacion,
              PUSH_SENT_CACHE_KEY,
              getTTLConfig(this.configService, 'PUSH_CACHE_TTL_MS'),
            );

      this.logger.log('Push registrado en redis: ' + cacheKey);
      this.notificacionesPushGateway.enviarNotificacion(
        { ...notificacion, cacheKey },
        esGlobal ? undefined : this.getUserRoom(data),
      );
    } catch (error) {
      this.logger.error('Error al enviar push:', error);
      const cacheKey = await registrarEnvioEnCache(
        this.cacheService,
        {
          ...notificacion,
          status: 'error',
          sentAt: new Date().toISOString(),
        },
        PUSH_ERROR_CACHE_KEY,
        getTTLConfig(this.configService, 'PUSH_CACHE_TTL_MS'),
      );
      this.logger.log('Push error registrado en redis: ' + cacheKey);
    }
  }

  async obtenerNotificaciones(
    usuarioId: string,
    destinoNotificacion?: string,
  ): Promise<any[]> {
    const registrosUsuario = await this.cacheService.getByPrefix<any>(
      this.getUserPrefix(usuarioId),
    );

    const registrosGlobales = destinoNotificacion
      ? await this.cacheService.getByPrefix<any>(
          this.getGlobalPrefix(destinoNotificacion),
        )
      : [];

    return [...registrosUsuario, ...registrosGlobales]
      .map(({ key, value }) => ({
        ...value,
        cacheKey: key,
        read: value?.read ?? false,
      }))
      .sort((a, b) => this.getTimestamp(b) - this.getTimestamp(a));
  }

  async marcarComoLeida(usuarioId: string, cacheKey: string): Promise<any> {
    if (!cacheKey) {
      throw new BadRequestException('Debe enviar cacheKey');
    }

    if (!cacheKey.startsWith(this.getUserPrefix(usuarioId))) {
      throw new NotFoundException('Notificacion no encontrada para el usuario');
    }

    const notificacion = await this.cacheService.get<any>(cacheKey);

    if (!notificacion) {
      throw new NotFoundException('Notificacion no encontrada');
    }

    const notificacionLeida = { ...notificacion, read: true };
    await this.cacheService.set(cacheKey, notificacionLeida, getTTLConfig(this.configService, 'PUSH_CACHE_TTL_MS'));

    this.notificacionesPushGateway.enviarHistorial(usuarioId, await this.obtenerNotificaciones(usuarioId));

    return { ...notificacionLeida, cacheKey };
  }

  async limpiarNotificaciones(usuarioId: string): Promise<{ deleted: number }> {
    const deleted = await this.cacheService.delByPrefix(this.getUserPrefix(usuarioId));
    this.notificacionesPushGateway.enviarNotificacionesLimpiadas(usuarioId);
    return { deleted };
  }

  private getUserPrefix(usuarioId: string): string {
    return PUSH_SENT_CACHE_PREFIX + ':' + usuarioId + ':';
  }

  private getTimestamp(payload: any): number {
    const fromDate = payload.sentAt ? new Date(payload.sentAt).getTime() : 0;

    if (Number.isFinite(fromDate) && fromDate > 0) {
      return fromDate;
    }

    const fromKey = Number(payload.cacheKey?.split(':').at(-1));
    return Number.isFinite(fromKey) ? fromKey : 0;
  }

  private getProfileRooms(data: any): string[] {
    const perfiles = Array.isArray(data.data?.perfiles)
      ? data.data.perfiles
      : [];

    return perfiles
      .map((perfil) => perfil?.toString().trim())
      .filter((perfil): perfil is string => Boolean(perfil))
      .map((perfil) =>
        perfil.startsWith('perfil:') ? perfil : 'perfil:' + perfil,
      )
      .filter((room, index, rooms) => rooms.indexOf(room) === index);
  }

  private async registrarEnvioRoomEnCache(
    room: string,
    notificacion: any,
  ): Promise<string> {
    const cacheKey = this.getUserPrefix(room) + Date.now();

    await this.cacheService.set(
      cacheKey,
      notificacion,
      getTTLConfig(this.configService, 'PUSH_CACHE_TTL_MS'),
    );

    return cacheKey;
  }

  private getUserRoom(data: any): string | undefined {
    const room = data.data?.usuarioId ?? data.data?.cuentaId;
    return room?.toString();
  }

  private getGlobalPrefix(destinoNotificacion: string): string {
    return `${PUSH_SENT_CACHE_PREFIX}:global:${destinoNotificacion}:`;
  }

  private async registrarEnvioGlobalEnCache(
    notificacion: any,
    destinoNotificacion: string,
  ): Promise<string> {
    const cacheKey = `${this.getGlobalPrefix(destinoNotificacion)}${Date.now()}`;

    await this.cacheService.set(
      cacheKey,
      notificacion,
      getTTLConfig(this.configService, 'PUSH_CACHE_TTL_MS'),
    );

    return cacheKey;
  }
}
