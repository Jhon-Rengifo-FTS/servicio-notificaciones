import { NestFactory } from '@nestjs/core';
import { NotificacionesPushModule } from './notificaciones_push.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificacionesPushModule);
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
