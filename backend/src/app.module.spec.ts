jest.mock('./prisma/prisma.module', () => ({ PrismaModule: class {} }));
jest.mock('./redis/redis.module', () => ({ RedisModule: class {} }));
jest.mock('./auth/auth.module', () => ({ AuthModule: class {} }));
jest.mock('./users/users.module', () => ({ UsersModule: class {} }));
jest.mock('./events/events.module', () => ({ EventsModule: class {} }));
jest.mock('./gacha/gacha.module', () => ({ GachaModule: class {} }));
jest.mock('./admin/admin.module', () => ({ AdminModule: class {} }));
jest.mock('@nestjs/throttler', () => ({
  ThrottlerModule: { forRoot: jest.fn().mockReturnValue(class {}) },
  ThrottlerGuard: class {},
}));
jest.mock('@nestjs/config', () => ({
  ConfigModule: { forRoot: jest.fn().mockReturnValue(class {}) },
}));
jest.mock('@nestjs/core', () => ({
  ...jest.requireActual('@nestjs/core'),
  APP_GUARD: 'APP_GUARD',
}));

import { AppModule } from './app.module';

describe('AppModule', () => {
  it('should be defined', () => {
    expect(AppModule).toBeDefined();
  });
});
