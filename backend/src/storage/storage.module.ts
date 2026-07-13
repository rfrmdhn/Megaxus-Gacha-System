import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { MINIO_BUCKET, MINIO_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: MINIO_CLIENT,
      useFactory: (config: ConfigService) =>
        new Client({
          endPoint: config.get<string>('MINIO_ENDPOINT', 'localhost'),
          port: config.get<number>('MINIO_PORT', 9000),
          useSSL: config.get<string>('MINIO_USE_SSL', 'false') === 'true',
          accessKey: config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
          secretKey: config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
        }),
      inject: [ConfigService],
    },
    {
      provide: MINIO_BUCKET,
      useFactory: (config: ConfigService) =>
        config.get<string>('MINIO_BUCKET', 'item-images'),
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
