import { HealthService } from './health.service';

describe('HealthService', () => {
  let prisma: any;
  let redis: any;
  let service: HealthService;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redis = { ping: jest.fn().mockResolvedValue('PONG') };
    service = new HealthService(prisma, redis);
  });

  it('reports ok when both db and redis respond', async () => {
    expect(await service.check()).toEqual({
      status: 'ok',
      db: 'up',
      redis: 'up',
    });
  });

  it('reports error with db down when the db probe throws', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('no db'));

    expect(await service.check()).toEqual({
      status: 'error',
      db: 'down',
      redis: 'up',
    });
  });

  it('reports error with redis down when the redis probe throws', async () => {
    redis.ping.mockRejectedValue(new Error('no redis'));

    expect(await service.check()).toEqual({
      status: 'error',
      db: 'up',
      redis: 'down',
    });
  });
});
