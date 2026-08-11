import { Injectable } from '@nestjs/common';
import {
  AppCacheService,
  getTTLConfig,
  registrarEnvioEnCache,
} from '@app/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

const TELEGRAM_SENT_CACHE_KEY = 'telegram';
const TELEGRAM_ERROR_CACHE_KEY = 'telegram:error';

@Injectable()
export class NotificacionesTelegramService {
  private readonly logger = new Logger(NotificacionesTelegramService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: AppCacheService,
    private readonly httpService: HttpService,
  ) {}
  async enviarTelegram(data: any) {
    const chatIds = this.obtenerChatIds(data);

    if (!chatIds.length) {
      const message = 'No hay chat_id configurado para enviar Telegram.';
      this.logger.error(message);
      await this.registrarErrorEnCache(data, 'unknown', message);
      return [];
    }

    const resultados: any[] = [];

    for (const chatId of chatIds) {
      try {
        const envio = await this.enviarNotificacion(data, chatId);
        const notificacionIndividual = {
          ...data,
          to: chatId,
          status: 'sent',
          read: false,
          sentAt: new Date().toISOString(),
        };

        const cacheKey = await registrarEnvioEnCache(
          this.cacheService,
          notificacionIndividual,
          TELEGRAM_SENT_CACHE_KEY,
          getTTLConfig(this.configService, 'TELEGRAM_CACHE_TTL_MS'),
        );
        this.logger.log('Telegram registrado en redis: ' + cacheKey);
        resultados.push(envio);
      } catch (error) {
        const message = this.getTelegramErrorMessage(error);
        this.logger.error(`Error al enviar Telegram a ${chatId}: ${message}`);
        await this.registrarErrorEnCache(data, chatId, message);
      }
    }

    return resultados;
  }

  async enviarNotificacion(data: any, chatId: string) {
    const url = `${this.configService.get<string>('TELEGRAM_API_URL')}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: this.obtenerTexto(data),
    };

    this.logger.log(`Enviando notificacion a Telegram al chat ${chatId}...`);
    const response = await firstValueFrom(
      this.httpService.post(url, body).pipe(
        catchError((error: AxiosError<any>) => {
          const message = this.getTelegramErrorMessage(error);
          this.logger.error('Error Telegram API: ' + message);
          throw new Error(message);
        }),
      ),
    );
    return response.data;
  }

  private obtenerChatIds(data: any): string[] {
    const rawTo = data?.to ?? data?.numerosTelefono;
    const destinatarios = this.normalizarDestinatarios(rawTo)
      .map((chatId) => String(chatId).trim())
      .filter(Boolean);

    return [...new Set(destinatarios)];
  }

  private normalizarDestinatarios(rawTo: any): string[] {
    if (rawTo === undefined || rawTo === null) {
      return [];
    }

    if (Array.isArray(rawTo)) {
      return rawTo.flatMap((value) => this.normalizarDestinatarios(value));
    }

    if (typeof rawTo === 'object') {
      const posiblesLlaves = ['chatId', 'chatIds', 'telefonos', 'to', 'numerosTelefono'];
      return posiblesLlaves.flatMap((key) => this.normalizarDestinatarios(rawTo[key]));
    }

    const value = String(rawTo).trim();
    if (!value) {
      return [];
    }

    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return this.normalizarDestinatarios(JSON.parse(value));
      } catch {
        return [value];
      }
    }

    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  private obtenerTexto(data: any): string {
    return String(data?.context?.body ?? data?.message ?? data?.body ?? '');
  }

  private async registrarErrorEnCache(data: any, chatId: string, message: string) {
    await registrarEnvioEnCache(
      this.cacheService,
      {
        ...data,
        to: chatId,
        message,
        context: {
          ...(data?.context ?? {}),
          body: message,
        },
        error: message,
        status: 'error',
        sentAt: new Date().toISOString(),
      },
      TELEGRAM_ERROR_CACHE_KEY,
      getTTLConfig(this.configService, 'TELEGRAM_CACHE_TTL_MS'),
    );
  }

  private getTelegramErrorMessage(error: unknown): string {
    const axiosError = error as AxiosError<any>;
    const telegramError = axiosError.response?.data;

    if (typeof telegramError === 'string') {
      return telegramError;
    }

    if (telegramError?.description) {
      return String(telegramError.description);
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
