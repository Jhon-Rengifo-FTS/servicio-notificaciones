import { NestFactory } from '@nestjs/core';
import { NotificacionesEmailModule } from './notificaciones_email.module';
import { WLoggerFactory } from '@app/common/wlogger/wlogger.config';
import { ConfigService } from '@nestjs/config';
import { RmqService } from '@app/common/rmq/rmq.service';

async function bootstrap() {
  const app = await NestFactory.create(NotificacionesEmailModule, {
    logger: WLoggerFactory('notificador-email'),
    bufferLogs: true,
  });

  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('NOTIFICADOR_EMAIL'));
  await app.startAllMicroservices();

  const configService = app.get(ConfigService);
  await app.listen(Number(configService.get('NOTIFICADOR_EMAIL_PORT')));
  console.log('Notificador de correo corriendo en el puerto: ' + Number(configService.get('NOTIFICADOR_EMAIL_PORT')));
}
bootstrap();
