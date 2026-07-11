jest.mock('../../generated/prisma', () => {
  return {
    PrismaClient: class MockPrismaClient {
      $connect = jest.fn().mockResolvedValue(undefined);
      $disconnect = jest.fn().mockResolvedValue(undefined);
    },
  };
});

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it('calls $connect on module init', async () => {
    await service.onModuleInit();
    expect((service as any).$connect).toHaveBeenCalled();
  });

  it('calls $disconnect on module destroy', async () => {
    await service.onModuleDestroy();
    expect((service as any).$disconnect).toHaveBeenCalled();
  });
});
