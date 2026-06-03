import { NestFactory } from '@nestjs/core';
import { NotificacionesPushModule } from './notificaciones_push.module';
import { WLoggerFactory } from '@app/common/wlogger/wlogger.config';
import { RmqService } from '@app/common/rmq/rmq.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(NotificacionesPushModule, {
    logger: WLoggerFactory('notificador-push'),
    bufferLogs: true,
  });

  app.enableCors({ origin: '*' });

  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('NOTIFICADOR_PUSH'));
  await app.startAllMicroservices();

  const configService = app.get(ConfigService);
  await app.listen(Number(configService.get('NOTIFICADOR_PUSH_PORT')));
  console.log('Notificador de push corriendo en el puerto: ' + Number(configService.get('NOTIFICADOR_PUSH_PORT')));
}
bootstrap();
