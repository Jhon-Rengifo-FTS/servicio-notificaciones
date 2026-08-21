import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PushSocketPayload } from '@app/common';

@WebSocketGateway({
  namespace: 'notificaciones-push',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class NotificacionesPushGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificacionesPushGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  async handleConnection(client: Socket): Promise<void> {
    const rooms = this.getHandshakeRooms(client);

    if (!rooms.length) {
      this.logger.log('Cliente conectado sin sala: ' + client.id);
      client.emit('connected', { clientId: client.id });
      return;
    }

    await client.join(rooms);
    this.logger.log('Cliente conectado: ' + client.id + ' en salas ' + rooms.join(', '));
    client.emit('connected', { clientId: client.id, rooms });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log('Cliente desconectado: ' + client.id);
  }

  enviarNotificacion(payload: PushSocketPayload, room?: string): void {
    if (!room) {
      this.server.emit('notificacion_push', payload);
      this.logger.log('Notificacion push emitida a todos los clientes');
      return;
    }

    this.server.to(room).emit('notificacion_push', payload);
    this.logger.log('Notificacion push emitida en sala ' + room);
  }

  enviarHistorial(room: string, notificaciones: PushSocketPayload[]): void {
    this.server.to(room).emit('notificaciones_push_historial', notificaciones);
  }

  enviarNotificacionesLimpiadas(room: string): void {
    this.server.to(room).emit('notificaciones_push_limpiadas');
  }

  private getPerfilRoom(perfilId: unknown): string | undefined {
    if (perfilId === undefined || perfilId === null || perfilId === '') {
      return undefined;
    }

    const perfil = perfilId.toString();
    return perfil.startsWith('perfil:') ? perfil : 'perfil:' + perfil;
  }

  private getHandshakeRooms(client: Socket): string[] {
    return [
      client.handshake.auth?.room ?? client.handshake.query?.room,
      this.getPerfilRoom(
        client.handshake.auth?.perfilId ?? client.handshake.query?.perfilId,
      ),
      client.handshake.auth?.usuarioId ?? client.handshake.query?.usuarioId,
      client.handshake.auth?.cuentaId ?? client.handshake.query?.cuentaId,
    ]
      .flatMap((room) => (Array.isArray(room) ? room : [room]))
      .filter((room): room is string | number => room !== undefined && room !== null && room !== '')
      .map((room) => room.toString())
      .filter((room, index, rooms) => rooms.indexOf(room) === index);
  }
}
