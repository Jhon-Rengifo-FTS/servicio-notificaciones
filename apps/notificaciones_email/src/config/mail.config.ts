import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

function resolveTemplatesDir() {
  const sourceTemplatesDir = path.join(
    process.cwd(),
    'apps/notificaciones_email/src/templates'
  );
  const distTemplatesDir = path.join(
    process.cwd(),
    'dist/apps/notificaciones_email/src/templates',
  );

  if (fs.existsSync(sourceTemplatesDir)) {
    return sourceTemplatesDir;
  }

  return distTemplatesDir;
}

export const mailerAsyncOptions = {
  useFactory: async (config: ConfigService) => {
    return {
      transport: {
        host: config.get('MAIL_HOST'),
        port: config.get('MAIL_PORT'),
        secure: config.get('MAIL_SECURE') === 'true',
        auth: {
          user: config.get('MAIL_USER'),
          pass: config.get('MAIL_PASSWORD'),
        },
      },
      defaults: {
        from: `"Comunicaciones Tolis" <${config.get('MAIL_FROM')}>`,
      },
      template: {
        dir: resolveTemplatesDir(),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    };
  },
  inject: [ConfigService],
};
