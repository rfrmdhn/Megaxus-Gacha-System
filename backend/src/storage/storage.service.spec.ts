import { StorageService } from './storage.service';

describe('StorageService', () => {
  let client: any;
  let service: StorageService;

  beforeEach(() => {
    client = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn().mockResolvedValue(undefined),
      getObject: jest.fn(),
      removeObject: jest.fn().mockResolvedValue(undefined),
    };
    service = new StorageService(client, 'item-images');
  });

  describe('onModuleInit', () => {
    it('creates the bucket when it does not exist', async () => {
      client.bucketExists.mockResolvedValue(false);

      await service.onModuleInit();

      expect(client.makeBucket).toHaveBeenCalledWith('item-images');
    });

    it('does not create the bucket when it already exists', async () => {
      client.bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(client.makeBucket).not.toHaveBeenCalled();
    });

    it('does not throw when MinIO is unreachable', async () => {
      client.bucketExists.mockRejectedValue(new Error('connect ECONNREFUSED'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('upload', () => {
    it('puts the object with the given content type', async () => {
      const buffer = Buffer.from('image-bytes');

      await service.upload('items/item-1.png', buffer, 'image/png');

      expect(client.putObject).toHaveBeenCalledWith(
        'item-images',
        'items/item-1.png',
        buffer,
        buffer.length,
        { 'Content-Type': 'image/png' },
      );
    });
  });

  describe('getObject', () => {
    it('returns the stream with a mime type resolved from the key extension', async () => {
      const stream = {} as any;
      client.getObject.mockResolvedValue(stream);

      const result = await service.getObject('items/item-1.webp');

      expect(client.getObject).toHaveBeenCalledWith(
        'item-images',
        'items/item-1.webp',
      );
      expect(result).toEqual({ stream, mimeType: 'image/webp' });
    });

    it('falls back to a generic mime type for an unknown extension', async () => {
      client.getObject.mockResolvedValue({} as any);

      const result = await service.getObject('items/item-1.bin');

      expect(result.mimeType).toBe('application/octet-stream');
    });
  });

  describe('remove', () => {
    it('removes the object', async () => {
      await service.remove('items/item-1.png');

      expect(client.removeObject).toHaveBeenCalledWith(
        'item-images',
        'items/item-1.png',
      );
    });
  });
});
