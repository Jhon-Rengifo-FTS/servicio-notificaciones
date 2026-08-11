import { NestFactory } from '@nestjs/core';
import { NotificacionesTelegramModule } from './notificaciones_telegram.module';
import { WLoggerFactory } from '@app/common/wlogger/wlogger.config';
import { RmqService } from '@app/common/rmq/rmq.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(NotificacionesTelegramModule, {
	logger: WLoggerFactory('notificador-telegram'),
	bufferLogs: true,
  });

  app.enableCors({ origin: '*' });

  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('NOTIFICADOR_TELEGRAM'));
  await app.startAllMicroservices();

  const configService = app.get(ConfigService);
  await app.listen(Number(configService.get('NOTIFICADOR_TELEGRAM_PORT')));
  console.log('Notificador de telegram corriendo en el puerto: ' + Number(configService.get('NOTIFICADOR_TELEGRAM_PORT')));
}
bootstrap();