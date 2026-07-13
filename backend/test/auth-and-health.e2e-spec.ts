import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Auth refresh flow & health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes a version-neutral health check at /api/health', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('up');
    expect(res.body.redis).toBe('up');
  });

  it('rotates refresh tokens and rejects a reused one', async () => {
    const suffix = `${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    const email = `refresh-user-${suffix}@test.com`;

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123' });
    expect(registerRes.status).toBe(201);
    const firstRefresh: string = registerRes.body.refreshToken;
    expect(firstRefresh).toBeDefined();

    // A valid refresh mints a new pair.
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.token).toBeDefined();
    const secondRefresh: string = refreshRes.body.refreshToken;
    expect(secondRefresh).not.toBe(firstRefresh);

    // The old (rotated-out) refresh token is now rejected.
    const reuseRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh });
    expect(reuseRes.status).toBe(401);

    // Logout invalidates the current refresh token too.
    const accessToken: string = refreshRes.body.token;
    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    const afterLogout = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: secondRefresh });
    expect(afterLogout.status).toBe(401);
  });
});
