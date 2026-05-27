import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  AppCacheService,
  EmailInterface,
  getTTLConfig,
  registrarEnvioEnCache,
} from '@app/common';
import { ConfigService } from '@nestjs/config';

const EMAIL_SENT_CACHE_KEY = 'email';
const EMAIL_ERROR_CACHE_KEY = 'email:error';

@Injectable()
export class NotificacionesEmailService {
  private readonly logger = new Logger(NotificacionesEmailService.name);
  constructor(
    private readonly mailerService: MailerService,
    private readonly cacheService: AppCacheService,
    private readonly configService: ConfigService,
  ) {}

  async enviarEmail(data: EmailInterface, jobId?: string): Promise<void> {
    const { to, subject, template, context, attachments } = data;
    if (!to || !subject || !template) {
      this.logger.warn('Datos incompletos para email.');
      return;
    }
    const destinatarios = this.obtenerDestinatarios(to);

    for (const correo of destinatarios) {
      try {
        this.logger.log(
          `Enviando el correo electrónico de ${subject} a ${correo}`,
        );

        await this.mailerService.sendMail({
          to: correo,
          subject,
          template,
          attachments,
          context: context ?? {},
        });

        const cacheKey = await registrarEnvioEnCache(
          this.cacheService,
          {
            to: correo,
            subject,
            template,
            context,
            attachments: this.countAttachments(attachments, correo),
            status: 'sent',
            jobId,
            sentAt: new Date().toISOString(),
          },
          EMAIL_SENT_CACHE_KEY,
          getTTLConfig(this.configService, 'EMAIL_CACHE_TTL_MS'),
        );

        this.logger.debug(`Correo registrado en redis: ${cacheKey}`);
      } catch (error) {
        const errorMessage = this.getErrorMessage(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        this.logger.error(`Error al enviar correo a ${correo}`, error);

        const cacheKey = await registrarEnvioEnCache(
          this.cacheService,
          {
            to: correo,
            subject,
            template,
            context,
            attachments: this.countAttachments(attachments, correo),
            status: 'error',
            error: errorMessage,
            stack: errorStack,
            jobId,
            failedAt: new Date().toISOString(),
          },
          EMAIL_ERROR_CACHE_KEY,
          getTTLConfig(this.configService, 'EMAIL_CACHE_TTL_MS'),
        );

        this.logger.log(`Error del correo registrado: ${cacheKey}`);
      }
    }
  }

  private countAttachments(attachments?: any[], to?: string) {
    if (attachments?.length) {
      this.logger.log(
        `Se adjuntaron ${attachments?.length} archivos al correo electrónico ${to}...`,
      );
      return attachments?.length;
    }
    return;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error) ?? String(error);
    } catch {
      return String(error);
    }
  }

  private obtenerDestinatarios(to: string): string[] {
    try {
      const parsed = JSON.parse(to);

      if (Array.isArray(parsed?.correos)) {
        return parsed.correos.filter(Boolean);
      }

      return [to];
    } catch {
      return [to];
    }
  }
}
