import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqService } from '@app/common/rmq/rmq.service';
import { RmqModuleOptions } from '../utils/global.interface';

@Module({
  providers: [RmqService],
  exports: [RmqService],
})
export class RmqModule {
  static register({
    name,
    prefetchCount = 1,
  }: RmqModuleOptions): DynamicModule {
    return {
      module: RmqModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name,
            useFactory: (configService: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [configService.get<string>('RABBIT_MQ_URI')!],
                queue: configService.get<string>(`RABBIT_MQ_${name}_QUEUE`)!,
                prefetchCount,
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
