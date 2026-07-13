jest.mock('@nestjs/jwt', () => ({
  JwtModule: { registerAsync: jest.fn().mockReturnValue(class {}) },
}));
jest.mock('@nestjs/passport', () => ({
  PassportModule: class {},
  PassportStrategy: jest.fn().mockReturnValue(class {}),
  AuthGuard: jest.fn().mockReturnValue(class {}),
}));
jest.mock('@nestjs/config', () => ({
  ConfigModule: class {},
  ConfigService: class {},
}));
jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));

import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('should be defined', () => {
    expect(AuthModule).toBeDefined();
  });
});
