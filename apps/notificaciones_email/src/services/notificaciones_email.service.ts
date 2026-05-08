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
    try {
      this.logger.log(
        `Enviando el correo electrónico de ${subject} a ${to}`,
      );
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        attachments,
        context: context ?? {},
      });

      this.logger.log(`Correo electrónico enviado a ${to} exitosamente...`);
      try {
        const cacheKey = await registrarEnvioEnCache(
          this.cacheService,
          {
            to,
            subject,
            template,
            context,
            attachments: this.countAttachments(attachments, to),
            status: 'sent',
            jobId,
            sentAt: new Date().toISOString(),
          },
          EMAIL_SENT_CACHE_KEY,
          getTTLConfig(this.configService, 'EMAIL_CACHE_TTL_MS'),
        );
        this.logger.debug(
          `Correo electrónico registrado en redis exitosamente: ${cacheKey}`,
        );
      } catch (error) {
        this.logger.error(
          'Error al registrar el correo electrónico en redis...',
          error,
        );
      }
    } catch (error) {
      try {
        const errorMessage = this.getErrorMessage(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error('Error al enviar el correo electrónico...', error);
        const cacheKey = await registrarEnvioEnCache(
          this.cacheService,
          {
            to,
            subject,
            template,
            context,
            attachments: this.countAttachments(attachments, to),
            status: 'error',
            error: errorMessage,
            stack: errorStack,
            jobId,
            failedAt: new Date().toISOString(),
          },
          EMAIL_ERROR_CACHE_KEY,
          getTTLConfig(this.configService, 'EMAIL_CACHE_TTL_MS'),
        );
        this.logger.log(`Error del correo electrónico registrado: ${cacheKey}`);
      } catch (error) {
        this.logger.error(
          'Error al registrar el error del correo electrónico...',
          error,
        );
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
}
