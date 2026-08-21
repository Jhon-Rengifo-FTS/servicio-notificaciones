import { Module } from '@nestjs/common';
import { NotificacionesTelegramController } from './controllers/notificaciones_telegram.controller';
import { NotificacionesTelegramService } from './services/notificaciones_telegram.service';
import { RmqModule } from '@app/common/rmq/rmq.module';
import { ConfigModule } from '@nestjs/config';
import { AppCacheModule } from '@app/common';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    RmqModule,
    AppCacheModule,
    HttpModule,
  ],
  controllers: [NotificacionesTelegramController],
  providers: [NotificacionesTelegramService],
})
export class NotificacionesTelegramModule {}
