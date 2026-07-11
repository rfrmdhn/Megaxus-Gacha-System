jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    quit: jest.fn().mockResolvedValue(undefined),
  }));
});
jest.mock('@nestjs/config', () => {
  const mockGet = jest.fn((key: string, defaultVal: any) => defaultVal);
  return {
    ConfigService: jest.fn().mockImplementation(() => ({ get: mockGet })),
  };
});

import { Test } from '@nestjs/testing';
import { RedisModule, REDIS_CLIENT } from './redis.module';

describe('RedisModule', () => {
  it('should be defined', () => {
    expect(RedisModule).toBeDefined();
  });

  it('exports REDIS_CLIENT', async () => {
    const mockClient = { quit: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      imports: [RedisModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockClient)
      .compile();

    const client = module.get(REDIS_CLIENT);
    expect(client).toBeDefined();
    expect(client).toBe(mockClient);
  });

  it('quits the redis client on module destroy', async () => {
    const mockQuit = jest.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      imports: [RedisModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({ quit: mockQuit })
      .compile();

    await module.close();
    expect(mockQuit).toHaveBeenCalled();
  });
});
