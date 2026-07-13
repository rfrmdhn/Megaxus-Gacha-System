import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let prisma: any;
  let jwt: any;
  let systemConfig: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    systemConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        const defaults: Record<string, unknown> = {
          BCRYPT_ROUNDS: 10,
          REFRESH_TOKEN_BYTES: 32,
          DEFAULT_REFRESH_EXPIRES_SECONDS: 604_800,
        };
        return defaults[key] ?? 10;
      }),
    };
    service = new AuthService(prisma, jwt, systemConfig);
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'test@test.com',
      });

      await expect(
        service.register({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a user and returns user + token pair on success', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        coins: 500,
        role: 'user',
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'new@test.com', passwordHash: expect.any(String) },
      });
      expect(result.user).toEqual({
        id: 'new-user',
        email: 'new@test.com',
        coins: 500,
      });
      expect(result.token).toBe('jwt-token');
      expect(result.refreshToken.startsWith('new-user.')).toBe(true);
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'new-user',
        email: 'new@test.com',
        role: 'user',
      });
      // Refresh secret persisted as a hash, never in the clear.
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'new-user' },
        data: {
          refreshTokenHash: expect.any(String),
          refreshTokenExpiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'bad@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: '$2b$10$invalidhash',
        isBanned: false,
        role: 'user',
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is banned', async () => {
      const hash = bcrypt.hashSync('password123', 2);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: hash,
        isBanned: true,
        role: 'user',
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns a token pair on successful login', async () => {
      const hash = bcrypt.hashSync('password123', 2);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: hash,
        isBanned: false,
        role: 'user',
      });

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.refreshToken.startsWith('u1.')).toBe(true);
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'test@test.com',
        role: 'user',
      });
    });

    it('falls back to the default refresh lifetime when unset', async () => {
      systemConfig.get.mockImplementation((key: string) => {
        if (key === 'DEFAULT_REFRESH_EXPIRES_SECONDS') return 604_800;
        return 10;
      });
      const hash = bcrypt.hashSync('password123', 2);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: hash,
        isBanned: false,
        role: 'user',
      });

      await service.login({ email: 'test@test.com', password: 'password123' });

      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const futureExpiry = () => new Date(Date.now() + 60_000);

    it('rejects a token without the id.secret separator', async () => {
      await expect(
        service.refresh({ refreshToken: 'no-separator' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.refresh({ refreshToken: 'u1.secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the user is banned', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isBanned: true,
        refreshTokenHash: 'x',
        refreshTokenExpiresAt: futureExpiry(),
      });
      await expect(
        service.refresh({ refreshToken: 'u1.secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when no refresh token is stored', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isBanned: false,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      });
      await expect(
        service.refresh({ refreshToken: 'u1.secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isBanned: false,
        refreshTokenHash: bcrypt.hashSync('secret', 2),
        refreshTokenExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.refresh({ refreshToken: 'u1.secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a secret that does not match the stored hash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isBanned: false,
        refreshTokenHash: bcrypt.hashSync('the-real-secret', 2),
        refreshTokenExpiresAt: futureExpiry(),
      });
      await expect(
        service.refresh({ refreshToken: 'u1.wrong-secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rotates and returns a fresh token pair on a valid refresh', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        role: 'user',
        isBanned: false,
        refreshTokenHash: bcrypt.hashSync('secret', 2),
        refreshTokenExpiresAt: futureExpiry(),
      });

      const result = await service.refresh({ refreshToken: 'u1.secret' });

      expect(result.token).toBe('jwt-token');
      expect(result.refreshToken.startsWith('u1.')).toBe(true);
      expect(result.refreshToken).not.toBe('u1.secret');
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      const result = await service.logout('u1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
