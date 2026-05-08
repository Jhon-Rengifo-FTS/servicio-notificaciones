import { transports, format } from 'winston';
import 'winston-daily-rotate-file';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import { Format } from 'logform';

export const WLoggerFactory = (appName: string) => {
  const timezoned = () => {
    return new Date().toLocaleString('en-US', {
      timeZone: 'America/Bogota',
    });
  };
  let consoleFormat: Format;
  const dailyErrorConfig = {
    filename: './logs/errors/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: format.combine(
      format.timestamp({ format: timezoned }),
      format.json(),
    ),
  };
  const dailyInfoConfig = {
    filename: './logs/info/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: format.combine(
      format.timestamp({ format: timezoned }),
      format.json(),
    ),
  };

  const DEBUG = process.env.WINSTON_DEBUG;
  const USE_JSON_LOGGER = process.env.WINSTON_USE_JSON_LOGGER;

  if (USE_JSON_LOGGER === 'true') {
    consoleFormat = format.combine(
      format.ms(),
      format.timestamp(),
      format.json(),
    );
  } else {
    consoleFormat = format.combine(
      format.timestamp(),
      format.ms(),
      nestWinstonModuleUtilities.format.nestLike(appName, {
        colors: true,
        prettyPrint: true,
      }),
    );
  }

  return WinstonModule.createLogger({
    level: DEBUG ? 'debug' : 'info',
    transports: [
      new transports.Console({ format: consoleFormat }),
      new transports.DailyRotateFile(dailyErrorConfig),
      new transports.DailyRotateFile(dailyInfoConfig),
    ],
  });
};
