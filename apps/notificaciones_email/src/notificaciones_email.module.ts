import { Module } from '@nestjs/common';
import { NotificacionesEmailController } from './controllers/notificaciones_email.controller';
import { NotificacionesEmailService } from './services/notificaciones_email.service';
import { ConfigModule } from '@nestjs/config';
import { RmqModule } from '@app/common/rmq/rmq.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { mailerAsyncOptions } from './config/mail.config';
import { AppCacheModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    RmqModule,
    AppCacheModule,
    MailerModule.forRootAsync(mailerAsyncOptions),
  ],

  controllers: [NotificacionesEmailController],
  providers: [NotificacionesEmailService],
})
export class NotificacionesEmailModule {}
