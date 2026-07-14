import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Client } from 'minio';
import { Readable } from 'stream';
import { MINIO_BUCKET, MINIO_CLIENT } from './storage.constants';

export interface StoredObject {
  stream: Readable;
  mimeType: string;
}

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function extensionFor(key: string): string {
  return key.slice(key.lastIndexOf('.') + 1);
}

/**
 * Thin wrapper around the MinIO client for item images. Bucket creation is
 * idempotent (checked on every boot) so this works the same whether MinIO is
 * freshly created or already has the bucket from a prior run.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(MINIO_CLIENT) private client: Client,
    @Inject(MINIO_BUCKET) private bucket: string,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) await this.client.makeBucket(this.bucket);
    } catch (error) {
      this.logger.warn(
        `MinIO unavailable at boot, image upload/serve endpoints will fail until it is reachable: ${(error as Error).message}`,
      );
    }
  }

  async upload(key: string, buffer: Buffer, mimetype: string): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimetype,
    });
  }

  async getObject(key: string): Promise<StoredObject> {
    const stream = await this.client.getObject(this.bucket, key);
    return {
      stream,
      mimeType: MIME_TYPES[extensionFor(key)] ?? 'application/octet-stream',
    };
  }

  async remove(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
