import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PULL_COST } from '../src/gacha/gacha.constants';

describe('Gacha pull concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('never double-spends or goes negative under concurrent spam-click pulls', async () => {
    const suffix = `${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    const userEmail = `concurrency-user-${suffix}@test.com`;
    const adminEmail = `concurrency-admin-${suffix}@test.com`;

    // Register a normal user, then set a small known balance directly (bypasses
    // the 500-coin default so we can drain it with a handful of pulls, not fifty).
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: userEmail, password: 'password123' });
    const userToken: string = registerRes.body.token;
    const userId: string = registerRes.body.user.id;

    const STARTING_COINS = 25; // enough for exactly 2 successful pulls at 10 coins each
    await prisma.user.update({ where: { id: userId }, data: { coins: STARTING_COINS } });

    // Register an admin (role flip is a direct DB write — there's no public
    // self-service admin endpoint by design) to configure the event.
    const adminRegisterRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: adminEmail, password: 'password123' });
    await prisma.user.update({
      where: { id: adminRegisterRes.body.user.id },
      data: { role: 'admin' },
    });
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'password123' });
    const adminToken: string = adminLoginRes.body.token;

    const eventRes = await request(app.getHttpServer())
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Concurrency Test Event ${suffix}`,
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-12-31T00:00:00.000Z',
      });
    const eventId: string = eventRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${eventId}/items`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Only Item', rarity: 'common', dropRate: 100 });

    await request(app.getHttpServer())
      .put(`/api/v1/admin/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    // Fire far more concurrent pulls than the balance can cover.
    const CONCURRENT_REQUESTS = 15;
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () =>
        request(app.getHttpServer())
          .post('/api/v1/gacha/pull')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ eventId }),
      ),
    );

    const successes = responses.filter((r) => r.status === 200);
    const failures = responses.filter((r) => r.status === 400);

    const expectedSuccesses = Math.floor(STARTING_COINS / PULL_COST);
    expect(successes.length).toBe(expectedSuccesses);
    expect(failures.length).toBe(CONCURRENT_REQUESTS - expectedSuccesses);

    const finalUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(finalUser.coins).toBe(STARTING_COINS - expectedSuccesses * PULL_COST);
    expect(finalUser.coins).toBeGreaterThanOrEqual(0);

    // No ghost pulls and no double-charges: exactly one log row per successful deduction.
    const logCount = await prisma.gachaLog.count({ where: { userId } });
    expect(logCount).toBe(expectedSuccesses);
  }, 30000);
});
