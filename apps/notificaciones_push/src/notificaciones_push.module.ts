import { Module } from '@nestjs/common';
import { NotificacionesPushController } from './controllers/notificaciones_push.controller';
import { NotificacionesPushService } from './services/notificaciones_push.service';
import { ConfigModule } from '@nestjs/config';
import { RmqModule } from '@app/common/rmq/rmq.module';
import { AppCacheModule } from '@app/common';
import { NotificacionesPushGateway } from './gateway/notificaciones_push.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    RmqModule,
    AppCacheModule,
  ],
  controllers: [NotificacionesPushController],
  providers: [NotificacionesPushService, NotificacionesPushGateway],
})
export class NotificacionesPushModule {}
